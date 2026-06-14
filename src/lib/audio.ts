/**
 * Play a short feedback tone for a key. The pitch is derived from the character
 * so typing makes a pleasant, mostly-pentatonic melody; delete gets its own low
 * blip. The AudioContext is owned by the caller (see useAudio).
 */
export function playTone(ctx: AudioContext, key: string): void {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  if (key === '_delete') {
    osc.frequency.value = 220
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.15)
    return
  }

  const pentatonic = [0, 2, 4, 7, 9]
  let offset = 0
  if (key.length === 1) {
    offset = key.toLowerCase().charCodeAt(0) % 15
  } else {
    offset = Math.floor(Math.random() * 10)
  }
  const baseFreq = 523.25
  const semitones = pentatonic[offset % 5] + Math.floor(offset / 5) * 12
  const freq = baseFreq * Math.pow(2, semitones / 12)

  osc.frequency.value = freq
  osc.type = 'triangle'
  gain.gain.setValueAtTime(0.2, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)

  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + 0.25)
}
