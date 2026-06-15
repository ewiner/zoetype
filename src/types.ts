export interface Page {
  content: string
}

/** The resolved inline style applied to a single typed character span. */
export interface CharStyle {
  color: string
  fontFamily: string
  fontSize: string
}

export interface ColorDef {
  value: string
  title: string
}

export interface FontDef {
  /** Toolbar button label, e.g. "Bubbly". */
  label: string
  /** CSS font-family stack, e.g. "'Bubblegum Sans', cursive". */
  family: string
}

export interface SizeDef {
  /** Numeric font size in px applied to typed characters. */
  value: number
  /** Font size (px) used to render the "A" preview on the toolbar button. */
  previewPx: number
}

export interface ThemeDef {
  /** Body class that drives the theme, e.g. "theme-space". */
  cls: string
  /** Class for the preview card background, e.g. "preview-space". */
  preview: string
  icon: string
  name: string
}

export type PanelName = 'emoji' | 'theme' | 'controls' | null
