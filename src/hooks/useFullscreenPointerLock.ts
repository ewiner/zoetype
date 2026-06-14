import { useCallback, useEffect, useRef } from 'react'
import { CURSOR_SENSITIVITY, RELOCK_COOLDOWN_MS } from '../lib/constants'

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

export interface UseFullscreenPointerLockOptions {
  editorRef: React.RefObject<HTMLDivElement>
  cursorRef: React.RefObject<HTMLDivElement>
  placeCaretAtPoint: (x: number, y: number) => void
  focusEditor: () => void
  closePanels: () => void
  /** Drives the "tap to go full screen" overlay. */
  setShowPrompt: (show: boolean) => void
}

export interface FullscreenControls {
  enterLockedFullscreen: () => void
  toggleFullscreen: () => void
  confirmExit: () => void
}

/**
 * The toddler-proofing system. In fullscreen we lock the real OS pointer (so it
 * can't reach the menu bar, dock, hot corners, or trigger swipe-to-switch) and
 * draw our OWN cursor that moves with the trackpad's OS-accelerated deltas — so
 * it feels native, but is fully contained inside the app.
 *
 * This is almost entirely imperative by necessity and is the highest-risk part
 * of the app to change. Pointer Lock + Fullscreen cannot be exercised by test
 * tooling, so behavioural changes here must be hand-validated in a real browser.
 */
