// Mocks shared/dynamo and shared/wsResponse so we can exercise handleMove's
// actual control flow (turn checks, ownership checks, conditional update)
// without needing real AWS.
const Module = require('module');
const path = require('path');
const { initialBoardState } = require('../layer/nodejs/node_modules/shared/chessLogic');

const fakeGamesTable = {
  'test-game-1': {
    game_id: 'test-game-1',
    status: 'in_progress',
    board_state: initialBoardState(),
    turn: 'white',
    white_connection_id: 'conn-white',
    black_connection_id: 'conn-black',
    move_history: [],
  },
};

const fakeConnections = {
  'conn-white': { connection_id: 'conn-white', game_id: 'test-game-1', player_color: 'white' },
  'conn-black': { connection_id: 'conn-black', game_id: 'test-game-1', player_color: 'black' },
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
    sentMessages.push({ connectionId, payload });
  },
  endpointFromEvent: () => 'https://fake-endpoint/prod',
};

// Intercept require('shared/dynamo') and require('shared/wsResponse')
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
  sentMessages.length = 0;

  console.log('--- Test: white makes a legal move ---');
  let res = await handler(makeEvent('conn-white', { action: 'move', from: 'e2', to: 'e4' }));
  console.log('status:', res.statusCode);
  console.log('game turn now:', fakeGamesTable['test-game-1'].turn);
  console.log('sent:', sentMessages.map((m) => `${m.connectionId}: ${m.payload.type}`));
  console.assert(fakeGamesTable['test-game-1'].turn === 'black', 'FAIL: turn should be black after white moves');
  console.assert(sentMessages.length === 2, 'FAIL: should broadcast to both players');

  sentMessages.length = 0;
  console.log('\n--- Test: white tries to move again out of turn ---');
  res = await handler(makeEvent('conn-white', { action: 'move', from: 'd2', to: 'd4' }));
  console.log('sent:', sentMessages.map((m) => m.payload));
  console.assert(sentMessages[0].payload.error === 'not_your_turn', 'FAIL: should reject out-of-turn move');
  console.assert(fakeGamesTable['test-game-1'].turn === 'black', 'FAIL: game state should not have changed');

  sentMessages.length = 0;
  console.log('\n--- Test: black tries to move a square with no piece ---');
  res = await handler(makeEvent('conn-black', { action: 'move', from: 'e4', to: 'e5' }));
  console.log('sent:', sentMessages.map((m) => m.payload));
  console.assert(sentMessages[0].payload.error === 'not_your_piece', 'FAIL: should reject moving from empty/wrong square');

  sentMessages.length = 0;
  console.log('\n--- Test: black makes a legal move ---');
  res = await handler(makeEvent('conn-black', { action: 'move', from: 'e7', to: 'e5' }));
  console.log('game turn now:', fakeGamesTable['test-game-1'].turn);
  console.assert(fakeGamesTable['test-game-1'].turn === 'white', 'FAIL: turn should flip back to white');

  sentMessages.length = 0;
  console.log('\n--- Test: unknown connection (not attached to any game) ---');
  res = await handler(makeEvent('conn-ghost', { action: 'move', from: 'e2', to: 'e4' }));
  console.log('sent:', sentMessages.map((m) => m.payload));
  console.assert(sentMessages[0].payload.error === 'not_in_a_game', 'FAIL: should reject unknown connection');

  console.log('\nALL HANDLEMOVE INTEGRATION TESTS PASSED (no FAIL lines above = success)');
}

run().catch((err) => {
  console.error('TEST HARNESS ERROR', err);
  process.exit(1);
});
