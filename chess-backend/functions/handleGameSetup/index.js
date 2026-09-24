const {
  createGame,
  joinGame,
  getGame,
  reattachConnection,
  attachConnectionToGame,
} = require('shared/dynamo');
const { initialBoardState } = require('shared/chessLogic');
const { generateGameCode, generatePlayerToken } = require('shared/codeGenerator');
const { sendToConnection, endpointFromEvent } = require('shared/wsResponse');
const { DIFFICULTY_TO_LEVEL } = require('shared/cpuEngine');

const TTL_SECONDS = 60 * 60; // 1 hour for an unjoined game
const MAX_CODE_ATTEMPTS = 5;

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const endpoint = endpointFromEvent(event);
  const body = JSON.parse(event.body || '{}');

  try {
    switch (body.action) {
      case 'create':
        return await handleCreate(connectionId, endpoint);
      case 'create_vs_cpu':
        return await handleCreateVsCpu(connectionId, endpoint, body);
      case 'join':
        return await handleJoin(connectionId, endpoint, body);
      case 'reconnect':
        return await handleReconnect(connectionId, endpoint, body);
      case 'ping':
        // Keepalive: API Gateway WebSocket connections auto-close after 10
        // minutes idle by default. The client pings periodically so a game
        // sitting on the lobby or mid-thought doesn't silently disconnect.
        await sendToConnection(endpoint, connectionId, { type: 'pong' });
        return { statusCode: 200 };
      default:
        await sendToConnection(endpoint, connectionId, {
          type: 'error',
          error: 'unknown_action',
        });
        return { statusCode: 400 };
    }
  } catch (err) {
    console.error('handleGameSetup failed', err);
    await sendToConnection(endpoint, connectionId, { type: 'error', error: 'server_error' });
    return { statusCode: 500 };
  }
};

// Shared collision-retry loop: generates a code, tries a conditional create,
// and regenerates on collision. Used by both handleCreate and
// handleCreateVsCpu so the retry logic isn't duplicated.
async function createGameWithRetry(buildItem) {
  let gameId;
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    gameId = generateGameCode();
    try {
      await createGame(gameId, buildItem());
      return gameId;
    } catch (err) {
      if (err.name === 'ConditionalCheckFailedException' && attempt < MAX_CODE_ATTEMPTS - 1) {
        continue; // code collision, try another
      }
      throw err;
    }
  }
  return gameId;
}

async function handleCreate(connectionId, endpoint) {
  const token = generatePlayerToken();

  // Conditional-write collision loop: extremely unlikely with a 3-part code,
  // but this is what makes the write actually safe instead of just probably-safe.
  const gameId = await createGameWithRetry(() => ({
    status: 'waiting',
    board_state: initialBoardState(),
    turn: 'white',
    white_connection_id: connectionId,
    white_player_token: token,
    black_connection_id: null,
    black_player_token: null,
    is_cpu_game: false,
    move_history: [],
    expires_at: Math.floor(Date.now() / 1000) + TTL_SECONDS,
  }));

  await attachConnectionToGame(connectionId, gameId, 'white');

  await sendToConnection(endpoint, connectionId, {
    type: 'created',
    game_id: gameId,
    player_token: token,
    color: 'white',
  });

  return { statusCode: 200 };
}

// A vs-CPU game skips the whole invite/waiting flow entirely — there's no
// second human to wait for, so status goes straight to in_progress and
// there's no expires_at TTL (nothing is ever "abandoned unjoined" here).
async function handleCreateVsCpu(connectionId, endpoint, body) {
  const difficulty = DIFFICULTY_TO_LEVEL[body.difficulty] !== undefined ? body.difficulty : 'medium';
  const token = generatePlayerToken();
  const boardState = initialBoardState();

  const gameId = await createGameWithRetry(() => ({
    status: 'in_progress',
    board_state: boardState,
    turn: 'white',
    white_connection_id: connectionId,
    white_player_token: token,
    black_connection_id: null,
    black_player_token: null,
    is_cpu_game: true,
    cpu_difficulty: difficulty,
    move_history: [],
  }));

  await attachConnectionToGame(connectionId, gameId, 'white');

  await sendToConnection(endpoint, connectionId, {
    type: 'cpu_game_started',
    game_id: gameId,
    player_token: token,
    color: 'white',
    board_state: boardState,
    turn: 'white',
    difficulty,
  });

  return { statusCode: 200 };
}

async function handleJoin(connectionId, endpoint, body) {
  const { game_id: gameId } = body;
  const game = await getGame(gameId);

  if (!game) {
    await sendToConnection(endpoint, connectionId, { type: 'error', error: 'not_found' });
    return { statusCode: 200 };
  }

  // Check expiry ourselves — DynamoDB's TTL sweep is best-effort and can lag
  // behind the actual expires_at timestamp by minutes.
  if (game.expires_at && game.expires_at < Math.floor(Date.now() / 1000)) {
    await sendToConnection(endpoint, connectionId, { type: 'error', error: 'expired' });
    return { statusCode: 200 };
  }

  if (game.status !== 'waiting') {
    await sendToConnection(endpoint, connectionId, { type: 'error', error: 'already_full' });
    return { statusCode: 200 };
  }

  const token = generatePlayerToken();

  try {
    await joinGame(gameId, { blackConnectionId: connectionId, blackToken: token });
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      // Someone else joined in the split second between our read and write.
      await sendToConnection(endpoint, connectionId, { type: 'error', error: 'already_full' });
      return { statusCode: 200 };
    }
    throw err;
  }

  await attachConnectionToGame(connectionId, gameId, 'black');

  await sendToConnection(endpoint, connectionId, {
    type: 'joined',
    game_id: gameId,
    player_token: token,
    color: 'black',
    board_state: game.board_state,
    turn: game.turn,
  });

  // Let the creator know an opponent showed up, if their connection is still open.
  await sendToConnection(endpoint, game.white_connection_id, {
    type: 'game_started',
    game_id: gameId,
    board_state: game.board_state,
    turn: game.turn,
  });

  return { statusCode: 200 };
}

async function handleReconnect(connectionId, endpoint, body) {
  const { game_id: gameId, player_token: playerToken } = body;
  const game = await getGame(gameId);

  if (!game) {
    await sendToConnection(endpoint, connectionId, { type: 'error', error: 'not_found' });
    return { statusCode: 200 };
  }

  let color = null;
  if (game.white_player_token === playerToken) color = 'white';
  else if (game.black_player_token === playerToken) color = 'black';

  if (!color) {
    await sendToConnection(endpoint, connectionId, { type: 'error', error: 'invalid_token' });
    return { statusCode: 200 };
  }

  await reattachConnection(gameId, color, connectionId);
  await attachConnectionToGame(connectionId, gameId, color);

  await sendToConnection(endpoint, connectionId, {
    type: 'reconnected',
    game_id: gameId,
    color,
    board_state: game.board_state,
    turn: game.turn,
    status: game.status,
    move_history: game.move_history,
    is_cpu_game: !!game.is_cpu_game,
  });

  return { statusCode: 200 };
}
