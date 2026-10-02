import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * welcome — greetings, Home · teach — rules and tips · listen — while the microphone is live ·
 * celebrate — goal met, summary · encourage — after a failed attempt · point — directs attention ·
 * rest — empty states, pause.
 */
export type LoriMood = 'welcome' | 'teach' | 'listen' | 'celebrate' | 'encourage' | 'point' | 'rest'

interface Pose {
  /** Rotation of each wing around its shoulder (0 = folded; raised outwards: left positive, right negative). */
  left: number
  right: number
  eyes: 'open' | 'happy' | 'closed'
  beak: 'open' | 'closed'
  /** Head tilt in degrees. */
  tilt: number
}

const POSES: Record<LoriMood, Pose> = {
  welcome: { left: 0, right: -145, eyes: 'happy', beak: 'open', tilt: -4 },
  teach: { left: 115, right: 0, eyes: 'open', beak: 'open', tilt: -6 },
  listen: { left: 0, right: 0, eyes: 'closed', beak: 'closed', tilt: 9 },
  celebrate: { left: 150, right: -150, eyes: 'happy', beak: 'open', tilt: 0 },
  encourage: { left: 0, right: 55, eyes: 'happy', beak: 'closed', tilt: 6 },
  point: { left: 0, right: -95, eyes: 'open', beak: 'closed', tilt: 4 },
  rest: { left: 0, right: 0, eyes: 'closed', beak: 'closed', tilt: -8 },
}

const C = {
  green: '#2fae5a',
  wing: '#1f8a49',
  wingEdge: '#7ad48f',
  blue: '#3f5fe0',
  belly: '#2a3f9e',
  chest: '#ff6a3d',
  chestBar: '#ffb03b',
  nape: '#b5df4a',
  beak: '#ff7a3d',
  beakShade: '#d95a2b',
  eye: '#1b1b2e',
  blush: '#ff8fb1',
  feet: '#9a8a8f',
  branch: '#8a6a4a',
  leaf: '#4fae63',
  gold: '#f2b33d',
  coral: '#ef6a4e',
} as const

function Wing({ side, angle }: { side: 'left' | 'right'; angle: number }) {
  const left = side === 'left'
  const pivot = left ? '68 100' : '132 100'
  const shape = left ? 'M70 96c-20 9-26 38-13 64 11-7 19-30 17-60z' : 'M130 96c20 9 26 38 13 64-11-7-19-30-17-60z'
  const tips = left ? 'M60 138l-6 6M63 147l-5 6M66 128l-6 4' : 'M140 138l6 6M137 147l5 6M134 128l6 4'
  return (
    <g transform={`rotate(${angle} ${pivot})`}>
      <path d={shape} fill={C.wing} stroke={C.wingEdge} strokeWidth="2" strokeLinejoin="round" />
      <path d={tips} stroke={C.wingEdge} strokeWidth="2.4" strokeLinecap="round" />
    </g>
  )
}

function Eyes({ kind }: { kind: Pose['eyes'] }) {
  if (kind === 'happy') {
    return (
      <g fill="none" stroke={C.eye} strokeWidth="3.6" strokeLinecap="round">
        <path d="M80 62q7-9 14 0" />
        <path d="M106 62q7-9 14 0" />
      </g>
    )
  }
  if (kind === 'closed') {
    return (
      <g fill="none" stroke={C.eye} strokeWidth="3.6" strokeLinecap="round">
        <path d="M80 60q7 7 14 0" />
        <path d="M106 60q7 7 14 0" />
      </g>
    )
  }
  return (
    <g>
      <ellipse cx="87" cy="60" rx="8.5" ry="9.5" fill="#fff" />
      <ellipse cx="113" cy="60" rx="8.5" ry="9.5" fill="#fff" />
      <circle cx="88.5" cy="61.5" r="4.8" fill={C.eye} />
      <circle cx="114.5" cy="61.5" r="4.8" fill={C.eye} />
      <circle cx="90" cy="59.5" r="1.7" fill="#fff" />
      <circle cx="116" cy="59.5" r="1.7" fill="#fff" />
    </g>
  )
}

const sparkle = (x: number, y: number, r: number) => `M${x} ${y - r}L${x + r * 0.28} ${y - r * 0.28}L${x + r} ${y}L${x + r * 0.28} ${y + r * 0.28}L${x} ${y + r}L${x - r * 0.28} ${y + r * 0.28}L${x - r} ${y}L${x - r * 0.28} ${y - r * 0.28}Z`

