import { THEME_LABELS, type ThemeName } from '../pieceGeometry'

interface ThemeSelectorProps {
  theme: ThemeName
  onChange: (theme: ThemeName) => void
}

export default function ThemeSelector({ theme, onChange }: ThemeSelectorProps) {
  return (
    <div className="theme-selector">
      <span className="theme-selector-label">Piece theme</span>
      <div className="theme-selector-options">
        {(Object.keys(THEME_LABELS) as ThemeName[]).map((name) => (
          <button
            key={name}
            className={`theme-option ${theme === name ? 'active' : ''}`}
            onClick={() => onChange(name)}
          >
            {THEME_LABELS[name]}
          </button>
        ))}
      </div>
    </div>
  )
}
