import type { PieceColor, PieceType } from './chessTypes'

export type ThemeName = 'classic' | 'fantasy' | 'scifi'

export interface PiecePart {
  shape: 'cylinder' | 'box' | 'sphere' | 'cone' | 'torus'
  args: number[]
  position: [number, number, number]
  rotation?: [number, number, number]
  material: 'base' | 'accent'
}

export interface ThemeColors {
  white: { base: string; accent: string }
  black: { base: string; accent: string }
}

export const THEME_LABELS: Record<ThemeName, string> = {
  classic: 'Classic',
  fantasy: 'Fantasy',
  scifi: 'Sci-fi',
}

export const THEME_COLORS: Record<ThemeName, ThemeColors> = {
  classic: {
    white: { base: '#EDE6D6', accent: '#C9BEA0' },
    black: { base: '#2B211B', accent: '#4A3B30' },
  },
  fantasy: {
    white: { base: '#E8E2D0', accent: '#C9A227' }, // Silverguard, gold
    black: { base: '#241B2E', accent: '#8B4FD1' }, // Shadowfell, purple
  },
  scifi: {
    white: { base: '#D8DEE4', accent: '#34D1C4' }, // Alliance, cyan
    black: { base: '#1B1F24', accent: '#E04B2F' }, // Dominion, red-orange
  },
}

// Every piece shares this pedestal so pieces of any theme still read as
// belonging to the same board/scale.
const PEDESTAL: PiecePart = {
  shape: 'cylinder',
  args: [0.26, 0.3, 0.1, 24],
  position: [0, -0.24, 0],
  material: 'base',
}

type PieceParts = Record<PieceType, PiecePart[]>
type ThemeGeometry = Record<ThemeName, PieceParts>

