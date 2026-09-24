// Barrel file so other modules can require('shared') if wanted; individual
// files are also requireable directly, e.g. require('shared/dynamo').
module.exports = {
  ...require('./dynamo'),
  ...require('./chessLogic'),
  ...require('./codeGenerator'),
  ...require('./wsResponse'),
  ...require('./cpuEngine'),
};
