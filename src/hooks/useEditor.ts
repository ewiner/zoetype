import { useCallback, useEffect, useRef } from 'react'
import {
  deleteBackward as deleteBackwardDom,
  handleBeforeInput,
  handleKeydown,
  handlePaste,
  insertEmoji as insertEmojiDom,
  insertLineBreak as insertLineBreakDom,
  placeCaretAtPoint as placeCaretAtPointDom,
  scrollCaretIntoView,
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
  /** Type one styled character at the caret (on-screen keyboard letters / space). */
  typeChar: (char: string) => void
  /** Insert a line break at the caret (on-screen keyboard Enter). */
  lineBreak: () => void
  /** Delete the character before the caret (on-screen keyboard Backspace). */
  deleteBackward: () => void
  placeCaretAtPoint: (x: number, y: number) => void
}

export interface UseEditorOptions {
  resolveStyle: () => CharStyle
  /** Called after any content mutation so the caller can debounce a save. */
  onContentChange: () => void
  playSound: (key: string) => void
  /** Called when the editor surface is clicked (used to close open panels). */
  onEditorClick: () => void
  /**
   * Touch device: the editor is non-editable (no native keyboard), so a tap
   * should place the caret programmatically for the on-screen keyboard.
   */
  coarse?: boolean
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

  const typeChar = useCallback((char: string) => {
    const el = editorRef.current
    if (!el) return
    // Reuses the same DOM routine as emoji insertion (styled, animated span at
    // the caret) but plays the per-letter pitch keyed on the character itself.
    insertEmojiDom(el, char, optsRef.current.resolveStyle())
    optsRef.current.playSound(char)
    scrollCaretIntoView(el)
    optsRef.current.onContentChange()
  }, [])

  const lineBreak = useCallback(() => {
    const el = editorRef.current
    if (!el) return
    el.focus()
    insertLineBreakDom(el)
    optsRef.current.playSound('Enter')
    scrollCaretIntoView(el)
    optsRef.current.onContentChange()
  }, [])

  const deleteBackward = useCallback(() => {
    const el = editorRef.current
    if (!el) return
    deleteBackwardDom(el)
    optsRef.current.playSound('_delete')
    scrollCaretIntoView(el)
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
    const onClick = (e: MouseEvent) => {
      // On touch the editor is non-editable, so place the caret ourselves where
      // the user tapped (a non-editable div won't summon the native keyboard).
      if (optsRef.current.coarse) placeCaretAtPointDom(editor, e.clientX, e.clientY)
      optsRef.current.onEditorClick()
    }

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

  return {
    editorRef,
    setContent,
    getContent,
    focus,
    insertEmoji,
    typeChar,
    lineBreak,
    deleteBackward,
    placeCaretAtPoint,
  }
}
