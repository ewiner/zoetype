import type { ThemeDef } from '../types'

interface Props {
  open: boolean
  themes: ThemeDef[]
  currentThemeIndex: number
  onSelect: (index: number) => void
}

export function ThemePanel({ open, themes, currentThemeIndex, onSelect }: Props) {
  return (
    <div id="theme-panel" className={open ? 'open' : ''}>
      <div id="theme-grid">
        {themes.map((t, i) => (
          <button
            key={t.cls}
            className={'theme-card ' + t.preview + (i === currentThemeIndex ? ' active' : '')}
            onClick={() => onSelect(i)}
          >
            A<span className="theme-card-label">{`${t.icon} ${t.name}`}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
