const { Game } = require('js-chess-engine');

// js-chess-engine's skill level range is 1-5 (default 3) via the current
// `game.ai({ level })` API — the older `aiMove(level)` method (0-3 range) is
// deprecated and slated for removal in v3, so this wrapper deliberately uses
// the newer one even though it's slightly more verbose to call.
const DIFFICULTY_TO_LEVEL = {
  easy: 1,
  medium: 3,
  hard: 5,
};

// Picks the CPU's move for a given position. Deliberately does NOT trust
// this library's own board/FEN tracking beyond choosing which move to make —
// the caller re-applies the move through our own chess.js-based tryMove so
// legality/status detection (checkmate, draw) stays consistent with the rest
// of the codebase, and we're not maintaining two sources of truth for game
// state.
function chooseCpuMove(fen, difficulty) {
  const level = DIFFICULTY_TO_LEVEL[difficulty] ?? DIFFICULTY_TO_LEVEL.medium;
  const game = new Game(fen);
  const { move } = game.ai({ level });
  const [from, to] = Object.entries(move)[0];
  return { from: from.toLowerCase(), to: to.toLowerCase() };
}

module.exports = { chooseCpuMove, DIFFICULTY_TO_LEVEL };
