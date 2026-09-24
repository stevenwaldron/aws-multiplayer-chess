import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import type { PieceColor, PieceType } from '../chessTypes'
import { getPieceParts, getThemeColors, type ThemeName } from '../pieceGeometry'

interface PieceProps {
  type: PieceType
  color: PieceColor
  theme: ThemeName
  position: [number, number, number]
  selected: boolean
  onClick: () => void
}

function Shape({ shape, args }: { shape: string; args: number[] }) {
  switch (shape) {
    case 'cylinder':
      return <cylinderGeometry args={args as any} />
    case 'box':
      return <boxGeometry args={args as any} />
    case 'sphere':
      return <sphereGeometry args={args as any} />
    case 'cone':
      return <coneGeometry args={args as any} />
    case 'torus':
      return <torusGeometry args={args as any} />
    default:
      return null
  }
}

export default function Piece({ type, color, theme, position, selected, onClick }: PieceProps) {
  const groupRef = useRef<Group>(null)
  const colors = getThemeColors(theme, color)
  const parts = getPieceParts(theme, type)

  useFrame((state) => {
    if (!groupRef.current) return
    groupRef.current.position.y = selected
      ? position[1] + 0.08 + Math.sin(state.clock.elapsedTime * 4) * 0.02
      : position[1]
  })

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      {selected && (
        <mesh position={[0, -0.28, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.32, 0.4, 32]} />
          <meshStandardMaterial color="#5DCAA5" emissive="#5DCAA5" emissiveIntensity={0.5} />
        </mesh>
      )}

      {parts.map((part, i) => (
        <mesh key={i} position={part.position} rotation={part.rotation} castShadow receiveShadow>
          <Shape shape={part.shape} args={part.args} />
          <meshStandardMaterial
            color={part.material === 'accent' ? colors.accent : colors.base}
            roughness={0.55}
            metalness={0.05}
          />
        </mesh>
      ))}
    </group>
  )
}
