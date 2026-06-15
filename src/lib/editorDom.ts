import type { CharStyle } from '../types'

/**
 * Dependencies the editor event handlers need. Passed in (rather than read from
 * module globals) so every handler is a plain, unit-testable function.
 */
export interface EditorDeps {
  editor: HTMLElement
  /** Returns the style for the next character. Advances rainbow state when on. */
  resolveStyle: () => CharStyle
  /** Called after any mutation so the caller can schedule a save. */
  onChange: () => void
  /** Plays the key/feedback sound for a given key. */
  playSound: (key: string) => void
}

/**
 * Build a styled span for a single character.
 *
 * Each char span is `display:inline-block` (for the pop animation); a lone space
 * inside an inline-block collapses to zero width, so we preserve whitespace with
 * `white-space:pre`. Line wrapping still works because every letter is its own
 * inline-block box.
 */
export function makeCharSpan(char: string, style: CharStyle): HTMLSpanElement {
  const span = document.createElement('span')
  span.textContent = char
  span.style.color = style.color
  span.style.fontFamily = style.fontFamily
  span.style.fontSize = style.fontSize
  span.style.whiteSpace = 'pre'
  span.classList.add('letter-pop')
  return span
}

/**
 * Insert a `<br>` at the caret.
 *
 * We do this manually (rather than via execCommand('insertLineBreak'), which
 * nests the break inside the current character span) so the DOM stays flat: our
 * typing handler always leaves the caret positioned after each character span at
 * the top level.
 */
export function insertLineBreak(editor: HTMLElement): void {
  const sel = window.getSelection()
  if (!sel) return
  // When fired from a button (on-screen keyboard) there may be no caret yet —
  // create one at the end so Enter always works, mirroring insertEmoji's guard.
  if (!sel.rangeCount) {
    const r = document.createRange()
    r.selectNodeContents(editor)
    r.collapse(false)
    sel.removeAllRanges()
    sel.addRange(r)
  }
  const range = sel.getRangeAt(0)
  range.deleteContents()

  // The caret may sit *inside* a character span's text node — this happens
  // whenever it was repositioned via the virtual cursor, since
  // caretRangeFromPoint returns an offset within the span's text node (offset 0
  // = before the letter, offset 1 = after). Inserting the <br> there nests it
  // inside the inline-block span (<span>H<br></span>), which doesn't break the
  // line normally and makes the text appear to split mid-character. Hoist the
  // insertion point out to a boundary between the editor's direct children so
  // the <br> always lands *between* character spans, never inside one.
  if (range.startContainer !== editor) {
    const c = range.startContainer
    const atEnd =
      c.nodeType === Node.TEXT_NODE
        ? range.startOffset >= (c as Text).length
        : range.startOffset >= c.childNodes.length
    // Climb to the node that is a direct child of the editor.
    let node: Node = c
    while (node.parentNode && node.parentNode !== editor) node = node.parentNode
    if (node.parentNode === editor) {
      if (atEnd) range.setStartAfter(node)
      else range.setStartBefore(node)
      range.collapse(true)
    }
  }

  const br = document.createElement('br')
  range.insertNode(br)

  // When the break is inserted at the very end of the content, a single trailing
  // <br> is needed so the new (empty) line actually renders — a lone trailing
  // <br> otherwise collapses visually. Only add it when nothing follows the
  // break; if a trailing pad already exists (e.g. from a previous Enter), reuse
  // it rather than stacking up extra blank lines.
  if (!br.nextSibling) {
    br.parentNode!.appendChild(document.createElement('br'))
  }

  const newRange = document.createRange()
  newRange.setStartAfter(br)
  newRange.collapse(true)
  sel.removeAllRanges()
  sel.addRange(newRange)
}

/** Wrap each typed character in its own styled span (insertText path). */
export function handleBeforeInput(e: InputEvent, deps: EditorDeps): void {
  if (e.inputType !== 'insertText' || !e.data) return
  e.preventDefault()
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return
  const range = sel.getRangeAt(0)
  range.deleteContents()

  for (const char of e.data) {
    const span = makeCharSpan(char, deps.resolveStyle())
    range.insertNode(span)
    range.setStartAfter(span)
    range.collapse(true)
  }

  sel.removeAllRanges()
  sel.addRange(range)
  deps.onChange()
}

