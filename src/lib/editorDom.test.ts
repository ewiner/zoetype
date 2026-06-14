import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  handleBeforeInput,
  handleKeydown,
  handlePaste,
  insertEmoji,
  insertLineBreak,
  makeCharSpan,
  wrapNakedSpaceNode,
  type EditorDeps,
} from './editorDom'
import type { CharStyle } from '../types'

const STYLE: CharStyle = { color: '#FF6B6B', fontFamily: "'Bubblegum Sans', cursive", fontSize: '72px' }

function makeEditor(html = ''): HTMLElement {
  document.body.innerHTML = '<div id="editor" contenteditable></div>'
  const editor = document.getElementById('editor') as HTMLElement
  editor.innerHTML = html
  return editor
}

function caretAt(container: Node, offset: number): void {
  const sel = window.getSelection()!
  const range = document.createRange()
  range.setStart(container, offset)
  range.collapse(true)
  sel.removeAllRanges()
  sel.addRange(range)
}

function deps(editor: HTMLElement): EditorDeps {
  return {
    editor,
    resolveStyle: () => ({ ...STYLE }),
    onChange: vi.fn(),
    playSound: vi.fn(),
  }
}

describe('makeCharSpan', () => {
  it('preserves whitespace on a lone space so it does not collapse', () => {
    const span = makeCharSpan(' ', STYLE)
    expect(span.style.whiteSpace).toBe('pre')
    expect(span.textContent).toBe(' ')
  })

  it('applies the resolved colour, font, and size and the pop class', () => {
    const span = makeCharSpan('x', STYLE)
    const color = span.style.color.toLowerCase()
    // browsers normalise to rgb(...), happy-dom keeps the hex
    expect(color === '#ff6b6b' || color === 'rgb(255, 107, 107)').toBe(true)
    expect(span.style.fontFamily).toContain('Bubblegum Sans')
    expect(span.style.fontSize).toBe('72px')
    expect(span.classList.contains('letter-pop')).toBe(true)
  })
})

describe('insertLineBreak', () => {
  it('adds one trailing pad <br> when breaking at the end of content', () => {
    const editor = makeEditor('<span>H</span><span>i</span>')
    caretAt(editor, 2) // after both spans, at top level
    insertLineBreak(editor)
    // the break + a single trailing pad so the new empty line renders
    expect(editor.querySelectorAll('br').length).toBe(2)
    expect(editor.innerHTML).toBe('<span>H</span><span>i</span><br><br>')
  })

  it('hoists the <br> out of a character span when the caret is inside one', () => {
    const editor = makeEditor('<span>H</span><span>i</span>')
    const firstText = editor.firstChild!.firstChild! // text node inside <span>H</span>
    caretAt(firstText, 1) // offset 1 = after the letter
    insertLineBreak(editor)
    // <br> lands BETWEEN the spans, never nested inside one
    expect(editor.innerHTML).toBe('<span>H</span><br><span>i</span>')
    expect(editor.querySelector('span')!.innerHTML).toBe('H') // not <span>H<br></span>
  })

  it('does not stack extra blank lines on consecutive Enters at the end', () => {
    const editor = makeEditor('<span>H</span>')
    caretAt(editor, 1)
    insertLineBreak(editor) // -> span, br, padbr
    insertLineBreak(editor) // -> span, br, br, padbr  (3 total, not 4)
    expect(editor.querySelectorAll('br').length).toBe(3)
  })
})

describe('handleBeforeInput', () => {
  it('wraps each typed character in its own styled span', () => {
    const editor = makeEditor('')
    caretAt(editor, 0)
    const d = deps(editor)
    const e = { inputType: 'insertText', data: 'ab', preventDefault: vi.fn() } as unknown as InputEvent
    handleBeforeInput(e, d)
    expect(editor.querySelectorAll('span').length).toBe(2)
    expect(editor.textContent).toBe('ab')
    expect(d.onChange).toHaveBeenCalledOnce()
  })

  it('ignores non-insertText input types', () => {
    const editor = makeEditor('')
    caretAt(editor, 0)
    const e = { inputType: 'deleteContentBackward', data: null, preventDefault: vi.fn() } as unknown as InputEvent
    handleBeforeInput(e, deps(editor))
    expect(editor.querySelectorAll('span').length).toBe(0)
  })
})

