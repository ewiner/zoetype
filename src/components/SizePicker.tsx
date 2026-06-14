import type { SizeDef } from '../types'

interface Props {
  sizes: SizeDef[]
  currentSize: number
  onSelectSize: (size: number) => void
}

export function SizePicker({ sizes, currentSize, onSelectSize }: Props) {
  return (
    <>
      {sizes.map((s) => (
        <button
          key={s.value}
          className={'size-btn' + (s.value === currentSize ? ' active' : '')}
          style={{ fontSize: `${s.previewPx}px` }}
          data-size={s.value}
          onClick={() => onSelectSize(s.value)}
        >
          A
        </button>
      ))}
    </>
  )
}
