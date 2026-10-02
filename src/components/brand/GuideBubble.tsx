import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { Lori, type LoriMood } from './Lori'

interface GuideBubbleProps {
  mood?: LoriMood
  children: ReactNode
  actions?: ReactNode
  /** Portrait width in px. */
  size?: number
  compact?: boolean
  /** Heading of the panel; Lori's name by default. */
  title?: string
  className?: string
}

/**
 * Lori speaking: the lorikeet beside a speech bubble headed with her name.
 * Voice: first person, warm, brief, playful, never scolding. One Lori per screen.
 */
export function GuideBubble({ mood = 'teach', children, actions, size = 96, compact, title, className }: GuideBubbleProps) {
  const { t } = useTranslation()
  return (
    <div className={cn('flex items-end gap-1', className)}>
      <Lori mood={mood} size={size} decorative className="-mb-1" />
      <div className={cn('card card-hero relative min-w-0 flex-1', compact ? 'px-3.5 py-3' : 'px-4.5 py-4')}>
        <span aria-hidden className="absolute bottom-[18px] -left-[7px] size-3 rotate-45 border-b border-l border-line-strong bg-surface" />
        <p className="eyebrow">{title ?? t('guide.name')}</p>
        <div className={cn('mt-1 leading-snug text-ink text-pretty', compact ? 'text-[1rem]' : 'text-[1.1rem]')}>{children}</div>
        {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  )
}
