/** Logo : une fleur à cinq pétales, blanche sur fond rose. */
export function Logo({ taille = 34 }: { taille?: number }) {
  return (
    <span className="brand-mark" style={{ width: taille, height: taille }} aria-hidden="true">
      <svg viewBox="0 0 24 24" width={taille * 0.62} height={taille * 0.62}>
        {[0, 72, 144, 216, 288].map((angle) => (
          <ellipse key={angle} cx="12" cy="6.6" rx="3.4" ry="5" fill="#fff" opacity="0.95" transform={`rotate(${angle} 12 12)`} />
        ))}
        <circle cx="12" cy="12" r="2.6" fill="var(--brand)" />
      </svg>
    </span>
  )
}
