import { useCallback, useEffect, useRef, useState } from 'react'
import { RAINBOW_COLORS } from '../lib/colors'
import { DEFAULT_COLOR, DEFAULT_FONT, DEFAULT_SIZE } from '../lib/constants'
import type { CharStyle } from '../types'

export interface EditorSettings {
  color: string
  font: string
  size: number
  rainbow: boolean
  setColor: (color: string) => void
  setFont: (font: string) => void
  setSize: (size: number) => void
  toggleRainbow: () => void
  /** Style for the next typed character; advances the rainbow cycle when on. */
  resolveStyle: () => CharStyle
}

/**
 * Owns the current drawing settings. State drives the toolbar's active
 * highlights; a synced ref lets the editor's long-lived event handlers read the
 * latest values without stale closures.
 */
export function useEditorSettings(): EditorSettings {
  const [color, setColorState] = useState(DEFAULT_COLOR)
  const [font, setFont] = useState(DEFAULT_FONT)
  const [size, setSize] = useState(DEFAULT_SIZE)
  const [rainbow, setRainbow] = useState(false)

  const ref = useRef({ color, font, size, rainbow })
  useEffect(() => {
    ref.current = { color, font, size, rainbow }
  }, [color, font, size, rainbow])

  const rainbowIndexRef = useRef(0)

  // Picking a specific colour turns rainbow mode off (matches the original).
  const setColor = useCallback((c: string) => {
    setColorState(c)
    setRainbow(false)
  }, [])

  const toggleRainbow = useCallback(() => setRainbow((r) => !r), [])

  const resolveStyle = useCallback((): CharStyle => {
    const s = ref.current
    let color = s.color
    if (s.rainbow) {
      color = RAINBOW_COLORS[rainbowIndexRef.current % RAINBOW_COLORS.length]
      rainbowIndexRef.current++
    }
    return { color, fontFamily: s.font, fontSize: `${s.size}px` }
  }, [])

  return {
    color,
    font,
    size,
    rainbow,
    setColor,
    setFont,
    setSize,
    toggleRainbow,
    resolveStyle,
  }
}
