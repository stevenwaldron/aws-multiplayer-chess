const { Chess } = require('chess.js');

function initialBoardState() {
  return new Chess().fen();
}

// Attempts a move against the current FEN. Returns { legal: false } if
// chess.js rejects it for any reason (illegal move, wrong piece, moving into
// check, etc.) — the caller never needs to know *why* it's illegal, just that
// it is.
function tryMove(fen, from, to, promotion) {
  const chess = new Chess(fen);
  let result;
  try {
    result = chess.move({ from, to, promotion: promotion || 'q' });
  } catch (err) {
    result = null;
  }

  if (!result) {
    return { legal: false };
  }

  let status = 'in_progress';
  if (chess.isCheckmate()) status = 'checkmate';
  else if (chess.isStalemate() || chess.isDraw()) status = 'draw';

  return {
    legal: true,
    newFen: chess.fen(),
    newTurn: chess.turn() === 'w' ? 'white' : 'black',
    status,
    san: result.san,
    // chess.js already tells us the captured piece type (p/n/b/r/q) on a
    // capture move, including en passant and capture-with-promotion — no
    // need to diff board states ourselves, which would be fiddly to get
    // right around promotions (a pawn "disappearing" via promotion isn't
    // a capture, and diffing piece counts alone can't tell the difference).
    captured: result.captured || null,
  };
}

// Ownership check before we even ask chess.js — confirms the piece at `from`
// exists and belongs to the player making the request.
function ownsPieceAt(fen, square, color) {
  const chess = new Chess(fen);
  const piece = chess.get(square);
  if (!piece) return false;
  return (piece.color === 'w' && color === 'white') || (piece.color === 'b' && color === 'black');
}

module.exports = { initialBoardState, tryMove, ownsPieceAt };