describe('handlePaste', () => {
  it('strips formatting: newlines become <br>, other chars become styled spans', () => {
    const editor = makeEditor('')
    caretAt(editor, 0)
    const d = deps(editor)
    const e = {
      preventDefault: vi.fn(),
      clipboardData: { getData: () => 'a\nb' },
    } as unknown as ClipboardEvent
    handlePaste(e, d)
    expect(editor.querySelectorAll('span').length).toBe(2)
    expect(editor.querySelectorAll('br').length).toBe(1)
    expect(d.onChange).toHaveBeenCalledOnce()
  })
})

describe('wrapNakedSpaceNode', () => {
  it('wraps a multi-space text node into one span per character', () => {
    const editor = makeEditor('')
    const textNode = document.createTextNode('   ') // 3 spaces
    editor.appendChild(textNode)
    wrapNakedSpaceNode(textNode, deps(editor))
    const spans = editor.querySelectorAll('span')
    expect(spans.length).toBe(3)
    spans.forEach((s) => expect(s.style.whiteSpace).toBe('pre'))
  })
})

describe('insertEmoji', () => {
  it('inserts a styled, animated span that picks up the current colour/size', () => {
    const editor = makeEditor('')
    caretAt(editor, 0)
    insertEmoji(editor, '🦄', { color: '#6BCB77', fontFamily: "'Fredoka', sans-serif", fontSize: '96px' })
    const span = editor.querySelector('span')!
    expect(span.textContent).toBe('🦄')
    expect(span.classList.contains('letter-pop')).toBe(true)
    expect(span.style.fontSize).toBe('96px')
    const color = span.style.color.toLowerCase()
    expect(color === '#6bcb77' || color === 'rgb(107, 203, 119)').toBe(true)
  })
})

describe('handleKeydown', () => {
  function key(init: KeyboardEventInit): { e: KeyboardEvent; pd: ReturnType<typeof vi.spyOn> } {
    const e = new KeyboardEvent('keydown', init)
    const pd = vi.spyOn(e, 'preventDefault')
    return { e, pd }
  }

  beforeEach(() => {
    makeEditor('')
  })

  it('blocks key repeat', () => {
    const editor = makeEditor('')
    const { e, pd } = key({ key: 'a', repeat: true })
    handleKeydown(e, deps(editor))
    expect(pd).toHaveBeenCalled()
  })

  it('blocks Cmd+Z (undo is a no-op with custom input) but allows Cmd+A', () => {
    const editor = makeEditor('')
    const z = key({ key: 'z', metaKey: true })
    handleKeydown(z.e, deps(editor))
    expect(z.pd).toHaveBeenCalled()

    const a = key({ key: 'a', metaKey: true })
    handleKeydown(a.e, deps(editor))
    expect(a.pd).not.toHaveBeenCalled()
  })

  it('blocks function keys and Tab', () => {
    const editor = makeEditor('')
    const f5 = key({ key: 'F5' })
    handleKeydown(f5.e, deps(editor))
    expect(f5.pd).toHaveBeenCalled()

    const tab = key({ key: 'Tab' })
    handleKeydown(tab.e, deps(editor))
    expect(tab.pd).toHaveBeenCalled()
  })

  it('inserts a line break, plays a sound, and saves on Enter', () => {
    const editor = makeEditor('<span>H</span>')
    caretAt(editor, 1)
    const d = deps(editor)
    const { e } = key({ key: 'Enter' })
    handleKeydown(e, d)
    expect(editor.querySelectorAll('br').length).toBeGreaterThanOrEqual(1)
    expect(d.playSound).toHaveBeenCalledWith('Enter')
    expect(d.onChange).toHaveBeenCalledOnce()
  })

  it('plays a sound for a printable key', () => {
    const editor = makeEditor('')
    const d = deps(editor)
    const { e } = key({ key: 'x' })
    handleKeydown(e, d)
    expect(d.playSound).toHaveBeenCalledWith('x')
  })

  it('plays the delete sound on Backspace', () => {
    const editor = makeEditor('')
    const d = deps(editor)
    const { e } = key({ key: 'Backspace' })
    handleKeydown(e, d)
    expect(d.playSound).toHaveBeenCalledWith('_delete')
  })
})
