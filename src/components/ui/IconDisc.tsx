import type { ReactNode } from 'react'
import { Icon, type IconName, type IconTone } from '@/components/icons/Icon'
import { cn } from '@/lib/cn'

export type DiscTone = 'gold' | 'sea' | 'sunk' | 'coral' | 'frost'

const TONE_CLASS: Record<DiscTone, string> = {
  gold: 'disc',
  sea: 'disc disc-sea',
  sunk: 'disc disc-sunk',
  coral: 'disc disc-coral',
  frost: 'disc disc-frost',
}

interface IconDiscProps {
  icon?: IconName
  /** Disc diameter in px. */
  size?: number
  iconSize?: number
  tone?: DiscTone
  iconTone?: IconTone
  /** Solid fill layer (the play triangle). */
  iconFill?: boolean
  className?: string
  children?: ReactNode
}

/** An icon on a round disc. Gold for what is earned; teal (sea) for play; sunk for neutral; coral for the voice; frost for a freeze. */
export function IconDisc({ icon, size = 44, iconSize, tone = 'gold', iconTone, iconFill, className, children }: IconDiscProps) {
  const fallbackTone: IconTone = tone === 'coral' || tone === 'frost' ? 'plain' : 'accent'
  return (
    <span className={cn(TONE_CLASS[tone], className)} style={{ width: size, height: size }}>
      {icon ? <Icon name={icon} size={iconSize ?? Math.round(size * 0.5)} tone={iconTone ?? fallbackTone} fillOpacity={iconFill ? 1 : undefined} /> : children}
    </span>
  )
}
