import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Mesh, MeshStandardMaterial } from 'three'

const FADE_DURATION_MS = 2000
const ARROW_COLOR = '#5DCAA5'

interface MoveArrowProps {
  from: string // algebraic, e.g. "e2"
  to: string
}

// Converts algebraic notation to a board position matching the same
// (col - 3.5, row - 3.5) convention used everywhere else (ChessBoard,
// Piece) — row 0 is the black back rank, consistent with parseFen.
function squareToXZ(square: string): [number, number] {
  const col = square.charCodeAt(0) - 97 // 'a' = 0
  const rank = parseInt(square[1], 10)
  const row = 8 - rank
  return [col - 3.5, row - 3.5]
}

export default function MoveArrow({ from, to }: MoveArrowProps) {
  const shaftRef = useRef<Mesh>(null)
  const headRef = useRef<Mesh>(null)
  const startTime = useRef(performance.now())

  const [x1, z1] = squareToXZ(from)
  const [x2, z2] = squareToXZ(to)
  const dx = x2 - x1
  const dz = z2 - z1
  const length = Math.sqrt(dx * dx + dz * dz)
  // Angle to rotate a group (whose local +Z we treat as "forward") so that
  // forward points from the start square to the end square.
  const angle = Math.atan2(dx, dz)

  const headLength = 0.3
  const shaftLength = Math.max(0.05, length - headLength)

  useFrame(() => {
    const elapsed = performance.now() - startTime.current
    const opacity = Math.max(0, 1 - elapsed / FADE_DURATION_MS)
    const shaftMat = shaftRef.current?.material as MeshStandardMaterial | undefined
    const headMat = headRef.current?.material as MeshStandardMaterial | undefined
    if (shaftMat) shaftMat.opacity = opacity
    if (headMat) headMat.opacity = opacity
  })

  return (
    <group position={[x1, -0.2, z1]} rotation={[0, angle, 0]}>
      <mesh ref={shaftRef} position={[0, 0, shaftLength / 2]}>
        <boxGeometry args={[0.06, 0.02, shaftLength]} />
        <meshStandardMaterial
          color={ARROW_COLOR}
          emissive={ARROW_COLOR}
          emissiveIntensity={0.8}
          transparent
          opacity={1}
          depthTest={false}
        />
      </mesh>
      <mesh ref={headRef} position={[0, 0, shaftLength + headLength / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.12, headLength, 12]} />
        <meshStandardMaterial
          color={ARROW_COLOR}
          emissive={ARROW_COLOR}
          emissiveIntensity={0.8}
          transparent
          opacity={1}
          depthTest={false}
        />
      </mesh>
    </group>
  )
}