export const PIECE_GEOMETRY: ThemeGeometry = {
  classic: {
    // Humanoid foot soldier: tunic, helmet, shield, short sword
    pawn: [
      { shape: 'cylinder', args: [0.14, 0.17, 0.32, 16], position: [0, 0.02, 0], material: 'base' },
      { shape: 'sphere', args: [0.11, 16, 12], position: [0, 0.24, 0], material: 'base' },
      { shape: 'cone', args: [0.1, 0.1, 12], position: [0, 0.32, 0], material: 'accent' },
      { shape: 'cylinder', args: [0.035, 0.035, 0.22, 8], position: [-0.16, 0.12, 0], rotation: [0, 0, 0.5], material: 'base' },
      { shape: 'cylinder', args: [0.035, 0.035, 0.22, 8], position: [0.16, 0.12, 0], rotation: [0, 0, -0.5], material: 'base' },
      { shape: 'cylinder', args: [0.09, 0.09, 0.02, 12], position: [-0.22, 0.08, 0.05], rotation: [Math.PI / 2, 0, 0], material: 'accent' },
      { shape: 'box', args: [0.02, 0.24, 0.02], position: [0.22, 0.2, 0.05], rotation: [0, 0, -0.3], material: 'accent' },
    ],
    rook: [
      { shape: 'cylinder', args: [0.19, 0.22, 0.36, 20], position: [0, -0.02, 0], material: 'base' },
      { shape: 'cylinder', args: [0.22, 0.2, 0.12, 20], position: [0, 0.2, 0], material: 'accent' },
      { shape: 'box', args: [0.09, 0.08, 0.09], position: [0.16, 0.3, 0], material: 'base' },
      { shape: 'box', args: [0.09, 0.08, 0.09], position: [-0.16, 0.3, 0], material: 'base' },
      { shape: 'box', args: [0.09, 0.08, 0.09], position: [0, 0.3, 0.16], material: 'base' },
      { shape: 'box', args: [0.09, 0.08, 0.09], position: [0, 0.3, -0.16], material: 'base' },
    ],
    knight: [
      { shape: 'cylinder', args: [0.18, 0.22, 0.3, 20], position: [0, 0.02, 0], material: 'base' },
      { shape: 'box', args: [0.16, 0.34, 0.2], position: [0, 0.18, 0.03], rotation: [0.3, 0, 0], material: 'base' },
      { shape: 'box', args: [0.13, 0.22, 0.12], position: [0.02, 0.34, 0.15], rotation: [0.9, 0, 0], material: 'accent' },
    ],
    // Cleric: robe, mitre, staff with orb, cape
    bishop: [
      { shape: 'cone', args: [0.17, 0.4, 16], position: [0, 0.06, 0], material: 'base' },
      { shape: 'sphere', args: [0.1, 16, 12], position: [0, 0.3, 0], material: 'base' },
      { shape: 'cone', args: [0.09, 0.18, 10], position: [0, 0.44, 0], material: 'accent' },
      { shape: 'cylinder', args: [0.03, 0.03, 0.2, 8], position: [-0.15, 0.2, 0], rotation: [0, 0, 0.6], material: 'base' },
      { shape: 'cylinder', args: [0.03, 0.03, 0.2, 8], position: [0.14, 0.22, 0.05], rotation: [0, 0, -0.3], material: 'base' },
      { shape: 'cylinder', args: [0.015, 0.015, 0.5, 6], position: [0.2, 0.36, 0.08], rotation: [0, 0, -0.15], material: 'accent' },
      { shape: 'sphere', args: [0.035, 8, 8], position: [0.225, 0.6, 0.09], material: 'accent' },
      { shape: 'box', args: [0.18, 0.3, 0.02], position: [0, 0.16, -0.12], rotation: [0.15, 0, 0], material: 'accent' },
    ],
    // Crowned queen: gown, bodice, crown, scepter, cape
    queen: [
      { shape: 'cone', args: [0.19, 0.42, 16], position: [0, 0.05, 0], material: 'base' },
      { shape: 'cylinder', args: [0.12, 0.15, 0.16, 14], position: [0, 0.32, 0], material: 'base' },
      { shape: 'sphere', args: [0.095, 16, 12], position: [0, 0.44, 0], material: 'base' },
      { shape: 'torus', args: [0.09, 0.02, 8, 16], position: [0, 0.52, 0], rotation: [Math.PI / 2, 0, 0], material: 'accent' },
      { shape: 'cone', args: [0.02, 0.06, 6], position: [0, 0.58, 0], material: 'accent' },
      { shape: 'cylinder', args: [0.028, 0.028, 0.18, 8], position: [-0.14, 0.34, 0], rotation: [0, 0, 0.5], material: 'base' },
      { shape: 'cylinder', args: [0.028, 0.028, 0.18, 8], position: [0.13, 0.36, 0.03], rotation: [0, 0, -0.4], material: 'base' },
      { shape: 'cylinder', args: [0.012, 0.012, 0.34, 6], position: [0.18, 0.46, 0.05], rotation: [0, 0, -0.1], material: 'accent' },
      { shape: 'sphere', args: [0.03, 8, 8], position: [0.19, 0.63, 0.06], material: 'accent' },
      { shape: 'box', args: [0.22, 0.36, 0.02], position: [0, 0.2, -0.13], rotation: [0.12, 0, 0], material: 'accent' },
    ],
    // Crowned king: robe, crown with cross, sword, cape
    king: [
      { shape: 'cone', args: [0.2, 0.44, 16], position: [0, 0.06, 0], material: 'base' },
      { shape: 'cylinder', args: [0.14, 0.17, 0.18, 14], position: [0, 0.34, 0], material: 'base' },
      { shape: 'sphere', args: [0.1, 16, 12], position: [0, 0.47, 0], material: 'base' },
      { shape: 'cylinder', args: [0.1, 0.1, 0.06, 14], position: [0, 0.55, 0], material: 'accent' },
      { shape: 'box', args: [0.02, 0.1, 0.02], position: [0, 0.63, 0], material: 'accent' },
      { shape: 'box', args: [0.06, 0.02, 0.02], position: [0, 0.61, 0], material: 'accent' },
      { shape: 'cylinder', args: [0.03, 0.03, 0.2, 8], position: [-0.15, 0.35, 0], rotation: [0, 0, 0.5], material: 'base' },
      { shape: 'cylinder', args: [0.03, 0.03, 0.2, 8], position: [0.14, 0.37, 0.03], rotation: [0, 0, -0.4], material: 'base' },
      { shape: 'box', args: [0.025, 0.4, 0.025], position: [0.2, 0.5, 0.05], rotation: [0, 0, -0.15], material: 'accent' },
      { shape: 'box', args: [0.06, 0.03, 0.03], position: [0.19, 0.34, 0.05], rotation: [0, 0, -0.15], material: 'accent' },
      { shape: 'box', args: [0.26, 0.4, 0.02], position: [0, 0.22, -0.15], rotation: [0.1, 0, 0], material: 'accent' },
    ],
  },

  fantasy: {
    // Goblin grunt: hunched body, ears, dagger
    pawn: [
      { shape: 'cone', args: [0.14, 0.3, 10], position: [0, 0, 0], material: 'base' },
      { shape: 'sphere', args: [0.09, 12, 10], position: [0, 0.2, 0], material: 'base' },
      { shape: 'cone', args: [0.02, 0.06, 6], position: [-0.08, 0.26, 0], rotation: [0, 0, 0.6], material: 'accent' },
      { shape: 'cone', args: [0.02, 0.06, 6], position: [0.08, 0.26, 0], rotation: [0, 0, -0.6], material: 'accent' },
      { shape: 'cylinder', args: [0.025, 0.025, 0.16, 8], position: [-0.12, 0.1, 0], rotation: [0, 0, 0.5], material: 'base' },
      { shape: 'cylinder', args: [0.025, 0.025, 0.16, 8], position: [0.12, 0.1, 0], rotation: [0, 0, -0.5], material: 'base' },
      { shape: 'box', args: [0.015, 0.14, 0.015], position: [0.16, 0.14, 0.04], rotation: [0, 0, -0.3], material: 'accent' },
    ],
    rook: [
      { shape: 'cylinder', args: [0.22, 0.26, 0.34, 12], position: [0, 0.02, 0], material: 'base' },
      { shape: 'box', args: [0.16, 0.16, 0.16], position: [0, 0.28, 0], rotation: [0, Math.PI / 4, 0], material: 'accent' },
    ],
    knight: [
      { shape: 'cylinder', args: [0.16, 0.2, 0.28, 16], position: [0, 0.02, 0], material: 'base' },
      { shape: 'box', args: [0.14, 0.16, 0.26], position: [0, 0.2, 0.05], rotation: [0.4, 0, 0], material: 'base' },
      { shape: 'cone', args: [0.04, 0.12, 8], position: [0.06, 0.34, 0.02], rotation: [0, 0, -0.3], material: 'accent' },
      { shape: 'cone', args: [0.04, 0.12, 8], position: [-0.06, 0.34, 0.02], rotation: [0, 0, 0.3], material: 'accent' },
    ],
    // Wizard: robe, brimmed hat, beard, staff with orb, cape
    bishop: [
      { shape: 'cone', args: [0.17, 0.42, 14], position: [0, 0.06, 0], material: 'base' },
      { shape: 'sphere', args: [0.095, 14, 10], position: [0, 0.3, 0], material: 'base' },
      { shape: 'cone', args: [0.05, 0.12, 8], position: [0, 0.24, 0], rotation: [Math.PI, 0, 0], material: 'accent' },
      { shape: 'cylinder', args: [0.2, 0.2, 0.02, 14], position: [0, 0.4, 0], material: 'accent' },
      { shape: 'cone', args: [0.11, 0.3, 12], position: [0, 0.58, 0], material: 'base' },
      { shape: 'cylinder', args: [0.028, 0.028, 0.18, 8], position: [-0.14, 0.2, 0], rotation: [0, 0, 0.5], material: 'base' },
      { shape: 'cylinder', args: [0.028, 0.028, 0.18, 8], position: [0.13, 0.22, 0.05], rotation: [0, 0, -0.3], material: 'base' },
      { shape: 'cylinder', args: [0.014, 0.014, 0.5, 6], position: [0.19, 0.36, 0.08], rotation: [0, 0, -0.15], material: 'accent' },
      { shape: 'sphere', args: [0.04, 10, 10], position: [0.215, 0.62, 0.09], material: 'accent' },
      { shape: 'box', args: [0.19, 0.32, 0.02], position: [0, 0.16, -0.12], rotation: [0.15, 0, 0], material: 'accent' },
    ],
    // Sorceress: gown, halo, wings, wand, cape
    queen: [
      { shape: 'cone', args: [0.18, 0.4, 14], position: [0, 0.05, 0], material: 'base' },
      { shape: 'cylinder', args: [0.11, 0.14, 0.16, 12], position: [0, 0.3, 0], material: 'base' },
      { shape: 'sphere', args: [0.09, 14, 10], position: [0, 0.42, 0], material: 'base' },
      { shape: 'torus', args: [0.09, 0.02, 8, 16], position: [0, 0.54, 0], rotation: [Math.PI / 2, 0, 0], material: 'accent' },
      { shape: 'box', args: [0.02, 0.2, 0.14], position: [-0.14, 0.32, -0.06], rotation: [0, 0.4, 0], material: 'accent' },
      { shape: 'box', args: [0.02, 0.2, 0.14], position: [0.14, 0.32, -0.06], rotation: [0, -0.4, 0], material: 'accent' },
      { shape: 'cylinder', args: [0.026, 0.026, 0.17, 8], position: [-0.13, 0.32, 0], rotation: [0, 0, 0.5], material: 'base' },
      { shape: 'cylinder', args: [0.026, 0.026, 0.17, 8], position: [0.12, 0.34, 0.03], rotation: [0, 0, -0.4], material: 'base' },
      { shape: 'cylinder', args: [0.012, 0.012, 0.3, 6], position: [0.17, 0.44, 0.05], rotation: [0, 0, -0.1], material: 'accent' },
      { shape: 'sphere', args: [0.03, 8, 8], position: [0.18, 0.59, 0.06], material: 'accent' },
      { shape: 'box', args: [0.2, 0.34, 0.02], position: [0, 0.2, -0.13], rotation: [0.12, 0, 0], material: 'accent' },
    ],
    // Warrior king: robe, horned crown, sword, cape
    king: [
      { shape: 'cone', args: [0.19, 0.42, 14], position: [0, 0.06, 0], material: 'base' },
      { shape: 'cylinder', args: [0.13, 0.16, 0.18, 12], position: [0, 0.32, 0], material: 'base' },
      { shape: 'sphere', args: [0.095, 14, 10], position: [0, 0.45, 0], material: 'base' },
      { shape: 'cylinder', args: [0.095, 0.095, 0.05, 12], position: [0, 0.52, 0], material: 'accent' },
      { shape: 'cone', args: [0.03, 0.12, 8], position: [-0.07, 0.58, 0], rotation: [0, 0, 0.4], material: 'accent' },
      { shape: 'cone', args: [0.03, 0.12, 8], position: [0.07, 0.58, 0], rotation: [0, 0, -0.4], material: 'accent' },
      { shape: 'cylinder', args: [0.03, 0.03, 0.19, 8], position: [-0.14, 0.33, 0], rotation: [0, 0, 0.5], material: 'base' },
      { shape: 'cylinder', args: [0.03, 0.03, 0.19, 8], position: [0.13, 0.35, 0.03], rotation: [0, 0, -0.4], material: 'base' },
      { shape: 'box', args: [0.024, 0.36, 0.024], position: [0.19, 0.48, 0.05], rotation: [0, 0, -0.15], material: 'accent' },
      { shape: 'box', args: [0.24, 0.38, 0.02], position: [0, 0.22, -0.14], rotation: [0.1, 0, 0], material: 'accent' },
    ],
  },

  scifi: {
    // Trooper: armored torso, visor, rifle, antenna
    pawn: [
      { shape: 'box', args: [0.2, 0.28, 0.14], position: [0, 0.06, 0], material: 'base' },
      { shape: 'sphere', args: [0.09, 14, 10], position: [0, 0.26, 0], material: 'base' },
      { shape: 'box', args: [0.1, 0.04, 0.02], position: [0, 0.26, 0.09], material: 'accent' },
      { shape: 'cylinder', args: [0.03, 0.03, 0.18, 8], position: [-0.13, 0.1, 0], rotation: [0, 0, 0.4], material: 'base' },
      { shape: 'cylinder', args: [0.03, 0.03, 0.18, 8], position: [0.12, 0.12, 0.05], rotation: [0, 0, -0.2], material: 'base' },
      { shape: 'box', args: [0.02, 0.22, 0.02], position: [0.16, 0.14, 0.09], rotation: [0, 0, -0.2], material: 'accent' },
      { shape: 'cylinder', args: [0.008, 0.008, 0.12, 6], position: [0.06, 0.36, 0], material: 'accent' },
    ],
    rook: [
      { shape: 'cylinder', args: [0.24, 0.26, 0.22, 20], position: [0, 0, 0], material: 'base' },
      { shape: 'cylinder', args: [0.16, 0.18, 0.16, 20], position: [0, 0.2, 0], material: 'base' },
      { shape: 'torus', args: [0.17, 0.025, 8, 20], position: [0, 0.28, 0], rotation: [Math.PI / 2, 0, 0], material: 'accent' },
      { shape: 'box', args: [0.04, 0.1, 0.04], position: [0, 0.42, 0], material: 'accent' },
    ],
    knight: [
      { shape: 'box', args: [0.14, 0.12, 0.34], position: [0, 0.14, 0], material: 'base' },
      { shape: 'cone', args: [0.07, 0.14, 12], position: [0, 0.14, 0.22], rotation: [Math.PI / 2, 0, 0], material: 'base' },
      { shape: 'box', args: [0.32, 0.03, 0.14], position: [-0.14, 0.1, 0], rotation: [0, 0, 0.15], material: 'accent' },
      { shape: 'box', args: [0.32, 0.03, 0.14], position: [0.14, 0.1, 0], rotation: [0, 0, -0.15], material: 'accent' },
    ],
    // Engineer/psion: robe-tech torso, visor, back panels, energy staff
    bishop: [
      { shape: 'cylinder', args: [0.14, 0.17, 0.32, 14], position: [0, 0.06, 0], material: 'base' },
      { shape: 'sphere', args: [0.095, 14, 10], position: [0, 0.3, 0], material: 'base' },
      { shape: 'box', args: [0.11, 0.03, 0.02], position: [0, 0.3, 0.09], material: 'accent' },
      { shape: 'box', args: [0.02, 0.24, 0.1], position: [-0.13, 0.18, -0.08], rotation: [0, 0.3, 0], material: 'accent' },
      { shape: 'box', args: [0.02, 0.24, 0.1], position: [0.13, 0.18, -0.08], rotation: [0, -0.3, 0], material: 'accent' },
      { shape: 'cylinder', args: [0.028, 0.028, 0.19, 8], position: [-0.14, 0.2, 0], rotation: [0, 0, 0.5], material: 'base' },
      { shape: 'cylinder', args: [0.028, 0.028, 0.19, 8], position: [0.13, 0.22, 0.05], rotation: [0, 0, -0.3], material: 'base' },
      { shape: 'cylinder', args: [0.013, 0.013, 0.5, 6], position: [0.19, 0.36, 0.08], rotation: [0, 0, -0.15], material: 'accent' },
      { shape: 'sphere', args: [0.035, 8, 8], position: [0.215, 0.62, 0.09], material: 'accent' },
    ],
    // Commander: armored torso, visor crest, pauldrons, blade, energy cloak
    queen: [
      { shape: 'cylinder', args: [0.13, 0.16, 0.3, 14], position: [0, 0.06, 0], material: 'base' },
      { shape: 'sphere', args: [0.09, 14, 10], position: [0, 0.3, 0], material: 'base' },
      { shape: 'box', args: [0.14, 0.03, 0.03], position: [0, 0.34, 0.02], material: 'accent' },
      { shape: 'box', args: [0.08, 0.06, 0.1], position: [-0.16, 0.22, 0], material: 'accent' },
      { shape: 'box', args: [0.08, 0.06, 0.1], position: [0.16, 0.22, 0], material: 'accent' },
      { shape: 'cylinder', args: [0.027, 0.027, 0.18, 8], position: [-0.14, 0.18, 0], rotation: [0, 0, 0.5], material: 'base' },
      { shape: 'cylinder', args: [0.027, 0.027, 0.18, 8], position: [0.13, 0.2, 0.03], rotation: [0, 0, -0.4], material: 'base' },
      { shape: 'box', args: [0.02, 0.3, 0.02], position: [0.18, 0.32, 0.05], rotation: [0, 0, -0.15], material: 'accent' },
      { shape: 'box', args: [0.2, 0.3, 0.015], position: [0, 0.18, -0.13], rotation: [0.12, 0, 0], material: 'accent' },
    ],
    // General/mech pilot: bigger torso, visor crest, pauldrons, antenna array, sword, command cloak
    king: [
      { shape: 'cylinder', args: [0.15, 0.18, 0.32, 14], position: [0, 0.08, 0], material: 'base' },
      { shape: 'sphere', args: [0.1, 14, 10], position: [0, 0.32, 0], material: 'base' },
      { shape: 'box', args: [0.16, 0.03, 0.03], position: [0, 0.36, 0.02], material: 'accent' },
      { shape: 'box', args: [0.09, 0.07, 0.11], position: [-0.17, 0.24, 0], material: 'accent' },
      { shape: 'box', args: [0.09, 0.07, 0.11], position: [0.17, 0.24, 0], material: 'accent' },
      { shape: 'cone', args: [0.02, 0.08, 6], position: [-0.05, 0.42, 0], material: 'accent' },
      { shape: 'cone', args: [0.02, 0.08, 6], position: [0.05, 0.42, 0], material: 'accent' },
      { shape: 'cylinder', args: [0.03, 0.03, 0.2, 8], position: [-0.15, 0.2, 0], rotation: [0, 0, 0.5], material: 'base' },
      { shape: 'cylinder', args: [0.03, 0.03, 0.2, 8], position: [0.14, 0.22, 0.03], rotation: [0, 0, -0.4], material: 'base' },
      { shape: 'box', args: [0.024, 0.34, 0.024], position: [0.19, 0.36, 0.05], rotation: [0, 0, -0.15], material: 'accent' },
      { shape: 'box', args: [0.24, 0.34, 0.015], position: [0, 0.2, -0.14], rotation: [0.1, 0, 0], material: 'accent' },
    ],
  },
}

export function getPieceParts(theme: ThemeName, type: PieceType): PiecePart[] {
  return [PEDESTAL, ...PIECE_GEOMETRY[theme][type]]
}

export function getThemeColors(theme: ThemeName, color: PieceColor) {
  return THEME_COLORS[theme][color]
}
