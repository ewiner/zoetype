import { useCallback, useEffect, useRef, useState } from 'react'
import { Editor } from './components/Editor'
import { EmojiPanel } from './components/EmojiPanel'
import { FullscreenPrompt } from './components/FullscreenPrompt'
import { ThemePanel } from './components/ThemePanel'
import { Toolbar } from './components/Toolbar'
import { VirtualCursor } from './components/VirtualCursor'
import { useAudio } from './hooks/useAudio'
import { useEditor } from './hooks/useEditor'
import { useEditorSettings } from './hooks/useEditorSettings'
import { useFullscreenPointerLock } from './hooks/useFullscreenPointerLock'
import { useGlobalGuards } from './hooks/useGlobalGuards'
import { usePages } from './hooks/usePages'
import { EMOJI_CATEGORIES } from './lib/emoji'
import { THEMES } from './lib/themes'
import type { PanelName } from './types'

export default function App() {
  const toolbarRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)

  const [openPanel, setOpenPanel] = useState<PanelName>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [currentThemeIndex, setCurrentThemeIndex] = useState(0)
  const [showPrompt, setShowPrompt] = useState(false)
  const [toolbarHeight, setToolbarHeight] = useState(0)

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

  // ===== Toolbar wraps; measure its height to pad the editor and size panels =====
  useEffect(() => {
    const toolbar = toolbarRef.current
    const editorEl = editor.editorRef.current
    if (!toolbar) return
    const update = () => {
      const h = toolbar.offsetHeight
      setToolbarHeight(h)
      if (editorEl) {
        const coarse = window.matchMedia('(pointer: coarse)').matches
        if (coarse) {
          editorEl.style.paddingTop = '20px'
          editorEl.style.paddingBottom = `${h + 20}px`
        } else {
          editorEl.style.paddingTop = `${h + 20}px`
          editorEl.style.paddingBottom = '20px'
        }
      }
    }
    update()
    window.addEventListener('resize', update)
    const ro = new ResizeObserver(update)
    ro.observe(toolbar)
    return () => {
      window.removeEventListener('resize', update)
      ro.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ===== Toolbar handlers =====
  const onToggleEmoji = useCallback(() => setOpenPanel((p) => (p === 'emoji' ? null : 'emoji')), [])
  const onToggleTheme = useCallback(() => setOpenPanel((p) => (p === 'theme' ? null : 'theme')), [])
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

  return (
    <>
      <Toolbar
        toolbarRef={toolbarRef}
        onToolbarClick={onToolbarClick}
        currentColor={settings.color}
        rainbow={settings.rainbow}
        onSelectColor={settings.setColor}
        onToggleRainbow={settings.toggleRainbow}
        currentFont={settings.font}
        onSelectFont={settings.setFont}
        currentSize={settings.size}
        onSelectSize={settings.setSize}
        emojiOpen={openPanel === 'emoji'}
        themeOpen={openPanel === 'theme'}
        soundEnabled={soundEnabled}
        onToggleEmoji={onToggleEmoji}
        onToggleTheme={onToggleTheme}
        onToggleSound={onToggleSound}
        pageCount={pages.pageCount}
        currentPage={pages.currentPage}
        onPrevPage={() => pages.goToPage(pages.currentPage - 1)}
        onNextPage={() => pages.goToPage(pages.currentPage + 1)}
        onNewPage={pages.newPage}
        onDeletePage={pages.deletePage}
        onFullscreen={fullscreen.toggleFullscreen}
        onPrint={onPrint}
      />

      <EmojiPanel
        open={openPanel === 'emoji'}
        categories={EMOJI_CATEGORIES}
        toolbarHeight={toolbarHeight}
        onPick={onPickEmoji}
      />

      <ThemePanel
        open={openPanel === 'theme'}
        themes={THEMES}
        currentThemeIndex={currentThemeIndex}
        onSelect={onSelectTheme}
      />

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
