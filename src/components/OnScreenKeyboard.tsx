interface Props {
  /** Type one letter. */
  onType: (char: string) => void
  onSpace: () => void
  onEnter: () => void
  onBackspace: () => void
}

// Alphabetical, uppercase — most recognizable to a 3-year-old learning letters.
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

/**
 * Big in-app keyboard for touch devices (the phone has no hardware keys, and we
 * deliberately suppress the native iOS keyboard — see Editor `coarse`). Purely
 * presentational: every key calls back into the EditorApi via App.
 *
 * `preventDefault` on pointer/mouse down stops a tap from moving focus off the
 * editor; the imperative inserts call `editor.focus()` themselves, so the caret
 * stays in the page.
 */
export function OnScreenKeyboard({ onType, onSpace, onEnter, onBackspace }: Props) {
  const keepFocus = (e: React.SyntheticEvent) => e.preventDefault()

  return (
    <div id="onscreen-keyboard" onPointerDown={keepFocus} onMouseDown={keepFocus}>
      <div className="kbd-letters">
        {LETTERS.map((letter) => (
          <button key={letter} className="kbd-key" onClick={() => onType(letter)}>
            {letter}
          </button>
        ))}
      </div>
      <div className="kbd-actions">
        <button
          className="kbd-key kbd-backspace"
          aria-label="Delete"
          title="Delete"
          onClick={onBackspace}
        >
          ⌫
        </button>
        <button className="kbd-key kbd-space" aria-label="Space" title="Space" onClick={onSpace}>
          <span className="kbd-space-bar" />
        </button>
        <button
          className="kbd-key kbd-enter"
          aria-label="New line"
          title="New line"
          onClick={onEnter}
        >
          ⏎
        </button>
      </div>
    </div>
  )
}
