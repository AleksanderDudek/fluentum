import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Icon } from '@/components/icons/Icon'
import { MODE_ICON } from '@/components/modeIcon'
import { Stars } from '@/components/Stars'
import { Card } from '@/components/ui/Card'
import { IconDisc } from '@/components/ui/IconDisc'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProgressBar } from '@/components/ui/Progress'
import { DIALOGUES, dialogueIcon } from '@/content/dialogues'
import { learningLang, type DialogueLevel } from '@/domain/dialogue'
import { nextStep, PRACTICE_MODES, starTotals } from '@/domain/mastery'
import { cn } from '@/lib/cn'
import { courseState } from '@/services/dialogues'
import { useAppSettings } from '@/stores/settings'

const LEVELS: readonly DialogueLevel[] = ['A1', 'A2']

/** The course: every conversation as a stepping stone along a current, by level, with its three stars. */
export default function Conversations() {
  const { t } = useTranslation()
  const { uiLang } = useAppSettings()
  const target = learningLang(uiLang)
  const state = useLiveQuery(() => courseState(target), [target])
  if (!state) return null
  const keys = DIALOGUES.map((d) => d.key)
  const next = nextStep(keys, state)
  const totals = starTotals(keys, state.stars)

  return (
    <>
      <PageHeader eyebrow={t('course.eyebrow')} title={t(`course.title.${target}`)} subtitle={t('course.lead')} />

      <Card framed className="animate-rise">
        <div className="flex items-center justify-between gap-3">
          <p className="font-display text-lg font-semibold">{t('course.stars')}</p>
          <p className="inline-flex items-center gap-1 font-semibold text-gold-ink tabular">
            <Icon name="star" size={18} fillOpacity={1} />
            {totals.earned}/{totals.total}
          </p>
        </div>
        <ProgressBar className="mt-3" tone="gold" value={totals.earned} max={totals.total} label={t('course.stars')} />
        <ul className="mt-4 grid gap-2 sm:grid-cols-3">
          {PRACTICE_MODES.map((mode, index) => (
            <li key={mode} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 inline-flex items-center gap-0.5 text-gold-ink" aria-hidden>
                {Array.from({ length: index + 1 }, (_, i) => (
                  <Icon key={i} name="star" size={12} fillOpacity={1} />
                ))}
              </span>
              <span>
                <span className="font-semibold text-ink">{t(`modes.${mode}.name`)}</span>
                <span className="block text-ink-soft">{t(`modes.${mode}.short`)}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {LEVELS.map((level) => {
        const items = DIALOGUES.filter((d) => d.level === level)
        if (items.length === 0) return null
        const levelTotals = starTotals(
          items.map((d) => d.key),
          state.stars,
        )
        return (
          <section key={level} aria-labelledby={`level-${level}`} className="mt-8">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 id={`level-${level}`} className="text-2xl font-semibold">
                {t(`course.level.${level}`)}
              </h2>
              <span className="text-sm font-semibold text-ink-soft tabular">
                {t('course.levelStars', { earned: levelTotals.earned, total: levelTotals.total })}
              </span>
            </div>
            <ol className="relative space-y-3">
              {/* The current that joins the stones. */}
              <span aria-hidden className="current-line absolute top-6 bottom-6 left-[1.95rem] w-0.5" />
              {items.map((dialogue, index) => {
                const stars = state.stars.get(dialogue.key) ?? []
                const upNext = next?.key === dialogue.key
                return (
                  <li key={dialogue.key} className="relative animate-rise" style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}>
                    <Link
                      to={`/conversations/${dialogue.key}`}
                      className={cn('card card-lift flex items-center gap-4 p-3.5 pr-4', upNext && 'card-hero border-primary')}
                    >
                      <IconDisc
                        icon={dialogueIcon(dialogue)}
                        size={44}
                        iconSize={22}
                        tone={stars.length === 3 ? 'gold' : upNext ? 'sea' : 'sunk'}
                        className="relative z-10 ml-1"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-lg font-semibold">{dialogue.title[uiLang]}</span>
                        <span lang={target} className="block truncate text-sm text-ink-soft italic">
                          {dialogue.title[target]}
                        </span>
                        {upNext && next && (
                          <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold tracking-wide text-primary uppercase">
                            <Icon name={MODE_ICON[next.mode]} size={14} />
                            {t('course.upNext', { mode: t(`modes.${next.mode}.name`) })}
                          </span>
                        )}
                      </span>
                      <Stars stars={stars} size={16} />
                    </Link>
                  </li>
                )
              })}
            </ol>
          </section>
        )
      })}
    </>
  )
}
