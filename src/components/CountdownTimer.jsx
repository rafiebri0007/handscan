import { useEffect, useRef, useState } from 'react'

/**
 * CountdownTimer — Futuristic Sci-Fi HUD countdown overlay.
 *
 * Shown while the palm scan is running (phase === 'scanning'). Counts
 * `seconds` -> 0 with deadline-based timing (no drift, robust against
 * throttled renders), then fires `onComplete` once and holds the
 * "SCAN COMPLETE" state on screen until App unmounts it.
 *
 * Visuals (cyberpunk / neon cyan, transparent background):
 *   - 2 concentric rotating rings + a depleting progress arc (inside the
 *     middle ring) that shrinks in sync with the remaining seconds
 *   - giant hollow/outline countdown number, perfectly centered
 *   - at 0: the arc turns green, a check badge pops in and "SCAN
 *     COMPLETE" pulses — consistent with the scanners' verified state
 *
 * The HUD lives in its own vertical zone between the top HUD and the
 * scanner panel (clamped by viewport height) so it never overlaps them.
 * Sizing uses only universally-supported CSS (min/calc/vmin) so the HUD
 * renders reliably in any modern browser.
 */

const ARC_R = 150
const ARC_C = 2 * Math.PI * ARC_R

export default function CountdownTimer({ seconds = 5, onComplete }) {
  const [remaining, setRemaining] = useState(seconds)
  const doneRef = useRef(false)

  /* Deadline-based countdown — remaining seconds computed from the end
     timestamp, so it never drifts even if renders are throttled. */
  useEffect(() => {
    if (doneRef.current) return
    const deadline = Date.now() + seconds * 1000
    let timer

    const tick = () => {
      const msLeft = deadline - Date.now()
      if (msLeft <= 0) {
        setRemaining(0)
        if (!doneRef.current) {
          doneRef.current = true
          onComplete?.()
        }
        return
      }
      setRemaining(Math.ceil(msLeft / 1000))
      timer = setTimeout(tick, Math.min(1000, msLeft % 1000 || 1000))
    }

    tick()
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds])

  /* Depleting arc: full circle at start, empty at 0 — turns green on done */
  const isComplete = remaining <= 0
  const fraction = seconds > 0 ? remaining / seconds : 0
  const arcOffset = ARC_C * (1 - fraction)

  const box = (x, y) => (
    <rect
      x={x - 2}
      y={y - 2}
      width="4"
      height="4"
      fill="#22d3ee"
      style={{ filter: 'drop-shadow(0 0 4px rgba(34,211,238,0.9))' }}
    />
  )

  const size = 'min(56vmin, calc(100vh - 28rem), 26rem)'

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-20 flex items-center justify-center"
      style={{ top: 'clamp(7rem, 22vh, 12rem)', bottom: 'clamp(8rem, 26vh, 16rem)' }}
    >
      <div className="relative" style={{ width: size, height: size }}>
        {/* HUD rotating rings + depleting progress arc */}
        <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full" fill="none">
          {/* Outer: thick segmented ring, slow clockwise spin */}
          <g
            className="animate-ring-spin [animation-duration:26s!]"
            style={{ transformOrigin: '200px 200px' }}
          >
            <circle
              cx="200" cy="200" r="190"
              stroke="#22d3ee" strokeWidth="8" strokeLinecap="round"
              strokeDasharray="12 34"
              style={{ filter: 'drop-shadow(0 0 10px rgba(34,211,238,0.7))' }}
            />
          </g>

          {/* Middle: thin solid ring + box ornaments, counter-clockwise */}
          <g
            className="animate-ring-spin-rev [animation-duration:18s!]"
            style={{ transformOrigin: '200px 200px' }}
          >
            <circle
              cx="200" cy="200" r="170"
              stroke="rgba(34,211,238,0.6)" strokeWidth="1.5"
              style={{ filter: 'drop-shadow(0 0 8px rgba(34,211,238,0.55))' }}
            />
            {box(370, 200)}
            {box(320.2, 320.2)}
            {box(200, 370)}
            {box(79.8, 320.2)}
            {box(30, 200)}
            {box(79.8, 79.8)}
            {box(200, 30)}
            {box(320.2, 79.8)}
          </g>

          {/* Depleting arc: full at start, shrinks to 0 with remaining time;
              turns green when the scan completes */}
          <circle
            cx="200" cy="200" r={ARC_R}
            stroke={isComplete ? '#34d399' : '#22d3ee'}
            strokeWidth="3" strokeLinecap="round"
            strokeDasharray={`${ARC_C} ${ARC_C}`}
            strokeDashoffset={arcOffset}
            transform="rotate(-90 200 200)"
            style={{
              opacity: isComplete ? 0.95 : 0.85,
              filter: isComplete
                ? 'drop-shadow(0 0 10px rgba(52,211,153,0.9))'
                : 'drop-shadow(0 0 8px rgba(34,211,238,0.8))',
              transition: 'stroke-dashoffset 1s linear, stroke 0.4s ease, filter 0.4s ease',
            }}
          />
        </svg>

        {/* Center: countdown number, or SCAN COMPLETE at 0 */}
        <div className="absolute inset-0 flex items-center justify-center">
          {isComplete ? (
            <div className="flex flex-col items-center">
              <svg
                viewBox="0 0 40 40"
                className="animate-pop-in mb-[2vmin] h-[clamp(2rem,6vmin,3.2rem)] w-[clamp(2rem,6vmin,3.2rem)]"
                fill="none"
              >
                <circle cx="20" cy="20" r="19" stroke="#34d399" strokeWidth="2" fill="rgba(52,211,153,0.15)" style={{ filter: 'drop-shadow(0 0 6px rgba(52,211,153,0.9))' }} />
                <path
                  d="M12 20.5 l5.5 5.5 l10.5 -11"
                  stroke="#34d399" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
                  fill="none"
                  style={{ filter: 'drop-shadow(0 0 5px rgba(52,211,153,0.95))' }}
                />
              </svg>
              <div
                key="done"
                className="animate-complete-pulse select-none text-center font-display text-[clamp(1.9rem,5.5vmin,3.4rem)] font-black uppercase leading-tight tracking-[0.22em] text-verify neon-green"
              >
                Scan
                <br />
                Complete
              </div>
            </div>
          ) : (
            <div
              key={remaining}
              className="animate-count-tick select-none hollow-number font-display text-[clamp(4.5rem,12vmin,9rem)] font-black leading-none tabular-nums"
              style={{
                WebkitTextStroke: 'clamp(2.5px, 0.6vmin, 4.5px) solid rgba(34,211,238,0.95)',
                filter:
                  'drop-shadow(0 0 10px rgba(34,211,238,0.85)) drop-shadow(0 0 38px rgba(34,211,238,0.45))',
              }}
            >
              {remaining}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}