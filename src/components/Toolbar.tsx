import type { ReactNode } from 'react'
import { COLORS } from '../lib/colors'
import { SIZES } from '../lib/constants'
import { FONTS } from '../lib/fonts'
import { ColorPicker } from './ColorPicker'
import { FontPicker } from './FontPicker'
import { PageControls } from './PageControls'
import { SizePicker } from './SizePicker'

interface Props {
  toolbarRef: React.RefObject<HTMLDivElement>
  /** Refocuses the editor after any toolbar interaction. */
  onToolbarClick: () => void

  /**
   * 'bar' = the fixed top strip (desktop). 'drawer' = a slide-up sheet on touch,
   * holding only the parent controls — colors + emoji live in the compose bar.
   */
  variant?: 'bar' | 'drawer'
  /** Drawer open state (only used when variant === 'drawer'). */
  open?: boolean
  /** Whether the Fullscreen lockdown button should show (false on iPhone). */
  fullscreenSupported: boolean
  /** Extra content rendered at the end of the drawer (e.g. the iOS setup tip). */
  footer?: ReactNode

  currentColor: string
  rainbow: boolean
  onSelectColor: (color: string) => void
  onToggleRainbow: () => void

  currentFont: string
  onSelectFont: (family: string) => void

  currentSize: number
  onSelectSize: (size: number) => void

  emojiOpen: boolean
  themeOpen: boolean
  soundEnabled: boolean
  onToggleEmoji: () => void
  onToggleTheme: () => void
  onToggleSound: () => void

  pageCount: number
  currentPage: number
  onPrevPage: () => void
  onNextPage: () => void
  onNewPage: () => void
  onDeletePage: () => void

  onFullscreen: () => void
  onPrint: () => void
}

export function Toolbar(props: Props) {
  const drawer = props.variant === 'drawer'
  const className = drawer ? 'toolbar-drawer' + (props.open ? ' open' : '') : ''

  return (
    <div id="toolbar" className={className} ref={props.toolbarRef} onClick={props.onToolbarClick}>
      {/* Colors + emoji live in the compose bar on touch, so omit them here. */}
      {!drawer && (
        <>
          <ColorPicker
            colors={COLORS}
            currentColor={props.currentColor}
            rainbow={props.rainbow}
            onSelectColor={props.onSelectColor}
            onToggleRainbow={props.onToggleRainbow}
          />
          <div className="toolbar-divider" />
        </>
      )}

      <FontPicker fonts={FONTS} currentFont={props.currentFont} onSelectFont={props.onSelectFont} />

      <div className="toolbar-divider" />

      <SizePicker sizes={SIZES} currentSize={props.currentSize} onSelectSize={props.onSelectSize} />

      <div className="toolbar-divider" />

      {!drawer && (
        <button
          className={'icon-btn' + (props.emojiOpen ? ' active' : '')}
          title="Emoji"
          onClick={props.onToggleEmoji}
        >
          😀
        </button>
      )}
      <button
        className={'icon-btn' + (props.themeOpen ? ' active' : '')}
        title="Theme"
        onClick={props.onToggleTheme}
      >
        🎨
      </button>
      <button className="icon-btn" title="Sound" onClick={props.onToggleSound}>
        {props.soundEnabled ? '🔊' : '🔇'}
      </button>

      <div className="toolbar-divider" />

      <PageControls
        pageCount={props.pageCount}
        currentPage={props.currentPage}
        onPrev={props.onPrevPage}
        onNext={props.onNextPage}
        onNew={props.onNewPage}
        onDelete={props.onDeletePage}
      />

      <div className="toolbar-divider" />

      {props.fullscreenSupported && (
        <button className="icon-btn" title="Fullscreen" onClick={props.onFullscreen}>
          ⛶
        </button>
      )}
      <button className="icon-btn" title="Print" onClick={props.onPrint}>
        🖨️
      </button>

      {drawer && props.footer}
    </div>
  )
}