export function useFullscreenPointerLock(
  opts: UseFullscreenPointerLockOptions,
): FullscreenControls {
  const optsRef = useRef(opts)
  useEffect(() => {
    optsRef.current = opts
  })

  const st = useRef({
    vx: window.innerWidth / 2,
    vy: window.innerHeight / 2,
    pointerLocked: false,
    hasEnteredFullscreen: false,
    lastLockAttempt: 0,
    cursorPlaced: false, // false until the cursor has been positioned once
    hoverEl: null as Element | null,
    pressBtn: null as HTMLButtonElement | null,
    hoverScheduled: false,
  })

  const renderCursor = useCallback(() => {
    const el = optsRef.current.cursorRef.current
    // Arrow tip sits a few px in from the SVG's top-left corner.
    if (el) el.style.transform = `translate3d(${st.current.vx - 3}px,${st.current.vy - 2}px,0)`
  }, [])

  const clearHover = useCallback(() => {
    if (st.current.hoverEl) {
      st.current.hoverEl.classList.remove('vc-hover')
      st.current.hoverEl = null
    }
  }, [])

  const requestLock = useCallback(() => {
    const el = document.documentElement
    if (!el.requestPointerLock) return
    try {
      const p = el.requestPointerLock() as unknown as Promise<void> | undefined
      if (p && typeof p.catch === 'function') p.catch(() => {})
    } catch {
      /* swallow; auto-heal will retry */
    }
  }, [])

  // Auto-heal: if we're in fullscreen but lost the lock (e.g. a stray Esc), grab
  // it again on the next interaction — respecting Chrome's re-lock cooldown.
  const maybeRelock = useCallback(() => {
    const s = st.current
    if (!s.hasEnteredFullscreen) return
    if (!document.fullscreenElement) return // the big prompt covers this case
    if (document.pointerLockElement) return
    const now = Date.now()
    if (now - s.lastLockAttempt < RELOCK_COOLDOWN_MS) return
    s.lastLockAttempt = now
    requestLock()
  }, [requestLock])

  const updatePrompt = useCallback(() => {
    optsRef.current.setShowPrompt(st.current.hasEnteredFullscreen && !document.fullscreenElement)
  }, [])

  const enterLockedFullscreen = useCallback(() => {
    st.current.hasEnteredFullscreen = true
    const el = document.documentElement
    if (!document.fullscreenElement) {
      try {
        const fp = el.requestFullscreen ? el.requestFullscreen() : null
        if (fp && fp.catch) fp.catch(() => {})
      } catch {
        /* ignore */
      }
    }
    // Request the lock in the SAME user gesture (canonical Chrome pattern — most
    // reliable). The fullscreenchange handler and maybeRelock() are backups.
    requestLock()
  }, [requestLock])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) enterLockedFullscreen()
    else document.exitFullscreen().catch(() => {})
  }, [enterLockedFullscreen])

  // Deliberate opt-out: stop nagging and stay in the normal windowed view. The
  // ⛶ toolbar button re-enters locked fullscreen whenever you want it back.
  const confirmExit = useCallback(() => {
    st.current.hasEnteredFullscreen = false
    updatePrompt()
  }, [updatePrompt])

  useEffect(() => {
    const buttonAt = (x: number, y: number): HTMLButtonElement | null => {
      const el = document.elementFromPoint(x, y)
      return el ? (el.closest('button') as HTMLButtonElement | null) : null
    }
    const isEditorAt = (x: number, y: number): boolean => {
      const editor = optsRef.current.editorRef.current
      const el = document.elementFromPoint(x, y)
      return !!el && !!editor && (el === editor || editor.contains(el))
    }

    const refreshHover = () => {
      st.current.hoverScheduled = false
      const btn = buttonAt(st.current.vx, st.current.vy)
      if (btn !== st.current.hoverEl) {
        if (st.current.hoverEl) st.current.hoverEl.classList.remove('vc-hover')
        st.current.hoverEl = btn
        if (st.current.hoverEl) st.current.hoverEl.classList.add('vc-hover')
      }
    }

    const onPointerLockChange = () => {
      const locked = !!document.pointerLockElement
      st.current.pointerLocked = locked
      document.body.classList.toggle('locked', locked)
      const cur = optsRef.current.cursorRef.current
      if (cur) cur.style.display = locked ? 'block' : 'none'
      if (locked) {
        // Center on the first lock for a predictable start; on later re-locks
        // (e.g. after a stray Esc) keep the last position unless it has drifted.
        const s = st.current
        const offscreen =
          s.vx < 0 || s.vy < 0 || s.vx > window.innerWidth || s.vy > window.innerHeight
        if (!s.cursorPlaced || offscreen) {
          s.vx = window.innerWidth / 2
          s.vy = window.innerHeight / 2
          s.cursorPlaced = true
        }
        renderCursor()
        optsRef.current.focusEditor()
      } else {
        clearHover()
      }
    }

    const onFullscreenChange = () => {
      if (document.fullscreenElement) {
        requestLock() // grab the pointer as soon as we're fullscreen
      } else if (document.pointerLockElement) {
        document.exitPointerLock()
      }
      updatePrompt()
    }

    const onPointerLockError = () => {
      /* swallow; auto-heal will retry */
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!st.current.pointerLocked) return
      const s = st.current
      s.vx = clamp(s.vx + e.movementX * CURSOR_SENSITIVITY, 0, window.innerWidth - 1)
      s.vy = clamp(s.vy + e.movementY * CURSOR_SENSITIVITY, 0, window.innerHeight - 1)
      renderCursor() // cheap (compositor transform), do every event
      if (!s.hoverScheduled) {
        s.hoverScheduled = true
        requestAnimationFrame(refreshHover)
      }
    }

    // Trusted events only; .click() below is synthetic so it passes the swallow.
    const onMouseDown = (e: MouseEvent) => {
      maybeRelock()
      if (!st.current.pointerLocked) return
      e.preventDefault()
      e.stopPropagation()
      optsRef.current.cursorRef.current?.classList.add('pressing')
      const btn = buttonAt(st.current.vx, st.current.vy)
      if (btn) {
        st.current.pressBtn = btn
        btn.classList.add('vc-press')
      } else {
        st.current.pressBtn = null
        if (isEditorAt(st.current.vx, st.current.vy)) {
          optsRef.current.placeCaretAtPoint(st.current.vx, st.current.vy)
          optsRef.current.closePanels()
        }
      }
    }

    const onMouseUp = (e: MouseEvent) => {
      if (!st.current.pointerLocked) return
      e.preventDefault()
      e.stopPropagation()
      optsRef.current.cursorRef.current?.classList.remove('pressing')
      if (st.current.pressBtn) {
        st.current.pressBtn.classList.remove('vc-press')
        // synthetic → passes the swallow filter; fires the button's onClick
        if (buttonAt(st.current.vx, st.current.vy) === st.current.pressBtn) {
          st.current.pressBtn.click()
        }
        st.current.pressBtn = null
      }
    }

    // Swallow the real (trusted) click + dblclick that pointer lock fires at the
    // lock origin, so they can't activate whatever sits under the screen center
    // or select a random word. Our synthetic .click() (isTrusted=false) passes.
    const onClickSwallow = (e: MouseEvent) => {
      if (st.current.pointerLocked && e.isTrusted) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault()
        return
      } // block pinch / ctrl+wheel zoom
      if (st.current.pointerLocked) {
        const editor = optsRef.current.editorRef.current
        if (editor) editor.scrollTop += e.deltaY // two-finger scroll → scroll the page
        e.preventDefault()
      }
    }

    const onKeydownRelock = () => maybeRelock()

    const onResize = () => {
      st.current.vx = clamp(st.current.vx, 0, window.innerWidth - 1)
      st.current.vy = clamp(st.current.vy, 0, window.innerHeight - 1)
      if (st.current.pointerLocked) renderCursor()
    }

    document.addEventListener('pointerlockchange', onPointerLockChange)
    document.addEventListener('pointerlockerror', onPointerLockError)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mousedown', onMouseDown, true)
    document.addEventListener('mouseup', onMouseUp, true)
    document.addEventListener('click', onClickSwallow, true)
    document.addEventListener('dblclick', onClickSwallow, true)
    document.addEventListener('wheel', onWheel, { passive: false })
    document.addEventListener('keydown', onKeydownRelock, true)
    window.addEventListener('resize', onResize)

    return () => {
      document.removeEventListener('pointerlockchange', onPointerLockChange)
      document.removeEventListener('pointerlockerror', onPointerLockError)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mousedown', onMouseDown, true)
      document.removeEventListener('mouseup', onMouseUp, true)
      document.removeEventListener('click', onClickSwallow, true)
      document.removeEventListener('dblclick', onClickSwallow, true)
      document.removeEventListener('wheel', onWheel)
      document.removeEventListener('keydown', onKeydownRelock, true)
      window.removeEventListener('resize', onResize)
    }
  }, [requestLock, maybeRelock, renderCursor, clearHover, updatePrompt])

  return { enterLockedFullscreen, toggleFullscreen, confirmExit }
}
