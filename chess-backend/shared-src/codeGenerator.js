const crypto = require('crypto');

const ADJECTIVES = [
  'swift', 'quiet', 'bold', 'lucky', 'clever', 'silent', 'brave', 'crimson',
  'golden', 'shadow', 'rapid', 'frozen', 'wild', 'gentle', 'fierce', 'hidden',
];

const ANIMALS = [
  'falcon', 'otter', 'wolf', 'heron', 'panther', 'raven', 'lynx', 'sparrow',
  'badger', 'viper', 'fox', 'hawk', 'bison', 'mantis', 'orca', 'tiger',
];

// e.g. "swift-falcon-42". Not cryptographically secret on its own — the
// invite-link security model relies on the code space being large enough
// that guessing is impractical, combined with the 1-hour TTL on unjoined
// games shrinking the window further.
function generateGameCode() {
  const adjective = ADJECTIVES[crypto.randomInt(ADJECTIVES.length)];
  const animal = ANIMALS[crypto.randomInt(ANIMALS.length)];
  const number = crypto.randomInt(100); // 0-99
  return `${adjective}-${animal}-${number}`;
}

// Private per-player token, handed out on join/create and never exposed in
// the shareable link. This is what actually needs to be unguessable.
function generatePlayerToken() {
  return crypto.randomBytes(24).toString('base64url');
}

module.exports = { generateGameCode, generatePlayerToken };
