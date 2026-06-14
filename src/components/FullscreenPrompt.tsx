interface Props {
  show: boolean
  onReenter: () => void
  onConfirmExit: () => void
}

/**
 * Shown when fullscreen is exited. A big friendly button to go back in, plus a
 * deliberately small, muted escape hatch so a parent isn't trapped re-entering.
 */
export function FullscreenPrompt({ show, onReenter, onConfirmExit }: Props) {
  return (
    <div id="fullscreen-prompt" className={show ? 'show' : ''}>
      <button id="reenter-fullscreen" onClick={onReenter}>
        Tap to go full screen! 🌟
      </button>
      <button id="confirm-exit-fullscreen" onClick={onConfirmExit}>
        Exit fullscreen
      </button>
    </div>
  )
}
