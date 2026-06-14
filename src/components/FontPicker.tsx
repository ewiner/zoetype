import type { FontDef } from '../types'

interface Props {
  fonts: FontDef[]
  currentFont: string
  onSelectFont: (family: string) => void
}

export function FontPicker({ fonts, currentFont, onSelectFont }: Props) {
  return (
    <>
      {fonts.map((f) => (
        <button
          key={f.label}
          className={'font-btn' + (f.family === currentFont ? ' active' : '')}
          style={{ fontFamily: f.family }}
          data-font={f.family}
          onClick={() => onSelectFont(f.family)}
        >
          {f.label}
        </button>
      ))}
    </>
  )
}
