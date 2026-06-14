# ZoeType

A toddler-proof word processor. Big colorful letters that pop in as you type,
fun fonts, emoji, themes, key sounds, and a locked-down fullscreen mode so a kid
can bang on the keyboard without escaping the app or wrecking anything.

Live: deployed on **Vercel**.

## Tech

- **Vite + React 18 + TypeScript**
- Plain CSS (one global stylesheet) driven by CSS custom properties + body-class themes
- Self-hosted fonts via [`@fontsource`](https://fontsource.org/) (Latin subset only)
- **Vitest + happy-dom** for unit tests

This started life as a single 1,400-line `index.html` Claude Artifact and was
rebuilt into a real project. Functionality was kept the same; a handful of bugs
were fixed along the way (see [Notable fixes](#notable-fixes)).

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # run the unit tests once
npm run test:watch # watch mode
npm run build      # type-check (tsc -b) + production build to dist/
npm run preview    # serve the production build locally
```

## Architecture

The app is ~90% imperative DOM work (contenteditable surgery, pointer lock, a
virtual cursor, Web Audio). The guiding rule:

> **React owns the chrome (toolbar, panels, dots, prompt). Plain DOM + refs own
> the editor and the pointer-lock system. They talk through refs and callbacks,
> never by re-rendering editor content.**

```
src/
  main.tsx                 # bootstrap (no StrictMode — see below) + font imports
  App.tsx                  # composition root: app state + wires the hooks together
  components/              # presentational chrome (Toolbar, pickers, panels, Editor, …)
  hooks/
    useEditor.ts           # imperative controller for the contenteditable editor
    useFullscreenPointerLock.ts  # fullscreen + pointer lock + virtual cursor (highest risk)
    usePages.ts            # pages array, current page, debounced persistence
    useEditorSettings.ts   # color/font/size/rainbow (+ refs to avoid stale closures)
    useAudio.ts            # lazy AudioContext + playSound
    useGlobalGuards.ts     # contextmenu / drag-drop / history / beforeunload guards
  lib/
    editorDom.ts           # pure-ish DOM functions (the testable core) + bug fixes
    audio.ts, sessionLoad.ts, colors.ts, fonts.ts, themes.ts, emoji.ts, constants.ts
  styles/global.css        # the whole stylesheet (themes use body classes + CSS vars)
  test/setup.ts            # jest-dom matchers
```

### Why the editor is uncontrolled

Every typed character becomes its own `display:inline-block` `<span>` (for the
pop animation), with the caret threaded between spans. React's reconciler and
`contenteditable`'s live DOM mutation are fundamentally at war, so the editor
`<div>` is mounted **once** and never reconciled — all mutation goes through
`editorRef` in `useEditor` / `lib/editorDom.ts`. Page switches assign
`innerHTML` directly; React only ever re-renders the page dots.

### Why no StrictMode

`main.tsx` deliberately skips `<StrictMode>`. Its dev-only double-invoke of
effects makes the user-gesture-gated Pointer Lock / Fullscreen / AudioContext
APIs misbehave in development. All effects clean up after themselves, so
production behavior is identical either way.

## Testing

`npm test` covers the editor's logic core and the session-load rules — the parts
most prone to regression:

- `insertLineBreak` edge cases (hoisting the `<br>` out of inline-block spans,
  the single trailing-pad rule, no stacked blank lines on repeated Enter)
- per-character span styling incl. whitespace preservation
- `beforeinput` / paste (formatting stripped, newlines → `<br>`)
- the multi-space MutationObserver fallback
- keydown guards (repeat, Cmd+Z blocked / Cmd+A allowed, function keys, Tab, Enter)
- the 30-minute session-timeout load logic (`loadInitialPages` is pure: `now` is injected)

### What can't be tested by tooling — verify by hand

Pointer Lock and Fullscreen have no reliable headless support (a headless
viewport reports 0×0, so `elementFromPoint`/`caretRangeFromPoint` return null).
Validate these manually in **real Chrome** on macOS with a trackpad:

- [ ] ⛶ enters fullscreen and the OS cursor is captured (can't reach the menu bar / dock / hot corners)
- [ ] The virtual cursor moves 1:1 with the trackpad and feels native
- [ ] Hovering toolbar / emoji / theme buttons shows hover feedback; clicking them works
- [ ] Clicking in the text places the caret at that point
- [ ] Two-finger scroll scrolls the page; ctrl/pinch zoom is blocked
- [ ] After a stray Esc, the lock auto-heals on the next key/click (≈1.3s cooldown)
- [ ] Exiting fullscreen shows the "Tap to go full screen!" prompt; the small "Exit fullscreen" link opts out
- [ ] On a touch device (coarse pointer) the toolbar docks to the bottom

## Deploy (Vercel)

Vercel auto-detects the Vite preset (build `vite build`, output `dist/`), so no
config file is needed.

- **First time:** import the GitHub repo at [vercel.com/new](https://vercel.com/new),
  or run `npx vercel` / `npx vercel --prod` from this directory.
- **After that:** every push to the production branch deploys automatically.

The old GitHub Pages setup (legacy build, served `index.html` from `main`) is
replaced by this. The "Trigger GH Pages deploy" empty-commit habit is no longer
needed.

> Dependency audit note: `npm audit` reports issues only in **dev** dependencies
> (esbuild's dev-server advisory via Vite/Vitest; happy-dom in the test env).
> `npm audit --omit=dev` reports **0** — nothing vulnerable ships to users.
> Forcing the fixes would pull in Vite 8 and break the Vitest 2 alignment.

## Notable fixes

Behavior was preserved; these were genuine bugs cleaned up during the rewrite:

- **Cmd+Z dropped.** The custom span-based input bypasses the browser's native
  undo stack, so undo was a misleading no-op. It's now blocked outright
  (toddler-proof anyway). Cmd+A still works.
- **Multi-space MutationObserver fallback** now wraps one span per character
  (it used to lump a whole whitespace run into a single span).
- **`beforeunload` guard** now sets `returnValue` so the confirm actually fires
  in current browsers (was a silent no-op).
- **Print flushes the pending save** before opening the print dialog.
- **Dead no-op keydown space handler removed**; all event listeners now clean up
  after themselves (no leaks under HMR).
