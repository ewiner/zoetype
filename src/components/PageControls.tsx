interface Props {
  pageCount: number
  currentPage: number
  onPrev: () => void
  onNext: () => void
  onNew: () => void
  onDelete: () => void
}

export function PageControls({ pageCount, currentPage, onPrev, onNext, onNew, onDelete }: Props) {
  return (
    <>
      <button className="icon-btn" title="Previous page" onClick={onPrev}>
        ◀
      </button>
      <div id="page-indicator">
        {Array.from({ length: pageCount }, (_, i) => (
          <span key={i} className={'page-dot' + (i === currentPage ? ' active' : '')} />
        ))}
      </div>
      <button className="icon-btn" title="Next page" onClick={onNext}>
        ▶
      </button>
      <button className="icon-btn" title="New page" onClick={onNew}>
        📄
      </button>
      <button className="icon-btn" title="Delete page" onClick={onDelete}>
        🗑️
      </button>
    </>
  )
}