/**
 * Keydown guard + special-key handling.
 *
 * - Blocks key repeat (a toddler leaning on a key shouldn't machine-gun input).
 * - Blocks dangerous Cmd/Ctrl shortcuts. Only Cmd/Ctrl+A (select all) is allowed;
 *   Cmd+Z is intentionally NOT allowed — the custom span-based input bypasses the
 *   browser's native undo stack, so undo was a misleading no-op. Dropped outright.
 * - Blocks function keys and Tab (Tab would strand focus on a toolbar button).
 * - Enter inserts a flat line break.
 * - Plays sounds for printable keys and delete.
 */
export function handleKeydown(e: KeyboardEvent, deps: EditorDeps): void {
  if (e.repeat) {
    e.preventDefault()
    return
  }

  if (e.metaKey || e.ctrlKey) {
    const allowed = ['a']
    if (!allowed.includes(e.key.toLowerCase())) {
      e.preventDefault()
      return
    }
  }

  // Block function keys (F1–F12)
  if (e.key.startsWith('F') && e.key.length > 1 && !isNaN(Number(e.key.slice(1)))) {
    e.preventDefault()
    return
  }

  if (e.key === 'Tab') {
    e.preventDefault()
    return
  }

  if (e.key === 'Enter') {
    e.preventDefault()
    insertLineBreak(deps.editor)
    deps.playSound('Enter')
    deps.onChange()
    return
  }

  if (e.key.length === 1) {
    deps.playSound(e.key)
  }
  if (e.key === 'Backspace' || e.key === 'Delete') {
    deps.playSound('_delete')
  }
}

/** Strip formatting on paste; newlines become `<br>`, every other char a styled span. */
export function handlePaste(e: ClipboardEvent, deps: EditorDeps): void {
  e.preventDefault()
  const text = e.clipboardData?.getData('text/plain')
  if (!text) return
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return
  const range = sel.getRangeAt(0)
  range.deleteContents()

  for (const char of text) {
    if (char === '\n') {
      const br = document.createElement('br')
      range.insertNode(br)
      range.setStartAfter(br)
    } else {
      const span = makeCharSpan(char, deps.resolveStyle())
      range.insertNode(span)
      range.setStartAfter(span)
    }
    range.collapse(true)
  }
  sel.removeAllRanges()
  sel.addRange(range)
  deps.onChange()
}

/**
 * Fallback for browsers that insert a naked whitespace text node instead of
 * routing through our beforeinput handler. Replace it with one styled span per
 * character (preserving the one-span-per-char invariant the rest of the app
 * relies on) and move the caret after the last span.
 */
export function wrapNakedSpaceNode(node: Text, deps: EditorDeps): void {
  const parent = node.parentNode
  if (!parent) return
  const frag = document.createDocumentFragment()
  let last: HTMLSpanElement | null = null
  for (const char of node.textContent ?? '') {
    last = makeCharSpan(char, deps.resolveStyle())
    frag.appendChild(last)
  }
  parent.replaceChild(frag, node)
  if (last) {
    const sel = window.getSelection()
    if (sel) {
      const range = document.createRange()
      range.setStartAfter(last)
      range.collapse(true)
      sel.removeAllRanges()
      sel.addRange(range)
    }
  }
}

/**
 * Insert an emoji span at the caret, creating a caret at the end if there is none.
 * Emoji are styled like typed characters (so they pick up the current colour /
 * rainbow and size) — note most emoji render as colour glyphs and ignore `color`.
 */
export function insertEmoji(editor: HTMLElement, emoji: string, style: CharStyle): void {
  editor.focus()
  const sel = window.getSelection()
  if (!sel) return
  if (!sel.rangeCount) {
    const r = document.createRange()
    r.selectNodeContents(editor)
    r.collapse(false)
    sel.removeAllRanges()
    sel.addRange(r)
  }
  const range = sel.getRangeAt(0)
  range.deleteContents()
  const span = makeCharSpan(emoji, style)
  range.insertNode(span)
  range.setStartAfter(span)
  range.collapse(true)
  sel.removeAllRanges()
  sel.addRange(range)
}

/**
 * Delete the character (or line break) immediately before the caret.
 *
 * The on-screen keyboard's Backspace can't rely on the browser's native
 * deletion: the editor is non-editable on touch, and after a caret placed by
 * `caretRangeFromPoint` the caret often sits *inside* a character span's text
 * node, where native delete behaves unpredictably. So we operate on the flat
 * one-span-per-char DOM directly: find the editor's direct-child node before the
 * caret and remove it. Reuses the same "climb to a direct child of the editor"
 * idea as `insertLineBreak`.
 */
