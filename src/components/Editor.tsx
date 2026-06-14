interface Props {
  editorRef: React.RefObject<HTMLDivElement>
}

/**
 * The editable surface. Intentionally has no React children — its content is
 * owned imperatively by useEditor (see that hook). `suppressContentEditableWarning`
 * tells React we manage the innards ourselves.
 */
export function Editor({ editorRef }: Props) {
  return (
    <div
      ref={editorRef}
      id="editor"
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      autoCapitalize="off"
      autoCorrect="off"
    />
  )
}
