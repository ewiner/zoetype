interface Props {
  editorRef: React.RefObject<HTMLDivElement>
  /**
   * Touch device: render the surface NON-editable so iOS never raises its
   * software keyboard, while `tabIndex={-1}` keeps `editor.focus()` and caret
   * APIs working. All input then comes from the in-app on-screen keyboard.
   */
  coarse?: boolean
}

/**
 * The editable surface. Intentionally has no React children — its content is
 * owned imperatively by useEditor (see that hook). `suppressContentEditableWarning`
 * tells React we manage the innards ourselves.
 */
export function Editor({ editorRef, coarse }: Props) {
  return (
    <div
      ref={editorRef}
      id="editor"
      contentEditable={!coarse}
      tabIndex={coarse ? -1 : undefined}
      suppressContentEditableWarning
      spellCheck={false}
      autoCapitalize="off"
      autoCorrect="off"
    />
  )
}