export function deleteBackward(editor: HTMLElement): void {
  editor.focus()
  const sel = window.getSelection()
  if (!sel) return
  if (!sel.rangeCount) {
    const r = document.createRange()
    r.selectNodeContents(editor)
    r.collapse(false)
    sel.removeAllRanges()
    sel.addRange(r)
  }
  const range = sel.getRangeAt(0)

  // A non-collapsed selection (e.g. select-all then delete) — just remove it.
  if (!range.collapsed) {
    range.deleteContents()
    range.collapse(true)
    sel.removeAllRanges()
    sel.addRange(range)
    cleanupLoneTrailingBr(editor, sel)
    return
  }

  // Find the editor's direct-child node immediately before the caret.
  const c = range.startContainer
  let target: Node | null = null
  if (c === editor) {
    // Caret sits between direct children at index startOffset.
    target = editor.childNodes[range.startOffset - 1] ?? null
  } else {
    // Caret is inside a descendant — typically a char span's text node, where
    // offset 0 = before the letter, offset 1 = after it. Climb to the node that
    // is a direct child of the editor.
    let node: Node = c
    while (node.parentNode && node.parentNode !== editor) node = node.parentNode
    if (node.parentNode !== editor) return
    target = range.startOffset === 0 ? node.previousSibling : node
  }

  if (!target) return // start of content — nothing to delete

  // Reposition the caret where the deleted node was, then remove it.
  const newRange = document.createRange()
  const prev = target.previousSibling
  if (prev) newRange.setStartAfter(prev)
  else newRange.setStart(editor, 0)
  newRange.collapse(true)
  editor.removeChild(target)
  sel.removeAllRanges()
  sel.addRange(newRange)

  cleanupLoneTrailingBr(editor, sel)
}

/**
 * If deleting left the editor holding only a single `<br>` (a collapsed,
 * invisible line), clear it so the empty-state placeholder ("Hi Zoe!") shows
 * again instead of an apparently-empty-but-not-`:empty` editor.
 */
function cleanupLoneTrailingBr(editor: HTMLElement, sel: Selection): void {
  if (editor.childNodes.length === 1 && editor.firstChild?.nodeName === 'BR') {
    editor.removeChild(editor.firstChild)
    const r = document.createRange()
    r.setStart(editor, 0)
    r.collapse(true)
    sel.removeAllRanges()
    sel.addRange(r)
  }
}

/**
 * Keep the caret visible above the docked on-screen keyboard after an insert.
 * The keyboard overlays the bottom of the editor; `--dock-h` (set by App) is how
 * much of the bottom is covered. Programmatic inserts don't auto-scroll the way
 * a native caret does, so nudge the editor's own scroll when the caret would
 * land in (or below) the covered strip.
 */
export function scrollCaretIntoView(editor: HTMLElement): void {
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return
  const range = sel.getRangeAt(0)
  let rect = range.getBoundingClientRect()
  // A collapsed caret at a <br> / between spans can report a zero rect; fall
  // back to the node just before the caret.
  if (rect.width === 0 && rect.height === 0) {
    const node =
      range.startContainer === editor
        ? editor.childNodes[Math.max(0, range.startOffset - 1)]
        : range.startContainer
    const el = node && (node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement)
    if (el) rect = el.getBoundingClientRect()
  }
  const edRect = editor.getBoundingClientRect()
  const dockH =
    parseInt(getComputedStyle(document.documentElement).getPropertyValue('--dock-h'), 10) || 0
  const visibleBottom = edRect.bottom - dockH
  if (rect.bottom > visibleBottom) {
    editor.scrollTop += rect.bottom - visibleBottom + 8
  } else if (rect.top < edRect.top) {
    editor.scrollTop -= edRect.top - rect.top + 8
  }
}

/** Place the caret at a viewport point (used by the virtual cursor under pointer lock). */
export function placeCaretAtPoint(editor: HTMLElement, x: number, y: number): void {
  let range: Range | null = null
  // caretRangeFromPoint is the WebKit/Blink API; caretPositionFromPoint the standard one.
  const doc = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null
    caretPositionFromPoint?: (x: number, y: number) => CaretPosition | null
  }
  if (doc.caretRangeFromPoint) {
    range = doc.caretRangeFromPoint(x, y)
  } else if (doc.caretPositionFromPoint) {
    const p = doc.caretPositionFromPoint(x, y)
    if (p) {
      range = document.createRange()
      range.setStart(p.offsetNode, p.offset)
      range.collapse(true)
    }
  }
  editor.focus()
  if (range) {
    const sel = window.getSelection()
    if (sel) {
      sel.removeAllRanges()
      sel.addRange(range)
    }
  }
}
