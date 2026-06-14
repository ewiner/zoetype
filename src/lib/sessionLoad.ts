import type { Page } from '../types'
import { SESSION_TIMEOUT_MS, STORAGE_LAST_ACTIVE, STORAGE_PAGES } from './constants'

/** True if the HTML has no visible text content. */
export function isBlankContent(html: string | null | undefined): boolean {
  if (!html) return true
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return !tmp.textContent?.trim()
}

export interface InitialState {
  pages: Page[]
  currentPage: number
}

/**
 * Decide which pages to load and which page to open on.
 *
 * If it's been more than SESSION_TIMEOUT_MS since the app was last used, open on
 * a fresh blank page instead of dropping the child back into whatever was on
 * screen last time. Previous pages are kept and still reachable via ◀ / ▶.
 *
 * `now` is injected so this is pure and unit-testable.
 */
export function loadInitialPages(now: number): InitialState {
  let pages: Page[] = [{ content: '' }]
  try {
    const saved = localStorage.getItem(STORAGE_PAGES)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) pages = parsed
    }
  } catch {
    /* ignore corrupt data */
  }

  const lastActive = parseInt(localStorage.getItem(STORAGE_LAST_ACTIVE) ?? '', 10)
  const stale = isNaN(lastActive) || now - lastActive > SESSION_TIMEOUT_MS

  let currentPage: number
  if (stale) {
    // Start fresh — but reuse a trailing blank page if one's already there, so
    // empties don't pile up across sessions.
    if (!isBlankContent(pages[pages.length - 1].content)) pages.push({ content: '' })
    currentPage = pages.length - 1
  } else {
    currentPage = 0
  }

  return { pages, currentPage }
}

/** Record "now" as the last-active timestamp. */
export function markActive(): void {
  try {
    localStorage.setItem(STORAGE_LAST_ACTIVE, String(Date.now()))
  } catch {
    /* storage full, ignore */
  }
}

/** Persist pages to localStorage and bump the last-active timestamp. */
export function persistPages(pages: Page[]): void {
  try {
    localStorage.setItem(STORAGE_PAGES, JSON.stringify(pages))
  } catch {
    /* storage full, ignore */
  }
  markActive()
}
