import { useCallback, useEffect, useRef } from 'react'
import {
  handleBeforeInput,
  handleKeydown,
  handlePaste,
  insertEmoji as insertEmojiDom,
  placeCaretAtPoint as placeCaretAtPointDom,
  wrapNakedSpaceNode,
  type EditorDeps,
} from '../lib/editorDom'
import type { CharStyle } from '../types'

export interface EditorApi {
  editorRef: React.RefObject<HTMLDivElement>
  /** Replace the editor's content (page switch / load). Does not fire `onChange`. */
  setContent: (html: string) => void
  getContent: () => string
  focus: () => void
  insertEmoji: (emoji: string) => void
  placeCaretAtPoint: (x: number, y: number) => void
}

export interface UseEditorOptions {
  resolveStyle: () => CharStyle
  /** Called after any content mutation so the caller can debounce a save. */
  onContentChange: () => void
  playSound: (key: string) => void
  /** Called when the editor surface is clicked (used to close open panels). */
  onEditorClick: () => void
}

/**
 * Imperative controller for the contenteditable editor.
 *
 * The editor is UNCONTROLLED: React mounts the `<div contenteditable>` once and
 * never reconciles its children. All mutation happens here through `editorRef`,
 * so the per-letter span DOM (and the caret) is never clobbered by a re-render.
 */
export function useEditor(opts: UseEditorOptions): EditorApi {
  const editorRef = useRef<HTMLDivElement>(null)

  // Mirror opts so the mount-once listeners always read the latest callbacks.
  const optsRef = useRef(opts)
  useEffect(() => {
    optsRef.current = opts
  })

  const setContent = useCallback((html: string) => {
    if (editorRef.current) editorRef.current.innerHTML = html
  }, [])

  const getContent = useCallback(() => editorRef.current?.innerHTML ?? '', [])

  const focus = useCallback(() => editorRef.current?.focus(), [])

  const insertEmoji = useCallback((emoji: string) => {
    if (!editorRef.current) return
    insertEmojiDom(editorRef.current, emoji, optsRef.current.resolveStyle())
    optsRef.current.playSound(emoji)
    optsRef.current.onContentChange()
  }, [])

  const placeCaretAtPoint = useCallback((x: number, y: number) => {
    if (editorRef.current) placeCaretAtPointDom(editorRef.current, x, y)
  }, [])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    const deps = (): EditorDeps => ({
      editor,
      resolveStyle: optsRef.current.resolveStyle,
      onChange: optsRef.current.onContentChange,
      playSound: optsRef.current.playSound,
    })

    const onBeforeInput = (e: Event) => handleBeforeInput(e as InputEvent, deps())
    const onKeydown = (e: KeyboardEvent) => handleKeydown(e, deps())
    const onPaste = (e: ClipboardEvent) => handlePaste(e, deps())
    const onInput = () => optsRef.current.onContentChange()
    const onClick = () => optsRef.current.onEditorClick()

    editor.addEventListener('beforeinput', onBeforeInput)
    editor.addEventListener('keydown', onKeydown)
    editor.addEventListener('paste', onPaste)
    editor.addEventListener('input', onInput)
    editor.addEventListener('click', onClick)

    // Fallback: some browsers insert a naked whitespace text node instead of
    // routing through beforeinput. Wrap those so the one-span-per-char invariant
    // holds (added nodes from our own inserts are elements, so they're skipped).
    const observer = new MutationObserver((mutations) => {
      for (const mut of mutations) {
        if (mut.type !== 'childList') continue
        for (const node of mut.addedNodes) {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node as Text
            const value = text.textContent ?? ''
            if (value.trim() === '' && value.includes(' ')) {
              wrapNakedSpaceNode(text, deps())
            }
          }
        }
      }
    })
    observer.observe(editor, { childList: true, subtree: true })

    return () => {
      editor.removeEventListener('beforeinput', onBeforeInput)
      editor.removeEventListener('keydown', onKeydown)
      editor.removeEventListener('paste', onPaste)
      editor.removeEventListener('input', onInput)
      editor.removeEventListener('click', onClick)
      observer.disconnect()
    }
  }, [])

  return { editorRef, setContent, getContent, focus, insertEmoji, placeCaretAtPoint }
}
