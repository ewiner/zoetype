import { beforeEach, describe, expect, it } from 'vitest'
import { SESSION_TIMEOUT_MS, STORAGE_LAST_ACTIVE, STORAGE_PAGES } from './constants'
import { isBlankContent, loadInitialPages } from './sessionLoad'

const NOW = 1_700_000_000_000

function seed(pages: unknown, lastActive?: number): void {
  localStorage.setItem(STORAGE_PAGES, JSON.stringify(pages))
  if (lastActive !== undefined) localStorage.setItem(STORAGE_LAST_ACTIVE, String(lastActive))
}

describe('isBlankContent', () => {
  it.each([
    ['', true],
    [null, true],
    ['<br>', true],
    ['<span> </span>', true],
    ['<span>a</span>', false],
    ['hello', false],
  ])('isBlankContent(%j) === %s', (html, expected) => {
    expect(isBlankContent(html as string | null)).toBe(expected)
  })
})

describe('loadInitialPages', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns a single blank page when nothing is stored', () => {
    const { pages, currentPage } = loadInitialPages(NOW)
    expect(pages).toEqual([{ content: '' }])
    expect(currentPage).toBe(0)
  })

  it('opens on page 0 for a fresh session (used recently)', () => {
    seed([{ content: '<span>hi</span>' }, { content: '' }], NOW - 1000)
    const { pages, currentPage } = loadInitialPages(NOW)
    expect(pages).toHaveLength(2)
    expect(currentPage).toBe(0)
  })

  it('appends a fresh blank page when stale and the last page has content', () => {
    seed([{ content: '<span>hi</span>' }], NOW - (SESSION_TIMEOUT_MS + 1000))
    const { pages, currentPage } = loadInitialPages(NOW)
    expect(pages).toHaveLength(2)
    expect(pages[1]).toEqual({ content: '' })
    expect(currentPage).toBe(1)
  })

  it('reuses a trailing blank page when stale instead of piling up empties', () => {
    seed([{ content: '<span>hi</span>' }, { content: '' }], NOW - (SESSION_TIMEOUT_MS + 1000))
    const { pages, currentPage } = loadInitialPages(NOW)
    expect(pages).toHaveLength(2)
    expect(currentPage).toBe(1)
  })

  it('treats missing last-active as stale', () => {
    localStorage.setItem(STORAGE_PAGES, JSON.stringify([{ content: '<span>hi</span>' }]))
    const { pages, currentPage } = loadInitialPages(NOW)
    expect(pages).toHaveLength(2)
    expect(currentPage).toBe(1)
  })

  it('falls back to a default page on corrupt JSON', () => {
    localStorage.setItem(STORAGE_PAGES, 'not-json{')
    const { pages, currentPage } = loadInitialPages(NOW)
    expect(pages).toEqual([{ content: '' }])
    expect(currentPage).toBe(0)
  })

  it('ignores a non-array payload', () => {
    localStorage.setItem(STORAGE_PAGES, JSON.stringify({ nope: true }))
    const { pages } = loadInitialPages(NOW)
    expect(pages).toEqual([{ content: '' }])
  })
})