interface LoriProps {
  mood?: LoriMood
  size?: number
  /** Decorative when Lori is already named nearby (e.g. in a GuideBubble). */
  decorative?: boolean
  className?: string
  style?: CSSProperties
}

/** Lori — Fluentum's guide, a rainbow lorikeet (parrots repeat words aloud). Fixed pigments, drawn in code. */
export function Lori({ mood = 'welcome', size = 200, decorative, className, style }: LoriProps) {
  const { t } = useTranslation()
  const pose = POSES[mood]
  const title = decorative ? undefined : t('guide.name')
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      style={style}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {/* the branch */}
      <rect x="26" y="171" width="148" height="10" rx="5" fill={C.branch} />
      <path d="M160 171c6-12 18-14 24-10-4 9-14 13-24 10z" fill={C.leaf} />
      {/* tail */}
      <path d="M88 148l-9 50 21-10 21 10-9-50z" fill={C.green} />
      <path d="M96 154l-2 36 6-4 6 4-2-36z" fill={C.gold} />
      {/* body, belly, chest and nape */}
      <ellipse cx="100" cy="122" rx="40" ry="46" fill={C.green} />
      <ellipse cx="100" cy="142" rx="25" ry="20" fill={C.belly} />
      <ellipse cx="100" cy="110" rx="30" ry="24" fill={C.chest} />
      <g fill="none" stroke={C.chestBar} strokeWidth="2.6" strokeLinecap="round">
        <path d="M84 104q8 4 16 0" />
        <path d="M100 112q8 4 16 0" />
        <path d="M86 118q7 3 13 0" />
      </g>
      <ellipse cx="100" cy="88" rx="30" ry="9" fill={C.nape} />
      {/* feet on the branch */}
      <g fill="none" stroke={C.feet} strokeWidth="5" strokeLinecap="round">
        <path d="M82 168q6 8 12 0" />
        <path d="M106 168q6 8 12 0" />
      </g>
      <Wing side="left" angle={pose.left} />
      <Wing side="right" angle={pose.right} />
      {/* head */}
      <g transform={`rotate(${pose.tilt} 100 70)`}>
        <path d="M88 34q5-16 13-3 6-13 11 3" fill={C.blue} />
        <circle cx="100" cy="62" r="33" fill={C.blue} />
        <ellipse cx="76" cy="75" rx="6" ry="3.6" fill={C.blush} fillOpacity=".6" />
        <ellipse cx="124" cy="75" rx="6" ry="3.6" fill={C.blush} fillOpacity=".6" />
        <Eyes kind={pose.eyes} />
        {pose.beak === 'open' && (
          <g>
            <ellipse cx="100" cy="92" rx="7.5" ry="7" fill="#7a2e24" />
            <ellipse cx="100" cy="96" rx="3.8" ry="2.4" fill="#ff8fa0" />
          </g>
        )}
        <path d="M90 70q10-7 20 0-1 14-10 22-9-8-10-22z" fill={C.beak} />
        <path d="M95 70q5-3 10 0" fill="none" stroke={C.beakShade} strokeWidth="2" strokeLinecap="round" />
      </g>
      {/* what the mood adds */}
      {mood === 'celebrate' && (
        <g fill={C.gold}>
          <path d={sparkle(34, 44, 10)} />
          <path d={sparkle(166, 40, 12)} />
          <path d={sparkle(160, 92, 7)} />
          <path d={sparkle(40, 96, 6)} />
        </g>
      )}
      {mood === 'listen' && (
        <g fill="none" stroke={C.coral} strokeWidth="3.5" strokeLinecap="round">
          <path d="M146 50q7 10 0 20" />
          <path d="M156 42q12 18 0 36" />
        </g>
      )}
      {mood === 'encourage' && <path d="M156 70c-6-8-18-2-12 8l12 12 12-12c6-10-6-16-12-8z" fill={C.coral} />}
      {mood === 'rest' && (
        <g fill={C.blue} fontFamily="ui-sans-serif, system-ui, sans-serif" fontWeight="700">
          <text x="140" y="44" fontSize="18">
            z
          </text>
          <text x="154" y="28" fontSize="13">
            z
          </text>
        </g>
      )}
    </svg>
  )
}
