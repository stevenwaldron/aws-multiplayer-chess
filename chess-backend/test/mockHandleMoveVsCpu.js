// Simulates a vs-CPU game through the real handleMove handler, mocking
// DynamoDB and the WebSocket send — verifies the human's move and the CPU's
// automatic response both get applied and broadcast in one invocation.
const Module = require('module');
const path = require('path');
const { initialBoardState } = require('../layer/nodejs/node_modules/shared/chessLogic');

const fakeGamesTable = {
  'cpu-game-1': {
    game_id: 'cpu-game-1',
    status: 'in_progress',
    board_state: initialBoardState(),
    turn: 'white',
    white_connection_id: 'conn-human',
    black_connection_id: null,
    is_cpu_game: true,
    cpu_difficulty: 'medium',
    move_history: [],
  },
};

const fakeConnections = {
  'conn-human': { connection_id: 'conn-human', game_id: 'cpu-game-1', player_color: 'white' },
};

const sentMessages = [];

const mockDynamo = {
  getConnection: async (id) => fakeConnections[id] || null,
  getGame: async (id) => fakeGamesTable[id] || null,
  applyMove: async (gameId, { expectedTurn, newBoardState, newTurn, newStatus, moveEntry }) => {
    const game = fakeGamesTable[gameId];
    if (game.turn !== expectedTurn) {
      const err = new Error('conditional failed');
      err.name = 'ConditionalCheckFailedException';
      throw err;
    }
    game.board_state = newBoardState;
    game.turn = newTurn;
    game.status = newStatus;
    game.move_history.push(moveEntry);
  },
};

const mockWsResponse = {
  sendToConnection: async (endpoint, connectionId, payload) => {
    if (!connectionId) return; // mirrors the real sendToConnection's guard
    sentMessages.push({ connectionId, payload });
  },
  endpointFromEvent: () => 'https://fake-endpoint/prod',
};

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  if (request === 'shared/dynamo') return 'MOCK_DYNAMO';
  if (request === 'shared/wsResponse') return 'MOCK_WSRESPONSE';
  if (request === 'shared/chessLogic') {
    return path.resolve(__dirname, '../layer/nodejs/node_modules/shared/chessLogic.js');
  }
  if (request === 'shared/cpuEngine') {
    return path.resolve(__dirname, '../layer/nodejs/node_modules/shared/cpuEngine.js');
  }
  return originalResolve.call(this, request, ...args);
};

const originalLoad = Module._load;
Module._load = function (request, ...args) {
  if (request === 'shared/dynamo') return mockDynamo;
  if (request === 'shared/wsResponse') return mockWsResponse;
  return originalLoad.call(this, request, ...args);
};

const { handler } = require('../functions/handleMove/index.js');

function makeEvent(connectionId, body) {
  return {
    requestContext: { connectionId, domainName: 'fake', stage: 'prod' },
    body: JSON.stringify(body),
  };
}

async function run() {
  console.log('--- Human (white) plays e2-e4 in a vs-CPU game ---');
  await handler(makeEvent('conn-human', { action: 'move', from: 'e2', to: 'e4' }));

  console.log('Messages sent:', sentMessages.map((m) => `${m.connectionId}: ${m.payload.type} (${m.payload.from}->${m.payload.to})`));
  console.log('Final game state:', { turn: fakeGamesTable['cpu-game-1'].turn, moveCount: fakeGamesTable['cpu-game-1'].move_history.length });

  console.assert(sentMessages.length === 2, 'FAIL: expected 2 messages (human move + CPU move), got ' + sentMessages.length);
  console.assert(sentMessages[0].payload.from === 'e2' && sentMessages[0].payload.to === 'e4', 'FAIL: first message should be the human move');
  console.assert(sentMessages[1].payload.color === undefined, 'sanity: move_made payload shape check');
  console.assert(fakeGamesTable['cpu-game-1'].turn === 'white', 'FAIL: turn should be back to white after CPU responds');
  console.assert(fakeGamesTable['cpu-game-1'].move_history.length === 2, 'FAIL: should have 2 moves in history (human + CPU)');
  console.assert(sentMessages.every((m) => m.connectionId === 'conn-human'), 'FAIL: all messages should go to the human — there is no second player');

  console.log('\nALL VS-CPU INTEGRATION TESTS PASSED (no FAIL lines above = success)');
}

run().catch((err) => {
  console.error('TEST HARNESS ERROR', err);
  process.exit(1);
});
