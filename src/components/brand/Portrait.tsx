import type { CSSProperties } from 'react'

/*
 * Fluentum portraits: flat, friendly head-and-shoulders drawings in a few round shapes. Pigments are fixed (not
 * themed), so a portrait looks the same in light and dark and serialises cleanly into a shared image.
 */
const SKIN = [
  { base: '#f6d7bd', shade: '#e2b597' },
  { base: '#e8b994', shade: '#cf9873' },
  { base: '#c98d62', shade: '#a8704a' },
  { base: '#9a603e', shade: '#7c4a2e' },
  { base: '#6b4128', shade: '#53301d' },
] as const
const HAIR = { dark: '#2a1d17', black: '#16100d', brown: '#5b3a24', auburn: '#9a3f1f', blonde: '#d9a94f', grey: '#a9a39b' } as const
const SHIRT = {
  teal: ['#0b6b66', '#08534f'],
  coral: ['#e0573f', '#b8432f'],
  sun: ['#f2b33d', '#c98f22'],
  sky: ['#3d8bd4', '#2d6ea9'],
  plum: ['#7a4bb0', '#5f3990'],
  leaf: ['#2e8b57', '#226b43'],
  navy: ['#1f3b5c', '#152a43'],
  sand: ['#d9b98c', '#b9976a'],
} as const
const INK = '#1d2b2f'

export type Skin = 0 | 1 | 2 | 3 | 4
export type Hair = keyof typeof HAIR
export type Shirt = keyof typeof SHIRT
export type HairStyle = 'short' | 'long' | 'bob' | 'bun' | 'puff' | 'coils'
export type Expression = 'smile' | 'talk' | 'calm'

export interface PortraitProps {
  skin: Skin
  hair: Hair
  hairStyle: HairStyle
  shirt: Shirt
  beard?: boolean
  glasses?: boolean
  earrings?: boolean
  expression?: Expression
  /** A raised hand, waving. */
  wave?: boolean
  size?: number
  /** Accessible name; decorative (hidden) without one. */
  title?: string
  className?: string
  style?: CSSProperties
}

/** Hair drawn behind the head (long and bob cuts, the afro puff). */
function BackHair({ style, color }: { style: HairStyle; color: string }) {
  if (style === 'long') {
    return <path d="M57 84C53 50 77 34 100 34s47 16 43 50l5 78c-16 7-30-6-28-20H80c2 14-12 27-28 20z" fill={color} />
  }
  if (style === 'bob') {
    return <path d="M55 86C52 50 78 36 100 36s48 14 45 50l2 44c-10 7-22 3-25-5H78c-3 8-15 12-25 5z" fill={color} />
  }
  if (style === 'puff') {
    return (
      <g fill={color}>
        {[
          [62, 70, 20],
          [138, 70, 20],
          [72, 46, 22],
          [128, 46, 22],
          [100, 34, 26],
          [56, 96, 15],
          [144, 96, 15],
        ].map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
        ))}
      </g>
    )
  }
  return null
}

/** Hair drawn over the forehead. */
function FrontHair({ style, color }: { style: HairStyle; color: string }) {
  switch (style) {
    case 'short':
      return <path d="M62 90C58 54 80 40 102 41c25 1 42 18 36 50-7-17-21-27-38-27-17 0-30 9-38 26z" fill={color} />
    case 'long':
      return <path d="M62 88c0-30 21-42 42-41 20 1 36 15 34 41-12-16-30-22-46-20-13 2-23 9-30 20z" fill={color} />
    case 'bob':
      return <path d="M61 88c0-29 18-42 39-42s39 13 39 42c-6-6-12-12-14-19-8 6-21 9-34 8-13-1-22-5-27-9-1 8-1 14-3 20z" fill={color} />
    case 'bun':
      return (
        <g fill={color}>
          <circle cx="100" cy="34" r="17" />
          <path d="M62 90C58 56 79 43 100 43s42 13 38 47c-8-16-22-25-38-25s-30 9-38 25z" />
        </g>
      )
    case 'puff':
      return <path d="M63 86c2-24 18-36 37-36s35 12 37 36c-10-12-23-17-37-17s-27 5-37 17z" fill={color} />
    case 'coils':
      return (
        <g fill={color}>
          <path d="M61 88c-3-33 17-47 39-47s42 14 39 47c-8-14-22-21-39-21s-31 7-39 21z" />
          {[66, 76, 87, 98, 109, 120, 131].map((cx, i) => (
            <circle key={cx} cx={cx} cy={[64, 54, 48, 46, 48, 54, 64][i]} r="8" />
          ))}
          {[80, 92, 104, 116].map((cx) => (
            <circle key={`top-${cx}`} cx={cx} cy={40} r="7" />
          ))}
        </g>
      )
  }
}

