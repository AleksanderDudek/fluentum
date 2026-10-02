import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'
import { AchievementBadge } from '@/components/AchievementBadge'
import { Lori } from '@/components/brand/Lori'
import { Icon } from '@/components/icons/Icon'
import { StatTile } from '@/components/progress/StatTile'
import { ShareSessionButton } from '@/components/share/ShareSessionButton'
import { Stars } from '@/components/Stars'
import { SupportBanner } from '@/components/support/SupportBanner'
import { SupportStrip } from '@/components/support/SupportStrip'
import { Button, ButtonLink } from '@/components/ui/Button'
import { buttonClasses } from '@/components/ui/buttonClasses'
import { Pool } from '@/components/ui/Pool'
import { ProgressRing } from '@/components/ui/Progress'
import { dialogueOfText } from '@/content/dialogues'
import { db } from '@/db/schema'
import { computeStreak, dayMarksFrom, levelInfo } from '@/domain/gamification'
import { STAR_XP } from '@/domain/mastery'
import { summarizeRun } from '@/domain/session'
import { dayKeyFor } from '@/domain/time/dayKey'
import { achievementDescription, achievementName, levelName } from '@/i18n/dynamic'
import { startNextStep } from '@/services/dialogues'
import { useAppSettings, useGameState } from '@/stores/settings'
import { toast, useUiStore } from '@/stores/ui'

