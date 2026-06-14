import type { SizeDef } from '../types'

// ===== localStorage keys =====
export const STORAGE_PAGES = 'zoetype-pages'
export const STORAGE_LAST_ACTIVE = 'zoetype-last-active'

// ===== Session / save timing =====
/** Reopen on a fresh blank page if idle longer than this. */
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000
/** Debounce window for persisting editor content. */
export const SAVE_DEBOUNCE_MS = 400

// ===== Editor defaults =====
export const DEFAULT_COLOR = '#FF6B6B'
export const DEFAULT_FONT = "'Bubblegum Sans', cursive"
export const DEFAULT_SIZE = 72 // px

export const SIZES: SizeDef[] = [
  { value: 48, previewPx: 12 },
  { value: 72, previewPx: 17 },
  { value: 96, previewPx: 24 },
]

// ===== Virtual cursor / pointer lock =====
/** 1:1 with macOS pointer speed → native feel. Validated by hand; don't change blindly. */
export const CURSOR_SENSITIVITY = 1.0
/** Chrome enforces a ~1.25s cooldown between pointer-lock requests. */
export const RELOCK_COOLDOWN_MS = 1300
