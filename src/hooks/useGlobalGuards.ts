import { useEffect } from 'react'

/**
 * App-wide guards that keep a toddler (or an accidental gesture) from leaving or
 * disrupting the app: no context menu, no drag-and-drop, no two-finger
 * back/forward swipe, and a confirm prompt before unloading with content.
 */
export function useGlobalGuards(editorRef: React.RefObject<HTMLElement>): void {
  useEffect(() => {
    const onContextMenu = (e: Event) => e.preventDefault()

    const onDrag = (e: Event) => e.preventDefault()

    // Trap history navigation (two-finger swipe back/forward).
    history.pushState(null, '', location.href)
    const onPopState = () => history.pushState(null, '', location.href)

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (editorRef.current && editorRef.current.innerHTML.trim()) {
        e.preventDefault()
        // Required for the prompt to actually show in current browsers.
        e.returnValue = ''
      }
    }

    document.addEventListener('contextmenu', onContextMenu)
    document.addEventListener('dragstart', onDrag)
    document.addEventListener('dragover', onDrag)
    document.addEventListener('drop', onDrag)
    window.addEventListener('popstate', onPopState)
    window.addEventListener('beforeunload', onBeforeUnload)

    return () => {
      document.removeEventListener('contextmenu', onContextMenu)
      document.removeEventListener('dragstart', onDrag)
      document.removeEventListener('dragover', onDrag)
      document.removeEventListener('drop', onDrag)
      window.removeEventListener('popstate', onPopState)
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [editorRef])
}
