const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');

let client;
function getClient(endpoint) {
  if (!client) {
    client = new ApiGatewayManagementApiClient({ endpoint });
  }
  return client;
}

// Sends a JSON payload to one connection. Swallows "GoneException" (410) —
// that just means the recipient already disconnected, which onDisconnect
// will clean up separately; it isn't an error this function needs to surface.
async function sendToConnection(endpoint, connectionId, payload) {
  if (!connectionId) return;
  const apiClient = getClient(endpoint);
  try {
    await apiClient.send(
      new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify(payload)),
      })
    );
  } catch (err) {
    if (err.name === 'GoneException') {
      return;
    }
    throw err;
  }
}

// Builds the management API endpoint from the event's requestContext —
// this is the same API Gateway WebSocket API, just addressed via its HTTPS
// management interface instead of the wss:// one clients connect to.
function endpointFromEvent(event) {
  const { domainName, stage } = event.requestContext;
  return `https://${domainName}/${stage}`;
}

module.exports = { sendToConnection, endpointFromEvent };
