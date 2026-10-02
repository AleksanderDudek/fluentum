import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Lori } from '@/components/brand/Lori'
import { Icon } from '@/components/icons/Icon'
import { cn } from '@/lib/cn'
import { SUPPORT_URL, tipOfTheDay } from './links'

/**
 * The support panel at the end of a screen: Lori in a deep lagoon with her tip for today (worth reading on its
 * own, different tomorrow), then the coffee. Fixed pigments, so it reads as the same panel in both themes.
 */
export function SupportBanner({ dayKey, className }: { dayKey: string; className?: string }) {
  const { t } = useTranslation()
  const titleId = useId()
  return (
    <aside aria-labelledby={titleId} className={cn('support-panel relative overflow-hidden rounded-[2rem] px-6 pt-7 pb-6 sm:px-8', className)}>
      <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:gap-7 sm:text-left">
        <Lori mood="encourage" size={140} decorative className="shrink-0 drop-shadow-[0_10px_18px_rgb(0_0_0/0.35)]" />
        <div className="min-w-0 flex-1">
          <p className="eyebrow">{`${t('support.eyebrow')} · ${t('guide.name')}`}</p>
          <p className="mt-1.5 font-display text-[1.05rem] leading-snug text-(--panel-ink)">{t(tipOfTheDay(dayKey))}</p>
          <div aria-hidden className="my-4 h-px bg-[linear-gradient(90deg,transparent,var(--panel-gold)_20%,var(--panel-gold)_80%,transparent)] opacity-50" />
          <h2 id={titleId} className="text-2xl font-semibold text-(--panel-ink)">
            {t('support.bannerTitle')}
          </h2>
          <p className="mt-1 text-sm text-(--panel-ink-soft)">{t('support.line')}</p>
        </div>
      </div>
      <a
        href={SUPPORT_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('support.buttonLabel')}
        className="mt-5 flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-(--panel-gold) text-lg font-semibold text-(--panel-gold-ink) shadow-[inset_0_0_0_1px_rgb(255_255_255/0.35),0_12px_24px_-14px_rgb(0_0_0/0.8)] transition-[filter,transform] select-none hover:brightness-105 active:scale-[0.98]"
      >
        <Icon name="coffee" size={22} tone="plain" />
        {t('support.button')}
      </a>
      <p className="mt-2 text-center text-xs text-(--panel-ink-soft)">{t('support.note')}</p>
    </aside>
  )
}
