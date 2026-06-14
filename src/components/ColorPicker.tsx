import type { ColorDef } from '../types'

interface Props {
  colors: ColorDef[]
  currentColor: string
  rainbow: boolean
  onSelectColor: (color: string) => void
  onToggleRainbow: () => void
}

export function ColorPicker({ colors, currentColor, rainbow, onSelectColor, onToggleRainbow }: Props) {
  return (
    <>
      {colors.map((c) => (
        <button
          key={c.value}
          className={'color-btn' + (!rainbow && c.value === currentColor ? ' active' : '')}
          style={{ background: c.value }}
          data-color={c.value}
          title={c.title}
          onClick={() => onSelectColor(c.value)}
        />
      ))}
      <button
        className={'icon-btn rainbow-btn' + (rainbow ? ' active' : '')}
        title="Rainbow mode"
        onClick={onToggleRainbow}
      >
        🌈
      </button>
    </>
  )
}
