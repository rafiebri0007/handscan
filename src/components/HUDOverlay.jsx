import { useEffect, useRef, useState } from 'react'

/**
 * HUDOverlay — Top-of-viewport HUD: scrambled futuristic title, live system
 * status pill, segmented sci-fi progress bar with percentage counter, and
 * corner readouts. Pure presentation — all state is driven by props from App.
 */

const SCRAMBLE_CHARS = '!<>-_\\/[]{}—=+*^?#$%&;:'

/* ---------------------- Text Scramble (GSAP ticker) ----------------------- */
function ScrambleText({ text, className, delay = 0, duration = 1800 }) {
  const [display, setDisplay] = useState(() => text.split('').map(() => ' ').join(''))

  useEffect(() => {
    const startedAt = performance.now() + delay
    const jitter = text.split('').map(() => Math.random() * 0.22)
    let rafId

    const step = (now) => {
      if (now < startedAt) {
        rafId = requestAnimationFrame(step)
        return
      }
      const p = Math.min(1, (now - startedAt) / duration)
      const eased = 1 - Math.pow(1 - p, 3)

      let out = ''
      for (let i = 0; i < text.length; i++) {
        if (text[i] === ' ') {
          out += ' '
          continue
        }
        const revealAt = (i / text.length) * 0.85 + jitter[i] * 0.15
        if (eased >= revealAt) out += text[i]
        else if (Math.random() < 0.8) out += SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0]
        else out += text[i]
      }
      setDisplay(out)
      if (p < 1) rafId = requestAnimationFrame(step)
    }

    rafId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafId)
  }, [text, delay, duration])

  return <span className={className}>{display}</span>
}

/* ----------------------------- Corner readouts ---------------------------- */
function CornerReadout({ className, children }) {
  return (
    <div className={`hidden md:block font-display text-[10px] tracking-[0.3em] text-mentari/60 ${className}`}>
      {children}
    </div>
  )
}

/* ----------------------------- Subtitles per phase ------------------------ */
const SUBTITLES = {
  boot: 'Initializing...',
  ready: 'Get Ready...',
  scanning: 'Scanning...',
}

/* ----------------------------- Status mapping ----------------------------- */
function getStatusText(phase, scanned) {
  switch (phase) {
    case 'boot':
      return 'SYSTEM STATUS: INITIALIZING...'
    case 'ready':
      return 'SYSTEM STATUS: READY FOR SCAN'
    case 'scanning':
      return scanned >= 2
        ? 'SYSTEM STATUS: SCAN COMPLETE — 2/2 PALMS'
        : `SYSTEM STATUS: SCANNING — ${scanned}/2 PALMS`
    case 'warp':
      return 'ACCESS GRANTED — LOADING COMPLETED 100%'
    case 'dashboard':
      return 'SESSION COMPLETE — WELCOME ABOARD'
    default:
      return 'SYSTEM STATUS: STANDBY'
  }
}

/* -------------------------------- Main HUD -------------------------------- */
export default function HUDOverlay({ progress = 0, scanned = 0, phase = 'boot', compact = false, title = 'BRILiaN CULTURE FEST 2026', title2 = "BO BANYUWANGI" }) {
  const percent = Math.round(progress)
  const SEGMENTS = 24
  const filledSegments = Math.round((progress / 100) * SEGMENTS)
  const statusText = getStatusText(phase, scanned)
  const done = scanned >= 2
  const statusColor =
    phase === 'warp' || phase === 'dashboard' || (phase === 'scanning' && done)
      ? 'text-verify'
      : phase === 'ready'
        ? 'text-mentari'
        : 'text-neon-cyan'

  const statusDot =
    phase === 'warp' || phase === 'dashboard' || (phase === 'scanning' && done)
      ? 'bg-verify shadow-[0_0_12px_rgba(52,211,153,1)] animate-dot-pulse'
      : phase === 'scanning'
        ? 'bg-neon-cyan shadow-[0_0_12px_rgba(34,211,238,1)] animate-laser-blink'
        : 'bg-mentari shadow-[0_0_10px_rgba(113,197,232,0.9)] animate-dot-pulse'

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col items-center px-4 pt-5 sm:pt-8">
      {/* ----------------------------- Corner readouts ----------------------------- */}
      <CornerReadout className="absolute left-6 top-6">
        BCF-2026 // HANDSCAN.SYS v2.0
      </CornerReadout>
      <CornerReadout className="absolute right-6 top-6 text-right">
        SECTOR 07 — CEREMONY GATE
      </CornerReadout>
      <CornerReadout className="absolute bottom-44 left-6">
        BRI × DANANTARA INDONESIA
      </CornerReadout>
      <CornerReadout className="absolute bottom-44 right-6 text-right">
        ENCRYPTION: AES-256 ● LINK: STABLE
      </CornerReadout>

      {/* ------------------------------- Badge + title ----------------------------- */}

      <h1 className={[
        'text-center font-display font-extrabold uppercase leading-tight tracking-[0.12em] text-white neon-white transition-all duration-700',
        compact ? 'text-xs opacity-20 sm:text-sm' : 'text-2xl sm:text-4xl lg:text-5xl',
      ].join(' ')}>
        <ScrambleText text={title} delay={300} duration={2000} />
      </h1>
      <h1 className={[
        'text-center font-display font-extrabold uppercase leading-tight tracking-[0.12em] text-white neon-white transition-all duration-700',
        compact ? 'text-xs opacity-20 sm:text-sm' : 'text-2xl sm:text-4xl lg:text-5xl',
      ].join(' ')}>
        <ScrambleText text={title2} delay={300} duration={2000} />
      </h1>

      {!compact && (
        <p className="mt-2 font-display text-[11px] font-semibold uppercase tracking-[0.45em] text-neon-cyan neon-cyan sm:text-sm">
          {SUBTITLES[phase] ?? 'Standby'}
        </p>
      )}

      {/* --------------------------------- Status pill ------------------------------ */}
      <div
        className={[
          'inline-flex items-center gap-2.5 rounded-full border border-mentari/30 bg-ink/60 px-4 py-2 text-[11px] font-semibold tracking-[0.18em] backdrop-blur transition-colors duration-500 sm:text-xs',
          compact ? 'mt-4' : 'mt-6',
          statusColor,
        ].join(' ')}
      >
        <span className={`h-2.5 w-2.5 flex-none rounded-full ${statusDot}`} />
        {statusText}
      </div>

      {/* ------------------------------ Progress panel ----------------------------- */}
      <div className="mt-4 w-full max-w-xl">
        <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.22em] sm:text-xs">
          <span className="text-mentari">SYSTEM LOAD</span>
          <span className="font-display text-neon-cyan neon-cyan tabular-nums">[{String(percent).padStart(3, '0')}%]</span>
        </div>

        <div className="sci-fi-panel h-10 w-full p-2.5">
          <div className="relative flex h-full w-full items-stretch gap-1 overflow-hidden">
            {Array.from({ length: SEGMENTS }).map((_, i) => (
              <div
                key={i}
                className={`progress-segment ${i < filledSegments ? 'progress-segment--filled' : ''}`}
              />
            ))}
            {progress > 0 && (
              <div
                className="pointer-events-none absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[sheen_1.2s_linear_infinite]"
                style={{ transform: 'translateX(-100%)' }}
              />
            )}
          </div>
        </div>

        <div className="mt-1.5 flex justify-center text-[9px] uppercase tracking-[0.25em] text-white/35">
          <span>Hold on Screen</span>
        </div>
      </div>
    </div>
  )
}
