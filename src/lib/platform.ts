/**
 * Small, pure platform checks. Kept as plain functions (like editorDom.ts) so
 * they're trivially testable and can be called once and cached in App.
 *
 * These describe the *device*, not live state, so callers compute them once
 * (e.g. into useState initializers) rather than per render.
 */

/** Touch / no-hover device — the app's existing signal for "phone or tablet". */
export function isCoarsePointer(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
}

/** iPhone / iPad (incl. iPadOS reporting as desktop Safari). Drives the Guided Access tip. */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/iP(hone|od|ad)/.test(ua) || /iP(hone|od|ad)/.test(navigator.platform)) return true
  // iPadOS 13+ masquerades as macOS Safari but reports touch points.
  return navigator.maxTouchPoints > 1 && /Macintosh/.test(ua)
}

/**
 * Whether the desktop fullscreen + pointer-lock lockdown can run here. iPhone
 * Safari supports neither, so this gates that whole UI. Kept independent of
 * `isCoarsePointer` so an iPad (coarse AND fullscreen-capable) still gets the
 * on-screen keyboard while keeping fullscreen lockdown.
 */
export function fullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false
  return !!document.documentElement.requestFullscreen && !isIOS()
}
