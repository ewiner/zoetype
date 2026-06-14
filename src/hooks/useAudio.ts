import { useCallback, useEffect, useRef } from 'react'
import { playTone } from '../lib/audio'

/**
 * Returns a stable `playSound(key)` callback. The AudioContext is created lazily
 * on first use (so it's tied to a user gesture, as browsers require) and reused.
 * `soundEnabled` is read through a ref so the callback never goes stale.
 */
export function useAudio(soundEnabled: boolean): (key: string) => void {
  const enabledRef = useRef(soundEnabled)
  useEffect(() => {
    enabledRef.current = soundEnabled
  }, [soundEnabled])

  const ctxRef = useRef<AudioContext | null>(null)

  return useCallback((key: string) => {
    if (!enabledRef.current) return
    if (!ctxRef.current) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      ctxRef.current = new Ctor()
    }
    if (ctxRef.current.state === 'suspended') void ctxRef.current.resume()
    playTone(ctxRef.current, key)
  }, [])
}
