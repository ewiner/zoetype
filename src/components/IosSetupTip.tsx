/**
 * Parent-facing guidance shown inside the controls drawer on iOS only. iPhone
 * Safari can't do the desktop Pointer-Lock / Fullscreen lockdown, so the real
 * way to stop a 3-year-old from leaving the app is iOS Guided Access (an
 * OS-level single-app lock). This is the iOS analog of the desktop
 * FullscreenPrompt.
 */
export function IosSetupTip() {
  return (
    <div id="ios-setup-tip">
      <div className="tip-title">🔒 Lock it for little hands</div>
      <ol className="tip-steps">
        <li>
          Turn on <b>Guided Access</b>: Settings → Accessibility → Guided Access → On.
        </li>
        <li>
          Back in ZoeType, <b>triple-click the side button</b> to lock the phone to this
          app. Triple-click again (with your passcode) to unlock.
        </li>
      </ol>
    </div>
  )
}
