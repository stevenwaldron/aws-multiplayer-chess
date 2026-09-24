const { getConnection, getGame, applyMove } = require('shared/dynamo');
const { tryMove, ownsPieceAt } = require('shared/chessLogic');
const { sendToConnection, endpointFromEvent } = require('shared/wsResponse');
const { chooseCpuMove } = require('shared/cpuEngine');

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const endpoint = endpointFromEvent(event);
  const body = JSON.parse(event.body || '{}');
  const { from, to, promotion } = body;

  const fail = (error) => sendToConnection(endpoint, connectionId, { type: 'error', error });

  try {
    // 1. Identify the player from their connection — never from anything
    // the client claims. This is what makes turn enforcement actually safe.
    const connection = await getConnection(connectionId);
    if (!connection || !connection.game_id || !connection.player_color) {
      await fail('not_in_a_game');
      return { statusCode: 200 };
    }
    const { game_id: gameId, player_color: playerColor } = connection;

    const game = await getGame(gameId);
    if (!game) {
      await fail('not_found');
      return { statusCode: 200 };
    }

    if (game.status !== 'in_progress') {
      await fail('game_not_active');
      return { statusCode: 200 };
    }

    if (game.turn !== playerColor) {
      await fail('not_your_turn');
      return { statusCode: 200 };
    }

    if (!ownsPieceAt(game.board_state, from, playerColor)) {
      await fail('not_your_piece');
      return { statusCode: 200 };
    }

    const result = tryMove(game.board_state, from, to, promotion);
    if (!result.legal) {
      await fail('illegal_move');
      return { statusCode: 200 };
    }

    const moveEntry = {
      from,
      to,
      san: result.san,
      color: playerColor,
      captured: result.captured,
      timestamp: Date.now(),
    };

    try {
      await applyMove(gameId, {
        expectedTurn: game.turn,
        newBoardState: result.newFen,
        newTurn: result.newTurn,
        newStatus: result.status,
        moveEntry,
      });
    } catch (err) {
      if (err.name === 'ConditionalCheckFailedException') {
        // Another move landed first (e.g. a retried request). Reject rather
        // than silently double-applying — the client should re-sync and retry.
        await fail('move_conflict');
        return { statusCode: 200 };
      }
      throw err;
    }

    const update = {
      type: 'move_made',
      game_id: gameId,
      from,
      to,
      san: result.san,
      captured: result.captured,
      board_state: result.newFen,
      turn: result.newTurn,
      status: result.status,
    };

    await Promise.all([
      sendToConnection(endpoint, game.white_connection_id, update),
      sendToConnection(endpoint, game.black_connection_id, update),
    ]);

    // The human's move is fully committed and broadcast at this point. If
    // this is a vs-CPU game and it's now the CPU's turn, compute and apply
    // its response in this same invocation, then send a second move_made —
    // the client just sees two updates arrive in quick succession, no
    // protocol change needed on top of the existing message shape.
    if (game.is_cpu_game && result.status === 'in_progress' && result.newTurn === 'black') {
      await playCpuTurn(gameId, game, result.newFen, endpoint);
    }

    return { statusCode: 200 };
  } catch (err) {
    console.error('handleMove failed', err);
    await fail('server_error');
    return { statusCode: 500 };
  }
};

async function playCpuTurn(gameId, game, currentFen, endpoint) {
  const { from: cpuFrom, to: cpuTo } = chooseCpuMove(currentFen, game.cpu_difficulty);
  const cpuResult = tryMove(currentFen, cpuFrom, cpuTo);

  if (!cpuResult.legal) {
    // The engine should never propose an illegal move — if it somehow does,
    // fail loudly rather than silently leaving the game stuck on black's turn.
    console.error('CPU proposed an illegal move', { gameId, cpuFrom, cpuTo, currentFen });
    return;
  }

  const cpuMoveEntry = {
    from: cpuFrom,
    to: cpuTo,
    san: cpuResult.san,
    color: 'black',
    captured: cpuResult.captured,
    timestamp: Date.now(),
  };

  try {
    await applyMove(gameId, {
      expectedTurn: 'black',
      newBoardState: cpuResult.newFen,
      newTurn: cpuResult.newTurn,
      newStatus: cpuResult.status,
      moveEntry: cpuMoveEntry,
    });
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      // Shouldn't happen in a single-player game (only one human ever moves),
      // but fail safe rather than throwing if it somehow does.
      console.error('CPU move conflicted unexpectedly', { gameId });
      return;
    }
    throw err;
  }

  await sendToConnection(endpoint, game.white_connection_id, {
    type: 'move_made',
    game_id: gameId,
    from: cpuFrom,
    to: cpuTo,
    san: cpuResult.san,
    captured: cpuResult.captured,
    board_state: cpuResult.newFen,
    turn: cpuResult.newTurn,
    status: cpuResult.status,
  });
}
