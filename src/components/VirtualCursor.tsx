interface Props {
  cursorRef: React.RefObject<HTMLDivElement>
}

/**
 * The custom cursor drawn while pointer-locked. Its position and visibility are
 * driven imperatively by useFullscreenPointerLock (it moves on every mousemove,
 * so it must never go through React state).
 */
export function VirtualCursor({ cursorRef }: Props) {
  return (
    <div ref={cursorRef} id="virtual-cursor" aria-hidden="true">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M3 2 L3 20.5 L8 15.5 L11.2 22.5 L14 21.2 L10.9 14.4 L18 14.2 Z"
          fill="#ffffff"
          stroke="#1b1b1b"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
