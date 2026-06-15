import { useCallback, useEffect, useRef, useState } from 'react'
import { ColorPicker } from './components/ColorPicker'
import { Editor } from './components/Editor'
import { EmojiPanel } from './components/EmojiPanel'
import { FullscreenPrompt } from './components/FullscreenPrompt'
import { IosSetupTip } from './components/IosSetupTip'
import { OnScreenKeyboard } from './components/OnScreenKeyboard'
import { ThemePanel } from './components/ThemePanel'
import { Toolbar } from './components/Toolbar'
import { VirtualCursor } from './components/VirtualCursor'
import { useAudio } from './hooks/useAudio'
import { useEditor } from './hooks/useEditor'
import { useEditorSettings } from './hooks/useEditorSettings'
import { useFullscreenPointerLock } from './hooks/useFullscreenPointerLock'
import { useGlobalGuards } from './hooks/useGlobalGuards'
import { usePages } from './hooks/usePages'
import { COLORS } from './lib/colors'
import { EMOJI_CATEGORIES } from './lib/emoji'
import { fullscreenSupported, isCoarsePointer, isIOS } from './lib/platform'
import { THEMES } from './lib/themes'
import type { PanelName } from './types'

export default function App() {
  const toolbarRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)
  // Touch only: the compose bar + on-screen keyboard that dock to the bottom.
  const dockRef = useRef<HTMLDivElement>(null)

  // Device traits — fixed for the session, so compute once.
  const [coarse] = useState(isCoarsePointer)
  const [fsSupported] = useState(fullscreenSupported)
  const [ios] = useState(isIOS)

  const [openPanel, setOpenPanel] = useState<PanelName>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [currentThemeIndex, setCurrentThemeIndex] = useState(0)
  const [showPrompt, setShowPrompt] = useState(false)
  // Height of the bottom chrome (top toolbar on desktop; the dock on touch),
  // used to size the emoji panel so it fits above it.
  const [bottomChromeHeight, setBottomChromeHeight] = useState(0)

  const settings = useEditorSettings()
  const playSound = useAudio(soundEnabled)

  const closePanels = useCallback(() => setOpenPanel(null), [])

  // Editor needs to schedule a save on change, but the save logic lives in
  // usePages (declared below). Bridge the cycle through a ref.
  const scheduleSaveRef = useRef<() => void>(() => {})
  const onContentChange = useCallback(() => scheduleSaveRef.current(), [])

  const editor = useEditor({
    resolveStyle: settings.resolveStyle,
    onContentChange,
    playSound,
    onEditorClick: closePanels,
    coarse,
  })

  const pages = usePages({
    getContent: editor.getContent,
    setContent: editor.setContent,
    focusEditor: editor.focus,
  })
  scheduleSaveRef.current = pages.scheduleSave

  const fullscreen = useFullscreenPointerLock({
    editorRef: editor.editorRef,
    cursorRef,
    placeCaretAtPoint: editor.placeCaretAtPoint,
    focusEditor: editor.focus,
    closePanels,
    setShowPrompt,
  })

  useGlobalGuards(editor.editorRef)

  // ===== Theme: drive the body class =====
  useEffect(() => {
    const cls = THEMES[currentThemeIndex].cls
    document.body.classList.add(cls)
    return () => document.body.classList.remove(cls)
  }, [currentThemeIndex])

  // ===== Measure the bottom chrome to pad the editor and size the panels =====
  // Desktop: the wrapping top toolbar. Touch: the docked compose bar + keyboard,
  // whose height is published as --dock-h so the panels can sit just above it.
  useEffect(() => {
    const measured = coarse ? dockRef.current : toolbarRef.current
    const editorEl = editor.editorRef.current
    if (!measured) return
    const update = () => {
      const h = measured.offsetHeight
      setBottomChromeHeight(h)
      if (coarse) {
        document.documentElement.style.setProperty('--dock-h', `${h}px`)
        if (editorEl) {
          editorEl.style.paddingTop = 'calc(20px + env(safe-area-inset-top))'
          editorEl.style.paddingBottom = `${h + 20}px`
        }
      } else if (editorEl) {
        editorEl.style.paddingTop = `${h + 20}px`
        editorEl.style.paddingBottom = '20px'
      }
    }
    update()
    window.addEventListener('resize', update)
    const ro = new ResizeObserver(update)
    ro.observe(measured)
    return () => {
      window.removeEventListener('resize', update)
      ro.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coarse])

  // ===== Toolbar handlers =====
  const onToggleEmoji = useCallback(() => setOpenPanel((p) => (p === 'emoji' ? null : 'emoji')), [])
  const onToggleTheme = useCallback(() => setOpenPanel((p) => (p === 'theme' ? null : 'theme')), [])
  const onToggleControls = useCallback(
    () => setOpenPanel((p) => (p === 'controls' ? null : 'controls')),
    [],
  )
  const onToggleSound = useCallback(() => setSoundEnabled((s) => !s), [])
  const onSelectTheme = useCallback(
    (index: number) => {
      setCurrentThemeIndex(index)
      editor.focus()
    },
    [editor],
  )
  const onPickEmoji = useCallback((emoji: string) => editor.insertEmoji(emoji), [editor])
  // Flush the debounced save so the printout reflects the latest edits.
  const onPrint = useCallback(() => {
    pages.saveNow()
    window.print()
  }, [pages])
  // All toolbar controls are click-driven; return keyboard focus to the editor
  // after any toolbar interaction so a child banging keys always types into the
  // page instead of getting "stuck" on a focused button.
  const onToolbarClick = useCallback(() => editor.focus(), [editor])

  // Shared toolbar props (rendered as the top bar on desktop, the drawer on touch).
  const toolbarProps = {
    toolbarRef,
    onToolbarClick,
    fullscreenSupported: fsSupported,
    currentColor: settings.color,
    rainbow: settings.rainbow,
    onSelectColor: settings.setColor,
    onToggleRainbow: settings.toggleRainbow,
    currentFont: settings.font,
    onSelectFont: settings.setFont,
    currentSize: settings.size,
    onSelectSize: settings.setSize,
    emojiOpen: openPanel === 'emoji',
    themeOpen: openPanel === 'theme',
    soundEnabled,
    onToggleEmoji,
    onToggleTheme,
    onToggleSound,
    pageCount: pages.pageCount,
    currentPage: pages.currentPage,
    onPrevPage: () => pages.goToPage(pages.currentPage - 1),
    onNextPage: () => pages.goToPage(pages.currentPage + 1),
    onNewPage: pages.newPage,
    onDeletePage: pages.deletePage,
    onFullscreen: fullscreen.toggleFullscreen,
    onPrint,
  }

  const panels = (
    <>
      <EmojiPanel
        open={openPanel === 'emoji'}
        categories={EMOJI_CATEGORIES}
        toolbarHeight={bottomChromeHeight}
        onPick={onPickEmoji}
      />
      <ThemePanel
        open={openPanel === 'theme'}
        themes={THEMES}
        currentThemeIndex={currentThemeIndex}
        onSelect={onSelectTheme}
      />
    </>
  )

  if (coarse) {
    return (
      <>
        <Toolbar
          {...toolbarProps}
          variant="drawer"
          open={openPanel === 'controls'}
          footer={ios ? <IosSetupTip /> : null}
        />

        {panels}

        <Editor editorRef={editor.editorRef} coarse />

        <div id="mobile-dock" ref={dockRef}>
          <div id="compose-bar" onClick={onToolbarClick}>
            <div className="compose-colors">
              <ColorPicker
                colors={COLORS}
                currentColor={settings.color}
                rainbow={settings.rainbow}
                onSelectColor={settings.setColor}
                onToggleRainbow={settings.toggleRainbow}
              />
            </div>
            <button
              className={'icon-btn' + (openPanel === 'emoji' ? ' active' : '')}
              title="Emoji"
              onClick={onToggleEmoji}
            >
              😀
            </button>
            <button
              className={'icon-btn parent-gear' + (openPanel === 'controls' ? ' active' : '')}
              title="Settings"
              onClick={onToggleControls}
            >
              ⚙️
            </button>
          </div>

          <OnScreenKeyboard
            onType={editor.typeChar}
            onSpace={() => editor.typeChar(' ')}
            onEnter={editor.lineBreak}
            onBackspace={editor.deleteBackward}
          />
        </div>
      </>
    )
  }

  return (
    <>
      <Toolbar {...toolbarProps} variant="bar" />

      {panels}

      <Editor editorRef={editor.editorRef} />

      <FullscreenPrompt
        show={showPrompt}
        onReenter={fullscreen.enterLockedFullscreen}
        onConfirmExit={fullscreen.confirmExit}
      />

      <VirtualCursor cursorRef={cursorRef} />
    </>
  )
}