/** After a conversation: what was said, the star it earned, the day's goal, achievements and the next step. */
export default function Summary() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { runId } = useParams()
  const app = useAppSettings()
  const game = useGameState()
  const clearToasts = useUiStore((s) => s.clearToasts)
  const [startingNext, setStartingNext] = useState(false)
  // Celebration toasts from the last line would cover this screen, which lists them anyway.
  useEffect(() => clearToasts(), [clearToasts])
  const data = useLiveQuery(async () => {
    const run = runId ? await db.sessionRuns.get(runId) : undefined
    if (!run) return null
    const now = Date.now()
    const until = run.endedAt ?? now
    const [daily, achievements, stats] = await Promise.all([
      db.dailyStats.toArray(),
      run.unlocked
        ? db.achievements.bulkGet(run.unlocked).then((rows) => rows.filter((row) => row !== undefined))
        : db.achievements.where('unlockedAt').between(run.startedAt, until, true, true).toArray(),
      db.textStats.get(run.textId),
    ])
    return { run, daily, achievements, stars: stats?.stars ?? [], today: dayKeyFor(now, app.dayStartHour) }
  }, [runId, app.dayStartHour])

  if (data === undefined) return null
  if (data === null) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="text-xl">{t('player.notFound')}</p>
        <ButtonLink to="/">{t('errors.home')}</ButtonLink>
      </main>
    )
  }

  const { run, daily, achievements, stars, today } = data
  const conversation = dialogueOfText(run.textId)?.dialogue
  const summary = summarizeRun(run.entries)
  const todayStats = daily.find((d) => d.dayKey === today)
  const streak = computeStreak(dayMarksFrom(daily), today).current
  const clean = summary.skipped === 0 && summary.accepted > 0
  const shownLines = run.entries.filter((entry) => entry.hinted).length
  const levelBefore = levelInfo(game.totalXp - run.xpEarned).level
  const levelNow = levelInfo(game.totalXp).level

  const next = async () => {
    setStartingNext(true)
    try {
      const started = await startNextStep(run.textId)
      navigate(started ? `/play/${started.id}` : '/conversations', { replace: true })
    } catch {
      toast({ kind: 'error', title: t('conversation.startError') })
      setStartingNext(false)
    }
  }

  return (
    <>
      <SupportStrip />
      <main id="main" className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 pt-6 text-center sm:px-6">
        <Pool glow className="px-5 pt-6 pb-9">
          <Lori mood={clean ? 'celebrate' : 'encourage'} size={164} decorative className="mx-auto animate-rise" />
          <p className="eyebrow mt-2">
            {run.title} · {t(`modes.${run.mode}.name`)}
          </p>
          <h1 className="mt-1 text-4xl font-semibold">{clean ? t('summary.title') : t('summary.titleIncomplete')}</h1>
          {summary.skipped > 0 && <p className="mt-2 text-ink-soft">{t('summary.skipped', { count: summary.skipped })}</p>}

          <div className="mt-4 flex flex-col items-center gap-1.5">
            <Stars stars={stars} size={34} fresh={run.newStar} />
            {run.newStar ? (
              <p className="font-semibold text-gold-ink animate-rise">
                {t('summary.newStar', { mode: t(`modes.${run.newStar}.name`), xp: STAR_XP[run.newStar] })}
              </p>
            ) : !clean ? (
              <p className="text-sm text-ink-soft">{t('summary.noStar')}</p>
            ) : shownLines > 0 ? (
              <p className="text-sm text-ink-soft">{t('summary.shownNoStar', { count: shownLines })}</p>
            ) : (
              stars.length < 3 && <p className="text-sm text-ink-soft">{t('summary.starHint')}</p>
            )}
          </div>

          {levelNow > levelBefore && (
            <p className="mx-auto mt-4 inline-flex rounded-full bg-gold-soft px-4 py-1.5 font-semibold text-gold-ink animate-rise">
              {t('level.up', { name: levelName(t, levelNow) })}
            </p>
          )}

          <div className="mt-6 flex justify-center">
            <ProgressRing value={todayStats?.segmentsAccepted ?? 0} max={app.dailyGoal} label={t('summary.goal')} size={140}>
              <span className="block text-xs font-semibold tracking-wide text-ink-soft uppercase">{t('summary.goal')}</span>
              <span className="block text-2xl font-semibold">{t('summary.goalValue', { done: todayStats?.segmentsAccepted ?? 0, goal: app.dailyGoal })}</span>
            </ProgressRing>
          </div>
        </Pool>

        <dl className="mt-6 grid grid-cols-2 gap-3">
          <StatTile sunk label={t('summary.accepted')} value={`${summary.accepted}/${summary.total}`} />
          <StatTile sunk label={t('summary.firstTry')} value={`${Math.round(summary.firstTryRate * 100)}%`} />
          <StatTile sunk label={t('summary.xp')} value={`+${run.xpEarned}`} />
          <StatTile sunk label={t('summary.streak')} value={String(streak)} />
        </dl>

        {/* The result is worth passing on while it is fresh: right under the numbers. */}
        {summary.accepted > 0 && (
          <section className="card mt-4 p-4 text-left">
            <p className="mb-3 text-sm text-ink-soft">{t('share.sessionInvite')}</p>
            <ShareSessionButton
              variant="gold"
              size="md"
              block
              character={app.character}
              session={{ title: run.title, accepted: summary.accepted, total: summary.total, firstTryRate: summary.firstTryRate, xp: run.xpEarned, streak, stars: stars.length }}
            />
          </section>
        )}

        {achievements.length > 0 && (
          <section className="mt-8 text-left">
            <h2 className="mb-3 text-2xl font-semibold">{t('summary.newAchievements')}</h2>
            <ul className="space-y-2">
              {achievements.map((a, i) => (
                <li key={a.key} className="card flex items-center gap-3 p-3 animate-rise" style={{ animationDelay: `${Math.min(i, 5) * 80}ms` }}>
                  <AchievementBadge tier={a.tier} className="size-11" />
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg font-semibold">{achievementName(t, a.ruleId)}</p>
                    <p className="text-sm text-ink-soft">{achievementDescription(t, a.ruleId)}</p>
                  </div>
                  <span className="tabular text-sm font-semibold text-gold-ink">+{a.xp}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {conversation && (
          <p className="mt-6 text-sm">
            <Link to={`/conversations/${conversation.key}`} className="font-semibold text-primary underline-offset-4 hover:underline">
              {t('summary.again')}
            </Link>
          </p>
        )}

        {/* Just after the app has done something for someone: the support panel, once. */}
        <SupportBanner dayKey={today} className="mt-10 text-left" />

        {/* The next step stays in the thumb zone however long the page gets: one main action, one round one. */}
        <div className="sticky bottom-0 z-10 -mx-5 mt-8 flex items-center gap-3 bg-gradient-to-t from-paper via-paper/95 to-transparent px-5 pt-6 pb-[max(env(safe-area-inset-bottom),1rem)] sm:-mx-6 sm:px-6">
          <Link to="/" aria-label={t('summary.home')} title={t('summary.home')} className={buttonClasses({ variant: 'secondary', size: 'lg', className: 'w-14 shrink-0 px-0' })}>
            <Icon name="house-simple" size={22} />
          </Link>
          <Button size="lg" icon="play" iconFill className="flex-1" disabled={startingNext} onClick={() => void next()}>
            {t('summary.next')}
          </Button>
        </div>
      </main>
    </>
  )
}
