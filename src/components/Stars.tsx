import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/icons/Icon'
import { PRACTICE_MODES, type PracticeMode } from '@/domain/mastery'
import { cn } from '@/lib/cn'

/**
 * A conversation's three stars — one per way (read, prompt, recall), filled once earned. Named as a whole for
 * assistive tech ("2 of 3 stars: Read, Prompt").
 */
export function Stars({ stars, size = 18, className, fresh }: { stars: readonly PracticeMode[]; size?: number; className?: string; fresh?: PracticeMode }) {
  const { t } = useTranslation()
  const earned = PRACTICE_MODES.filter((mode) => stars.includes(mode))
  const label = earned.length === 0 ? t('stars.none') : t('stars.label', { count: earned.length, ways: earned.map((mode) => t(`modes.${mode}.name`)).join(', ') })
  return (
    <span role="img" aria-label={label} title={label} className={cn('inline-flex items-center gap-0.5', className)}>
      {PRACTICE_MODES.map((mode) => {
        const on = stars.includes(mode)
        return (
          <Icon
            key={mode}
            name="star"
            size={size}
            tone={on ? 'accent' : 'none'}
            fillOpacity={on ? 1 : 0}
            className={cn(on ? 'text-gold-ink' : 'text-line-strong', fresh === mode && 'animate-pop')}
          />
        )
      })}
    </span>
  )
}
