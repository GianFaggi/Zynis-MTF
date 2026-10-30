// The arc both the trail and the `fly` keyframe follow, in scene units (viewBox 320 x 72).
const ARC = 'M-20 58C70 6 230 6 340 44'
// Mid-arc: where the plane rests when it is not flying (reduced motion, a failed wait).
const REST = 'translate(158.4 17.1) rotate(-0.9)'

type PaperPlaneProps = {
  flying: boolean
}

/**
 * The paper plane, the sign that MTF is waiting for its server: ink and paper, never
 * the accent, because travelling is not a Win. It fills its box; the edges fade, so
 * the plane leaves on the right and comes back in from the left. At rest (and with
 * reduced motion, which turns the keyframes off) it sits mid-arc on the whole trail.
 */
export function PaperPlane({ flying }: PaperPlaneProps) {
  return (
    <span
      aria-hidden="true"
      className="relative block size-full [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]"
    >
      <svg viewBox="0 0 320 72" className={`absolute inset-0 size-full ${flying ? 'animate-trail' : ''}`}>
        <path d={ARC} className="fill-none stroke-pencil" strokeWidth={1.6} strokeDasharray="0 6" strokeLinecap="round" />
      </svg>
      <svg viewBox="0 0 320 72" className="absolute inset-0 size-full">
        {/* Drawn around (0, 0), nose to the right, so `fly` moves it in scene units. */}
        <g transform={REST} className={flying ? 'animate-fly' : undefined} strokeWidth={1.4} strokeLinejoin="round">
          <path d="M13 0L-5 2L-8.5 8.5Z" className="fill-paper stroke-ink" />
          <path d="M13 0L-11.5 -9L-5 2Z" className="fill-sheet stroke-ink" />
        </g>
      </svg>
    </span>
  )
}
