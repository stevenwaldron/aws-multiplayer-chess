// Verifies the captured-piece field flows correctly through handleMove: set
// on an actual capture, and absent (null) on a non-capture move.
const Module = require('module');
const path = require('path');

// A position where white can capture a black pawn on d5 by playing exd5.
const preCaptureFen = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

const fakeGamesTable = {
  'capture-game': {
    game_id: 'capture-game',
    status: 'in_progress',
    board_state: preCaptureFen,
    turn: 'white',
    white_connection_id: 'conn-white',
    black_connection_id: 'conn-black',
    is_cpu_game: false,
    move_history: [],
  },
};

const fakeConnections = {
  'conn-white': { connection_id: 'conn-white', game_id: 'capture-game', player_color: 'white' },
  'conn-black': { connection_id: 'conn-black', game_id: 'capture-game', player_color: 'black' },
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
    if (!connectionId) return;
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
  console.log('--- Test: exd5 is a capture, captured field should be "p" ---');
  await handler(makeEvent('conn-white', { action: 'move', from: 'e4', to: 'd5' }));
  console.log('sent:', sentMessages.map((m) => ({ conn: m.connectionId, captured: m.payload.captured, san: m.payload.san })));
  console.assert(sentMessages[0].payload.captured === 'p', 'FAIL: exd5 should report captured: "p", got ' + sentMessages[0].payload.captured);
  console.assert(fakeGamesTable['capture-game'].move_history[0].captured === 'p', 'FAIL: stored move_history entry should have captured: "p"');

  sentMessages.length = 0;
  console.log('\n--- Test: a non-capture move should have captured: null ---');
  // Black's turn now; play a non-capture move, e.g. Nf6
  await handler(makeEvent('conn-black', { action: 'move', from: 'g8', to: 'f6' }));
  console.log('sent:', sentMessages.map((m) => ({ conn: m.connectionId, captured: m.payload.captured, san: m.payload.san })));
  console.assert(sentMessages[0].payload.captured === null, 'FAIL: non-capture move should report captured: null, got ' + sentMessages[0].payload.captured);

  console.log('\nALL CAPTURE-FIELD TESTS PASSED (no FAIL lines above = success)');
}

run().catch((err) => {
  console.error('TEST HARNESS ERROR', err);
  process.exit(1);
});
