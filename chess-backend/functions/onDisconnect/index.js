const { deleteConnection } = require('shared/dynamo');

// Deliberately does NOT clear white_connection_id/black_connection_id on the
// Games item — a disconnect is often just a dropped tab that will reconnect.
// A stale connection_id just means the next postToConnection to it fails
// with GoneException (handled gracefully) until reconnect overwrites it.
exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;

  try {
    await deleteConnection(connectionId);
    return { statusCode: 200 };
  } catch (err) {
    console.error('onDisconnect failed', err);
    // Still return 200 — API Gateway doesn't retry $disconnect, and the
    // connection is going away either way.
    return { statusCode: 200 };
  }
};
