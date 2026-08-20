import { useEffect, useId, useRef } from 'react'
import gsap from 'gsap'
import handImg from '../images/hand.png'

/**
 * HandScanner — Circular SVG palm scanner node.
 *
 * State machine:
 *   idle     -> soft cyan breathe, red LED (waiting for input)
 *   scanning -> laser beam sweeps across the palm (GSAP yoyo), cyan LED
 *   verified -> green LED with ping halo, palm turns green, gold check badge
 *
 * The palm itself is `src/images/hand.png` (white silhouette w/ alpha). It is
 * re-tinted per state by masking a solid rect with the PNG's alpha channel,
 * which keeps the neon aesthetic while reusing the photo-real asset.
 *
 * Props:
 *   index   {number}  0..1 — node id (both nodes show a right palm)
 *   status  {string}  'idle' | 'scanning' | 'verified'
 *   disabled{boolean} blocks interaction (used during boot)
 */

/* Hand image placement inside the 200x200 scanner viewBox */
const PALM_SIZE = 100
const PALM_X = (200 - PALM_SIZE) / 2
const PALM_Y = (200 - PALM_SIZE) / 2

const STATE_COLORS = {
  idle: {
    stroke: 'rgba(113, 197, 232, 0.6)',
    ring: 'rgba(113, 197, 232, 0.35)',
    led: '#f87171',
    ledGlow: 'rgba(248, 113, 113, 0.9)',
    glowClass: 'palm-glow-cyan',
  },
  scanning: {
    stroke: '#307fe2',
    ring: 'rgba(113, 197, 232, 0.9)',
    led: '#22d3ee',
    ledGlow: 'rgba(34, 211, 238, 1)',
    glowClass: 'palm-glow-blue',
  },
  verified: {
    stroke: '#34d399',
    ring: 'rgba(52, 211, 153, 0.8)',
    led: '#34d399',
    ledGlow: 'rgba(52, 211, 153, 1)',
    glowClass: 'palm-glow-green',
  },
}

export default function HandScanner({ index, status = 'idle', disabled = false }) {
  const laserRef = useRef(null)
  const maskId = useId().replace(/:/g, '')
  const colors = STATE_COLORS[status]
  const isScanning = status === 'scanning'
  const isVerified = status === 'verified'

  /* GSAP laser sweep — vertical yoyo across the palm while scanning */
  useEffect(() => {
    if (isScanning && laserRef.current) {
      const tween = gsap.to(laserRef.current, {
        top: '84%',
        duration: 0.95,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        repeatDelay: 0.08,
        overwrite: true,
      })
      return () => tween.kill()
    }
    if (laserRef.current) gsap.set(laserRef.current, { top: '10%', clearProps: 'all' })
  }, [isScanning])

  return (
    <button
      type="button"
      aria-label={`Area pindai telapak tangan${isVerified ? ' — terverifikasi' : ''}`}
      aria-pressed={isScanning}
      disabled={disabled || isVerified}
      className={[
        'group relative h-20 w-20 sm:h-28 sm:w-28 md:h-36 md:w-36 flex-none',
        'rounded-full transition-transform duration-200 active:scale-95',
        disabled ? 'cursor-default' : 'cursor-pointer',
      ].join(' ')}
    >
      {/* ----------------------------- SVG core ----------------------------- */}
      <svg viewBox="0 0 200 200" className="h-full w-full" fill="none" draggable="false">
        {/* Outer base ring */}
        <circle
          cx="100" cy="100" r="88"
          stroke={colors.ring}
          strokeWidth="1.5"
          className={status === 'idle' ? 'hand-ring-idle' : ''}
        />

        {/* Rotating main tick ring (60 ticks) */}
        <g className={isScanning ? 'animate-ring-spin [animation-duration:6s!]' : 'animate-ring-spin'} style={{ transformOrigin: '100px 100px' }}>
          <circle
            cx="100" cy="100" r="92"
            stroke="rgba(113, 197, 232, 0.85)"
            strokeWidth="4"
            strokeDasharray="1.4 8.23"
            strokeLinecap="round"
          />
        </g>

        {/* Counter-rotating sub-degree markers (120 ticks) */}
        <g className="animate-ring-spin-rev" style={{ transformOrigin: '100px 100px' }}>
          <circle
            cx="100" cy="100" r="78"
            stroke="rgba(59, 130, 246, 0.5)"
            strokeWidth="2"
            strokeDasharray="0.8 3.28"
            strokeLinecap="round"
          />
        </g>

        {/* Hand photo (hand.png) re-tinted per state via alpha mask.
          Both nodes use the same right-hand orientation (no mirroring). */}
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">
            <image
              href={handImg}
              x={PALM_X}
              y={PALM_Y}
              width={PALM_SIZE}
              height={PALM_SIZE}
              preserveAspectRatio="xMidYMid meet"
            />
          </mask>
        </defs>
        <g className={colors.glowClass}>
          <rect
            x={PALM_X}
            y={PALM_Y}
            width={PALM_SIZE}
            height={PALM_SIZE}
            fill={colors.stroke}
            mask={`url(#${maskId})`}
          />
        </g>

        {/* LED status light */}
        <circle cx="100" cy="19" r="5.5" fill={colors.led} style={{ filter: `drop-shadow(0 0 6px ${colors.ledGlow})` }} className={status === 'idle' ? 'animate-dot-pulse' : ''} />
        {isVerified && (
          <circle cx="100" cy="19" r="11" stroke="rgba(52, 211, 153, 0.7)" strokeWidth="2" fill="none" className="animate-ring-ping" />
        )}

        {/* Gold check badge (verified) */}
        {isVerified && (
          <g className="animate-pop-in" style={{ transformOrigin: '100px 182px' }}>
            <circle cx="100" cy="182" r="13" fill="rgba(245, 197, 24, 0.15)" stroke="#f5c518" strokeWidth="2" />
            <path
              d="M94 182 l4.5 4.5 l8 -8.5"
              stroke="#f5c518"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              style={{ filter: 'drop-shadow(0 0 6px rgba(245,197,24,0.9))' }}
            />
          </g>
        )}

        {/* Scan progress arc while scanning */}
        {isScanning && (
          <circle
            cx="100" cy="100" r="84"
            stroke="#22d3ee"
            strokeWidth="2"
            strokeDasharray="44 484"
            strokeLinecap="round"
            className="animate-ring-spin"
            style={{ transformOrigin: '100px 100px', opacity: 0.9 }}
          />
        )}
      </svg>

      {/* ------------------------- Laser beam (DOM) ------------------------- */}
      <div
        ref={laserRef}
        className="laser-scan"
        style={{ opacity: isScanning ? 1 : 0 }}
      />
    </button>
  )
}
