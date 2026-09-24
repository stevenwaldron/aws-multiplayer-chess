import { useEffect, useMemo, useState } from 'react'
import Piece from './Piece'
import MoveArrow from './MoveArrow'
import { parseFen, squareToAlgebraic, type PieceColor } from '../chessTypes'
import type { ThemeName } from '../pieceGeometry'
import type { LastMove } from '../hooks/useChessSocket'

const LIGHT_SQUARE = '#C9B896'
const DARK_SQUARE = '#5C4632'
const SELECTED_SQUARE = '#5DCAA5'
const SQUARE_SIZE = 1
const ARROW_DISPLAY_MS = 2000

interface ChessBoardProps {
  boardFen: string
  myColor: PieceColor
  isMyTurn: boolean
  onAttemptMove: (from: string, to: string) => void
  theme: ThemeName
  lastMove: LastMove | null
}

// The board is now purely a function of the server's FEN — this component
// never mutates game state itself. Clicking a destination sends the move
// upward and waits; the piece only actually moves once a fresh boardFen
// prop arrives from a move_made server response.
export default function ChessBoard({ boardFen, myColor, isMyTurn, onAttemptMove, theme, lastMove }: ChessBoardProps) {
  const board = useMemo(() => parseFen(boardFen), [boardFen])
  const [selected, setSelected] = useState<[number, number] | null>(null)
  const [visibleArrow, setVisibleArrow] = useState<LastMove | null>(null)

  // A fresh moveKey (set on every move_made, even a repeat from/to) always
  // restarts the 2s display window — matters for e.g. a piece shuttling
  // back and forth, where from/to alone wouldn't change.
  useEffect(() => {
    if (!lastMove) return
    setVisibleArrow(lastMove)
    const timeout = setTimeout(() => setVisibleArrow(null), ARROW_DISPLAY_MS)
    return () => clearTimeout(timeout)
  }, [lastMove])

  const squareCenter = (row: number, col: number): [number, number, number] => [
    (col - 3.5) * SQUARE_SIZE,
    0,
    (row - 3.5) * SQUARE_SIZE,
  ]

  function handleSquareClick(row: number, col: number) {
    if (!isMyTurn) return
    const clickedPiece = board[row][col]

    if (selected) {
      const [selRow, selCol] = selected

      if (selRow === row && selCol === col) {
        setSelected(null)
        return
      }

      if (clickedPiece && clickedPiece.color === myColor) {
        setSelected([row, col])
        return
      }

      onAttemptMove(squareToAlgebraic(selRow, selCol), squareToAlgebraic(row, col))
      setSelected(null)
      return
    }

    if (clickedPiece && clickedPiece.color === myColor) {
      setSelected([row, col])
    }
  }

  const squares = []
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const isLight = (row + col) % 2 === 0
      const isSelected = selected?.[0] === row && selected?.[1] === col
      const [x, , z] = squareCenter(row, col)

      squares.push(
        <mesh
          key={`sq-${row}-${col}`}
          position={[x, -0.3, z]}
          receiveShadow
          onClick={(e) => {
            e.stopPropagation()
            handleSquareClick(row, col)
          }}
        >
          <boxGeometry args={[SQUARE_SIZE, 0.1, SQUARE_SIZE]} />
          <meshStandardMaterial
            color={isSelected ? SELECTED_SQUARE : isLight ? LIGHT_SQUARE : DARK_SQUARE}
            emissive={isSelected ? SELECTED_SQUARE : '#000000'}
            emissiveIntensity={isSelected ? 0.25 : 0}
            roughness={0.8}
          />
        </mesh>
      )
    }
  }

  const pieces = []
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col]
      if (!piece) continue
      const isSelected = selected?.[0] === row && selected?.[1] === col
      pieces.push(
        <Piece
          key={`pc-${row}-${col}`}
          type={piece.type}
          color={piece.color}
          theme={theme}
          position={squareCenter(row, col)}
          selected={isSelected}
          onClick={() => handleSquareClick(row, col)}
        />
      )
    }
  }

  return (
    <group>
      {/* Board frame */}
      <mesh position={[0, -0.42, 0]} receiveShadow>
        <boxGeometry args={[9, 0.3, 9]} />
        <meshStandardMaterial color="#3A2A1D" roughness={0.7} />
      </mesh>
      {squares}
      {pieces}
      {visibleArrow && <MoveArrow key={visibleArrow.moveKey} from={visibleArrow.from} to={visibleArrow.to} />}
    </group>
  )
}
