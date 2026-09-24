export type PieceType = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king'
export type PieceColor = 'white' | 'black'

export interface PieceData {
  type: PieceType
  color: PieceColor
}

export type Square = PieceData | null
export type BoardState = Square[][]

export interface Move {
  from: [number, number]
  to: [number, number]
  piece: PieceData
}

const backRank: PieceType[] = [
  'rook',
  'knight',
  'bishop',
  'queen',
  'king',
  'bishop',
  'knight',
  'rook',
]

// board[0] is the black back rank (rank 8), board[7] is the white back rank (rank 1).
export function createInitialBoard(): BoardState {
  const board: BoardState = Array.from({ length: 8 }, () => Array(8).fill(null))

  for (let col = 0; col < 8; col++) {
    board[0][col] = { type: backRank[col], color: 'black' }
    board[1][col] = { type: 'pawn', color: 'black' }
    board[6][col] = { type: 'pawn', color: 'white' }
    board[7][col] = { type: backRank[col], color: 'white' }
  }

  return board
}

export function squareToAlgebraic(row: number, col: number): string {
  const file = String.fromCharCode(97 + col) // a-h
  const rank = 8 - row
  return `${file}${rank}`
}

const FEN_PIECE_TYPES: Record<string, PieceType> = {
  k: 'king',
  q: 'queen',
  r: 'rook',
  b: 'bishop',
  n: 'knight',
  p: 'pawn',
}

// Parses the piece-placement field of a FEN string (what the server sends
// as board_state) into our BoardState grid. FEN ranks run 8→1 top to bottom,
// same convention as board[0] = black's back rank here, so this is a
// straightforward per-rank decode.
export function parseFen(fen: string): BoardState {
  const placement = fen.split(' ')[0]
  const ranks = placement.split('/')
  const board: BoardState = Array.from({ length: 8 }, () => Array(8).fill(null))

  ranks.forEach((rankStr, row) => {
    let col = 0
    for (const char of rankStr) {
      if (/\d/.test(char)) {
        col += parseInt(char, 10)
      } else {
        const type = FEN_PIECE_TYPES[char.toLowerCase()]
        const color: PieceColor = char === char.toUpperCase() ? 'white' : 'black'
        board[row][col] = { type, color }
        col += 1
      }
    }
  })

  return board
}
