import { Icon } from '@/components/icons/Icon'
import type { Tier } from '@/domain/types'
import { cn } from '@/lib/cn'

/**
 * A medal: a tier-metal disc with a darker rim, a light ring and a star. Tier sets the metal.
 * Locked → dashed outline with a lock.
 */
export function AchievementBadge({ tier, locked = false, className }: { tier: Tier; locked?: boolean; className?: string }) {
  if (locked) {
    return (
      <span className={cn('inline-flex items-center justify-center rounded-full border-2 border-dashed border-line-strong text-ink-faint', className)}>
        <Icon name="lock-simple" className="size-1/3" />
      </span>
    )
  }
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={cn('shrink-0 drop-shadow-sm', className)}>
      <circle cx="24" cy="24" r="22" fill={`var(--tier-${tier})`} stroke={`var(--tier-${tier}-ring)`} strokeWidth="3" />
      <circle cx="24" cy="24" r="16" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="1.4" />
      <path d="M24 13.5l3.1 6.6 7.2.8-5.4 4.9 1.5 7.1L24 29.3l-6.4 3.6 1.5-7.1-5.4-4.9 7.2-.8z" fill="#fff" fillOpacity=".92" />
      <path d="M10 18a16 16 0 0 1 9-8" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
