const { createBareConnection } = require('shared/dynamo');

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;

  try {
    await createBareConnection(connectionId);
    return { statusCode: 200 };
  } catch (err) {
    console.error('onConnect failed', err);
    return { statusCode: 500, body: 'Failed to connect' };
  }
};
