import type { CSSProperties } from 'react'
import { PHOSPHOR, type PhosphorName } from './phosphor'

export type IconName = PhosphorName

/** Colour of the fill layer: sunny gold by default, the text colour for status/inactive icons. */
export type IconTone = 'accent' | 'plain' | 'sea' | 'coral' | 'none'

const TONES: Record<IconTone, string> = {
  accent: 'var(--icon-fill)',
  plain: 'currentColor',
  sea: 'var(--sea)',
  coral: 'var(--coral)',
  none: 'transparent',
}

interface IconProps {
  name: IconName
  /** Pixel size; without it the icon is 1em and a `size-*` class can set it. */
  size?: number
  tone?: IconTone
  /** Opacity of the fill layer (1 = solid, e.g. the play triangle). */
  fillOpacity?: number
  /** Accessible name; icons are decorative (aria-hidden) without one. */
  label?: string
  className?: string
  style?: CSSProperties
}

/** Phosphor Duotone icon: an outline in the text colour over a coloured fill layer (generated paths, 256 grid). */
export function Icon({ name, size, tone = 'accent', fillOpacity, label, className, style }: IconProps) {
  const opacity = fillOpacity ?? (tone === 'plain' ? 0.18 : tone === 'none' ? 0 : 0.6)
  const { fill, line } = PHOSPHOR[name]
  return (
    <svg
      viewBox="0 0 256 256"
      width={size ?? '1em'}
      height={size ?? '1em'}
      className={className}
      style={{ flexShrink: 0, ...style }}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
      focusable="false"
    >
      <g fill={TONES[tone]} fillOpacity={opacity}>
        {fill.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <g fill="currentColor">
        {line.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  )
}
