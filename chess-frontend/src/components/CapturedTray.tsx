import type { MoveHistoryEntry } from '../hooks/useChessSocket'

// chess.js capture letters (p/n/b/r/q — never k) to display glyph, split by
// the CAPTURED piece's own color (not the capturer's) so the glyph always
// matches how that piece actually looked on the board.
const GLYPHS: Record<string, { white: string; black: string }> = {
  p: { white: '♙', black: '♟' },
  n: { white: '♘', black: '♞' },
  b: { white: '♗', black: '♝' },
  r: { white: '♖', black: '♜' },
  q: { white: '♕', black: '♛' },
}

const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 }

// Standard chess piece order for display, strongest first — matches the
// convention most chess UIs use for a captured-pieces tray.
const DISPLAY_ORDER = ['q', 'r', 'b', 'n', 'p']

interface CapturedTrayProps {
  moveHistory: MoveHistoryEntry[]
}

export default function CapturedTray({ moveHistory }: CapturedTrayProps) {
  const capturedByWhite: string[] = [] // black pieces white has taken
  const capturedByBlack: string[] = [] // white pieces black has taken

  for (const move of moveHistory) {
    if (!move.captured) continue
    if (move.color === 'white') capturedByWhite.push(move.captured)
    else capturedByBlack.push(move.captured)
  }

  const sortByValue = (list: string[]) =>
    [...list].sort((a, b) => DISPLAY_ORDER.indexOf(a) - DISPLAY_ORDER.indexOf(b))

  const whitePoints = capturedByWhite.reduce((sum, p) => sum + PIECE_VALUE[p], 0)
  const blackPoints = capturedByBlack.reduce((sum, p) => sum + PIECE_VALUE[p], 0)
  const advantage = whitePoints - blackPoints

  if (capturedByWhite.length === 0 && capturedByBlack.length === 0) {
    return null
  }

  return (
    <div className="captured-tray">
      <div className="captured-row">
        <span className="captured-label">White</span>
        <span className="captured-glyphs">
          {sortByValue(capturedByWhite).map((p, i) => (
            <span key={i}>{GLYPHS[p].black}</span>
          ))}
        </span>
        {advantage > 0 && <span className="captured-advantage">+{advantage}</span>}
      </div>
      <div className="captured-row">
        <span className="captured-label">Black</span>
        <span className="captured-glyphs">
          {sortByValue(capturedByBlack).map((p, i) => (
            <span key={i}>{GLYPHS[p].white}</span>
          ))}
        </span>
        {advantage < 0 && <span className="captured-advantage">+{-advantage}</span>}
      </div>
    </div>
  )
}
