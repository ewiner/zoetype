import { Fragment, useEffect, useState } from 'react'

interface Props {
  open: boolean
  categories: Record<string, string[]>
  /** Current toolbar height, used to size the panel so it fits without scrolling. */
  toolbarHeight: number
  onPick: (emoji: string) => void
}

/**
 * How many emoji to show per category so the whole panel fits on screen without
 * scrolling. Ported from the original `buildEmojiPanel` sizing math.
 */
function computeMaxEmoji(toolbarHeight: number, categoryCount: number): number {
  const panelWidth = window.innerWidth - 24 // padding
  const emojiW = 50 // item width + gap
  const emojisPerRow = Math.floor(panelWidth / emojiW)

  const availableH = window.innerHeight - toolbarHeight - 40 // 40px breathing room
  const perCategoryBudget = Math.floor(availableH / categoryCount)
  const headerH = 34
  const rowH = 50
  const rowsPerCategory = Math.max(1, Math.floor((perCategoryBudget - headerH) / rowH))
  return rowsPerCategory * emojisPerRow
}

export function EmojiPanel({ open, categories, toolbarHeight, onPick }: Props) {
  const categoryCount = Object.keys(categories).length
  const [maxEmoji, setMaxEmoji] = useState(() => computeMaxEmoji(toolbarHeight, categoryCount))

  useEffect(() => {
    const recompute = () => setMaxEmoji(computeMaxEmoji(toolbarHeight, categoryCount))
    recompute()
    let timer: ReturnType<typeof setTimeout> | null = null
    const onResize = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(recompute, 300)
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      if (timer) clearTimeout(timer)
    }
  }, [toolbarHeight, categoryCount, open])

  return (
    <div id="emoji-panel" className={open ? 'open' : ''}>
      <div id="emoji-grid">
        {Object.entries(categories).map(([label, emojis]) => (
          <Fragment key={label}>
            <div className="emoji-category-label">{label}</div>
            <div className="emoji-category-row">
              {emojis.slice(0, maxEmoji).map((em, i) => (
                <button
                  key={`${em}-${i}`}
                  className="emoji-item"
                  onClick={() => onPick(em)}
                >
                  {em}
                </button>
              ))}
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  )
}