/** A head-and-shoulders portrait (viewBox 200 × 220). */
export function Portrait({
  skin,
  hair,
  hairStyle,
  shirt,
  beard,
  glasses,
  earrings,
  expression = 'smile',
  wave,
  size = 200,
  title,
  className,
  style,
}: PortraitProps) {
  const tone = SKIN[skin]
  const hairColor = HAIR[hair]
  const [cloth, clothShade] = SHIRT[shirt]
  return (
    <svg
      viewBox="0 0 200 220"
      width={size}
      height={(size * 220) / 200}
      className={className}
      style={style}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <BackHair style={hairStyle} color={hairColor} />
      {/* shoulders and shirt */}
      <path d="M26 220c0-46 32-70 74-70s74 24 74 70z" fill={cloth} />
      <path d="M78 152c6 14 14 21 22 21s16-7 22-21" fill="none" stroke={clothShade} strokeWidth="5" strokeLinecap="round" />
      {wave && (
        <g>
          <path d="M150 176c10-14 16-34 20-52" fill="none" stroke={cloth} strokeWidth="22" strokeLinecap="round" />
          <circle cx="172" cy="110" r="14" fill={tone.base} />
          {[-28, -10, 8, 26].map((angle) => (
            <rect key={angle} x="168.5" y="86" width="7" height="16" rx="3.5" fill={tone.base} transform={`rotate(${angle} 172 110)`} />
          ))}
          <path d="M184 92c5 3 8 8 9 13M188 84c7 4 11 11 12 18" fill="none" stroke={INK} strokeOpacity=".35" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )}
      {/* neck */}
      <rect x="86" y="118" width="28" height="40" rx="12" fill={tone.base} />
      <path d="M86 130c8 7 20 7 28 0v-8H86z" fill={tone.shade} />
      {/* ears and head */}
      <ellipse cx="62" cy="96" rx="7" ry="10" fill={tone.base} />
      <ellipse cx="138" cy="96" rx="7" ry="10" fill={tone.base} />
      {earrings && (
        <g fill="#f2b33d">
          <circle cx="61" cy="111" r="3.5" />
          <circle cx="139" cy="111" r="3.5" />
        </g>
      )}
      <ellipse cx="100" cy="90" rx="38" ry="44" fill={tone.base} />
      {beard && (
        <path d="M63 98c2 30 16 46 37 46s35-16 37-46c-6 15-14 24-24 26-5-4-21-4-26 0-10-2-18-11-24-26z" fill={hairColor} />
      )}
      <FrontHair style={hairStyle} color={hairColor} />
      {/* face */}
      <g stroke={hairColor === HAIR.grey ? '#6f6a64' : hairColor} strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M78 79q7-4 14-1" />
        <path d="M108 78q7-3 14 1" />
      </g>
      {expression === 'calm' ? (
        <g stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M80 93q5 4 10 0" />
          <path d="M110 93q5 4 10 0" />
        </g>
      ) : (
        <g>
          <ellipse cx="85" cy="92" rx="4.2" ry="5.2" fill={INK} />
          <ellipse cx="115" cy="92" rx="4.2" ry="5.2" fill={INK} />
          <circle cx="86.6" cy="90" r="1.4" fill="#fff" />
          <circle cx="116.6" cy="90" r="1.4" fill="#fff" />
        </g>
      )}
      {glasses && (
        <g fill="none" stroke={INK} strokeWidth="2.6">
          <rect x="73" y="83" width="24" height="18" rx="7" />
          <rect x="103" y="83" width="24" height="18" rx="7" />
          <path d="M97 90q3-2 6 0" />
        </g>
      )}
      <path d="M100 96q-4 9 1 11" fill="none" stroke={tone.shade} strokeWidth="2.6" strokeLinecap="round" />
      <g fill="#ff8f7a" fillOpacity=".28">
        <circle cx="76" cy="106" r="6" />
        <circle cx="124" cy="106" r="6" />
      </g>
      {expression === 'talk' ? (
        <path d="M89 113q11 3 22 0-2 12-11 12t-11-12z" fill="#7a2e24" />
      ) : (
        <path d="M88 114q12 9 24 0" fill="none" stroke="#8a3b2e" strokeWidth="3" strokeLinecap="round" />
      )}
      {beard && <path d="M88 110q12-5 24 0" fill="none" stroke={hairColor} strokeWidth="5" strokeLinecap="round" />}
    </svg>
  )
}
