export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: { width: 120, height: 37, fontSize: 16, subSize: 6, lineY1: 4, textY1: 22, textY2: 32, lineY2: 36 },
    md: { width: 180, height: 56, fontSize: 24, subSize: 8, lineY1: 6, textY1: 34, textY2: 46, lineY2: 54 },
    lg: { width: 260, height: 80, fontSize: 34, subSize: 11, lineY1: 8, textY1: 48, textY2: 66, lineY2: 78 },
  }
  const s = sizes[size]

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${s.width} ${s.height}`}
      width={s.width}
      height={s.height}
      aria-label="L'Établi Architecture & Design"
      role="img"
    >
      <line x1="0" y1={s.lineY1} x2={s.width} y2={s.lineY1} stroke="currentColor" strokeWidth="1.5" />
      <text
        x={s.width / 2}
        y={s.textY1}
        fontFamily="'Barlow Condensed', 'Arial Narrow', Arial, sans-serif"
        fontSize={s.fontSize}
        fontWeight="700"
        letterSpacing="6"
        textAnchor="middle"
        fill="currentColor"
      >
        L&apos;ÉTABLI
      </text>
      <text
        x={s.width / 2}
        y={s.textY2}
        fontFamily="'Barlow Condensed', 'Arial Narrow', Arial, sans-serif"
        fontSize={s.subSize}
        fontWeight="400"
        letterSpacing="4"
        textAnchor="middle"
        fill="currentColor"
      >
        ARCHITECTURE &amp; DESIGN
      </text>
      <line x1="0" y1={s.lineY2} x2={s.width} y2={s.lineY2} stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}
