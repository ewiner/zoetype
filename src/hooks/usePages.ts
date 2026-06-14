import { useCallback, useEffect, useRef, useState } from 'react'
import { SAVE_DEBOUNCE_MS } from '../lib/constants'
import { loadInitialPages, markActive, persistPages } from '../lib/sessionLoad'
import type { Page } from '../types'

export interface PagesApi {
  pageCount: number
  currentPage: number
  goToPage: (index: number) => void
  newPage: () => void
  deletePage: () => void
  /** Debounced persist of the live editor content into the current page. */
  scheduleSave: () => void
  /** Persist immediately (e.g. before printing). */
  saveNow: () => void
}

export interface UsePagesOptions {
  getContent: () => string
  setContent: (html: string) => void
  focusEditor: () => void
}

/**
 * Owns the pages array and current-page index.
 *
 * Page CONTENT is never rendered by React (the editor is uncontrolled); only the
 * page count and current index drive the dot indicator. The current page's
 * content lives in the editor DOM and is captured on demand via `getContent`.
 */
export function usePages(opts: UsePagesOptions): PagesApi {
  const { getContent, setContent, focusEditor } = opts

  const initial = useRef(loadInitialPages(Date.now())).current
  const [pages, setPages] = useState<Page[]>(initial.pages)
  const [currentPage, setCurrentPage] = useState(initial.currentPage)

  const pagesRef = useRef(pages)
  pagesRef.current = pages
  const currentRef = useRef(currentPage)
  currentRef.current = currentPage

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Build a fresh pages array with the current page's live editor content folded in.
  const withCurrentContent = useCallback((): Page[] => {
    const next = pagesRef.current.slice()
    next[currentRef.current] = { content: getContent() }
    return next
  }, [getContent])

  const saveNow = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    persistPages(withCurrentContent())
  }, [withCurrentContent])

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(saveNow, SAVE_DEBOUNCE_MS)
  }, [saveNow])

  const goToPage = useCallback(
    (index: number) => {
      if (index < 0 || index >= pagesRef.current.length) return
      const next = withCurrentContent()
      setPages(next)
      setCurrentPage(index)
      setContent(next[index].content)
      focusEditor()
      persistPages(next)
    },
    [withCurrentContent, setContent, focusEditor],
  )

  const newPage = useCallback(() => {
    const next = withCurrentContent()
    next.push({ content: '' })
    const index = next.length - 1
    setPages(next)
    setCurrentPage(index)
    setContent('')
    focusEditor()
    persistPages(next)
  }, [withCurrentContent, setContent, focusEditor])

  // Delete the current page outright — no confirm (a dialog would be its own
  // footgun on a toddler toy). Deleting the last remaining page leaves a single
  // blank one so we always land somewhere typable.
  const deletePage = useCallback(() => {
    const next = pagesRef.current.slice()
    next.splice(currentRef.current, 1)
    let index = currentRef.current
    if (next.length === 0) {
      next.push({ content: '' })
      index = 0
    } else if (index > next.length - 1) {
      index = next.length - 1
    }
    setPages(next)
    setCurrentPage(index)
    setContent(next[index].content)
    focusEditor()
    persistPages(next)
  }, [setContent, focusEditor])

  // Load the initial page content into the editor once, on mount.
  useEffect(() => {
    setContent(initial.pages[initial.currentPage].content)
    focusEditor()
    markActive()
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    pageCount: pages.length,
    currentPage,
    goToPage,
    newPage,
    deletePage,
    scheduleSave,
    saveNow,
  }
}
