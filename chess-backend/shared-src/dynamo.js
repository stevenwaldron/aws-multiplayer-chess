const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
} = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const doc = DynamoDBDocumentClient.from(client);

const GAMES_TABLE = process.env.GAMES_TABLE;
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE;

// --- Connections table ---
// A connection starts out with no game attached (right after $connect) and
// gets game_id + player_color attached once the client sends create/join/reconnect.

async function createBareConnection(connectionId) {
  await doc.send(
    new PutCommand({
      TableName: CONNECTIONS_TABLE,
      Item: { connection_id: connectionId, connected_at: Date.now() },
    })
  );
}

async function attachConnectionToGame(connectionId, gameId, playerColor) {
  await doc.send(
    new UpdateCommand({
      TableName: CONNECTIONS_TABLE,
      Key: { connection_id: connectionId },
      UpdateExpression: 'SET game_id = :g, player_color = :c',
      ExpressionAttributeValues: { ':g': gameId, ':c': playerColor },
    })
  );
}

async function getConnection(connectionId) {
  const result = await doc.send(
    new GetCommand({ TableName: CONNECTIONS_TABLE, Key: { connection_id: connectionId } })
  );
  return result.Item || null;
}

async function deleteConnection(connectionId) {
  await doc.send(
    new DeleteCommand({ TableName: CONNECTIONS_TABLE, Key: { connection_id: connectionId } })
  );
}

// --- Games table ---

async function getGame(gameId) {
  const result = await doc.send(new GetCommand({ TableName: GAMES_TABLE, Key: { game_id: gameId } }));
  return result.Item || null;
}

// Conditional create: fails if the code is already taken, so the caller can
// regenerate and retry instead of silently overwriting someone's game.
async function createGame(gameId, item) {
  await doc.send(
    new PutCommand({
      TableName: GAMES_TABLE,
      Item: { game_id: gameId, ...item },
      ConditionExpression: 'attribute_not_exists(game_id)',
    })
  );
}

// Second player joins: flips status to in_progress and clears the TTL so the
// game is never swept up by expiration once it's actually being played.
async function joinGame(gameId, { blackConnectionId, blackToken }) {
  await doc.send(
    new UpdateCommand({
      TableName: GAMES_TABLE,
      Key: { game_id: gameId },
      UpdateExpression:
        'SET #status = :inProgress, black_connection_id = :connId, black_player_token = :token REMOVE expires_at',
      ConditionExpression: '#status = :waiting',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':inProgress': 'in_progress',
        ':waiting': 'waiting',
        ':connId': blackConnectionId,
        ':token': blackToken,
      },
    })
  );
}

// A previously-joined player reconnects: just re-point their color's
// connection_id, no other game state changes.
async function reattachConnection(gameId, color, connectionId) {
  const field = color === 'white' ? 'white_connection_id' : 'black_connection_id';
  await doc.send(
    new UpdateCommand({
      TableName: GAMES_TABLE,
      Key: { game_id: gameId },
      UpdateExpression: `SET ${field} = :connId`,
      ExpressionAttributeValues: { ':connId': connectionId },
    })
  );
}

// Applies a validated move. The ConditionExpression on `turn` is optimistic
// concurrency control: if two move requests race, the second one's condition
// fails and it's rejected instead of silently double-applying.
async function applyMove(gameId, { expectedTurn, newBoardState, newTurn, newStatus, moveEntry }) {
  await doc.send(
    new UpdateCommand({
      TableName: GAMES_TABLE,
      Key: { game_id: gameId },
      UpdateExpression:
        'SET board_state = :board, turn = :turn, #status = :status, move_history = list_append(move_history, :move)',
      ConditionExpression: 'turn = :expectedTurn',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':board': newBoardState,
        ':turn': newTurn,
        ':status': newStatus,
        ':move': [moveEntry],
        ':expectedTurn': expectedTurn,
      },
    })
  );
}

module.exports = {
  createBareConnection,
  attachConnectionToGame,
  getConnection,
  deleteConnection,
  getGame,
  createGame,
  joinGame,
  reattachConnection,
  applyMove,
};
