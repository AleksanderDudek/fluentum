import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { Avatar } from '@/components/brand/Avatar'
import { GuideBubble } from '@/components/brand/GuideBubble'
import { GoldenQuarterHour } from '@/components/GoldenQuarterHour'
import { Icon } from '@/components/icons/Icon'
import { LevelBar } from '@/components/LevelBar'
import { ShareDayButton } from '@/components/share/ShareDayButton'
import { sharedMinutes } from '@/components/share/shareText'
import { MODE_ICON } from '@/components/modeIcon'
import { Stars } from '@/components/Stars'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { IconDisc } from '@/components/ui/IconDisc'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProgressBar, ProgressRing } from '@/components/ui/Progress'
import { dialogueIcon } from '@/content/dialogues'
import { learningLang } from '@/domain/dialogue'
import { dayKeyToLocalDate } from '@/domain/time/dayKey'
import { useHome } from '@/hooks/useHome'
import { startDialogue } from '@/services/dialogues'
import { resumeRun, RunError } from '@/services/runs'
import { updateGameState, updateMeta } from '@/services/settings'
import { useSettingsStore } from '@/stores/settings'
import { toast } from '@/stores/ui'

const BACKUP_EVERY_MS = 30 * 86_400_000

function greetingKey(hour: number) {
  if (hour >= 4 && hour < 11) return 'home.greetingMorning' as const
  if (hour >= 18 || hour < 4) return 'home.greetingEvening' as const
  return 'home.greetingDay' as const
}

export default function Home() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const app = useSettingsStore((s) => s.app)
  const game = useSettingsStore((s) => s.game)
  const meta = useSettingsStore((s) => s.meta)
  const data = useHome(app.dayStartHour, app.uiLang)
  const [now] = useState(() => Date.now())
  const [starting, setStarting] = useState(false)

  if (!data) return null
  const target = learningLang(app.uiLang)
  const done = data.todayStats?.segmentsAccepted ?? 0
  const left = Math.max(0, app.dailyGoal - done)
  const date = new Intl.DateTimeFormat(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' }).format(dayKeyToLocalDate(data.today))
  const lastBackup = meta.lastBackupAt ?? meta.installedAt
  const showBackup = data.hasActivity && now - lastBackup > BACKUP_EVERY_MS && now - (meta.backupReminderSnoozedAt ?? 0) > BACKUP_EVERY_MS
  const { resumable, next } = data

  const begin = async () => {
    setStarting(true)
    try {
      if (resumable) {
        await resumeRun(resumable.id)
        return navigate(`/play/${resumable.id}`)
      }
      if (!next) return
      const run = await startDialogue(next.dialogue.key, next.mode)
      navigate(`/play/${run.id}`)
    } catch (error) {
      if (error instanceof RunError) toast({ kind: 'error', title: t('conversation.startError') })
      else throw error
    } finally {
      setStarting(false)
    }
  }

  const freezeDays = game.pendingFreezeNotice
    .map((day) => new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'long' }).format(dayKeyToLocalDate(day)))
    .join(', ')

  const guide = !data.hasActivity
    ? t('home.guideFirst', { language: t(`languages.${target}.in`) })
    : left === 0
      ? t('home.guideDone')
      : done === 0
        ? t('home.guideStart')
        : t('home.guideLeft', { count: left })

  return (
    <>
      <PageHeader
        eyebrow={date}
        title={t(greetingKey(new Date(now).getHours()))}
        actions={
          <Link
            to="/settings?section=character"
            aria-label={t('home.yourCharacter', { name: t(`characters.${app.character}`) })}
            className="rounded-full transition-transform hover:-translate-y-0.5"
          >
            <Avatar id={app.character} size={48} decorative />
          </Link>
        }
      />

      {game.pendingFreezeNotice.length > 0 && (
        <Card className="mb-4 flex items-start gap-3 border-frost/40 bg-frost-soft animate-rise">
          <IconDisc icon="snowflake" tone="frost" size={36} iconSize={20} className="-mt-1" />
          <p className="flex-1 text-sm font-medium text-ink">{t('home.freezeNotice', { count: game.pendingFreezeNotice.length, days: freezeDays })}</p>
          <Button size="sm" variant="ghost" onClick={() => void updateGameState({ pendingFreezeNotice: [] })}>
            {t('common.close')}
          </Button>
        </Card>
      )}

      {/* The day: streak, goal and the golden quarter-hour. */}
      <section className="card card-hero relative overflow-hidden p-6 animate-rise">
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-20 size-60 rounded-full bg-[color-mix(in_oklab,var(--coral-bright)_22%,transparent)] blur-3xl" />
        <div className="relative flex items-center justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <IconDisc icon="flame" tone="coral" size={54} iconSize={30} iconTone="coral" />
              <div>
                <p className="font-display text-4xl leading-none font-semibold">{data.streak.current}</p>
                <p className="mt-1 text-sm font-semibold text-ink-soft">
                  {data.streak.current > 0 ? t('home.streak', { count: data.streak.current }) : t('home.streakZero')}
                </p>
              </div>
            </div>
            {data.streak.atRisk && <p className="mt-3 text-sm font-medium text-near">{t('home.atRisk')}</p>}
            {game.freezesAvailable > 0 && (
              <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-frost">
                <Icon name="snowflake" size={16} tone="plain" /> {t('home.freezes', { count: game.freezesAvailable })}
              </p>
            )}
          </div>
          <ProgressRing value={done} max={app.dailyGoal} label={t('home.goal')} size={116}>
            <span className="block font-display text-3xl leading-none font-semibold">{done}</span>
            <span className="tabular block text-xs font-semibold text-ink-soft">/ {app.dailyGoal}</span>
          </ProgressRing>
        </div>
        <p className="relative mt-4 text-sm font-medium text-ink-soft">
          {t('home.goal')}: {left === 0 ? t('home.goalDone') : t('home.goalLeft', { count: left })}
        </p>
        <div aria-hidden className="divider relative my-4" />
        <GoldenQuarterHour readingMs={data.todayStats?.readingMs ?? 0} className="relative" />
      </section>

      {/* What to say next: today's unfinished conversation, or the course's next step. */}
      <section aria-labelledby="home-next" className="mt-6 animate-rise [animation-delay:80ms]">
        <h2 id="home-next" className="eyebrow mb-2">
          {resumable ? t('home.resumeTitle') : t('home.nextTitle')}
        </h2>
        {resumable ? (
          <Card className="flex items-center gap-4">
            <IconDisc icon="arrow-counter-clockwise" tone="sea" size={48} iconSize={22} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-xl font-semibold">{resumable.title}</p>
              <p className="text-sm text-ink-soft">
                {t('home.resumeHint', {
                  done: resumable.entries.filter((e) => e.status !== 'pending').length,
                  total: resumable.plan.length,
                  mode: t(`modes.${resumable.mode}.name`),
                })}
              </p>
            </div>
          </Card>
        ) : (
          next && (
            <Link to={`/conversations/${next.dialogue.key}`} className="card card-lift flex items-center gap-4 p-4">
              <IconDisc icon={dialogueIcon(next.dialogue)} size={52} iconSize={26} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-xl font-semibold">{next.dialogue.title[app.uiLang]}</span>
                <span lang={target} className="block truncate text-sm text-ink-soft italic">
                  {next.dialogue.title[target]}
                </span>
                <span className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-primary">
                  <Icon name={MODE_ICON[next.mode]} size={16} />
                  {t(`modes.${next.mode}.name`)}
                  <Stars stars={next.stars} size={14} className="ml-1" />
                </span>
              </span>
              <Icon name="caret-right" size={18} className="text-ink-faint" />
            </Link>
          )
        )}
        <Button size="hero" block className="mt-4" disabled={starting || (!resumable && !next)} onClick={() => void begin()} icon={resumable ? 'arrow-counter-clockwise' : 'play'} iconFill={!resumable}>
          {resumable ? t('home.resume') : t('home.start')}
        </Button>
        <p className="mt-2 text-center text-sm text-ink-soft">
          <Link to="/conversations" className="font-semibold text-primary underline-offset-4 hover:underline">
            {t('home.chooseAnother')}
          </Link>
        </p>
      </section>

      <GuideBubble mood={left === 0 ? 'celebrate' : 'welcome'} size={92} compact className="mt-6 animate-rise [animation-delay:110ms]">
        {guide}
      </GuideBubble>

      <Link to="/conversations" className="card card-lift mt-6 block p-5 animate-rise [animation-delay:140ms]">
        <span className="flex items-center justify-between gap-3">
          <span className="font-display text-lg font-semibold">{t(`home.courseTitle.${target}`)}</span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-gold-ink tabular">
            <Icon name="star" size={16} fillOpacity={1} />
            {data.course.earned}/{data.course.total}
          </span>
        </span>
        <ProgressBar className="mt-3" tone="gold" value={data.course.earned} max={data.course.total} label={t('home.courseStars', { earned: data.course.earned, total: data.course.total })} />
        <span className="mt-2 block text-sm text-ink-soft">{t('home.courseFinished', { count: data.course.finished, total: data.course.total / 3 })}</span>
      </Link>

      <Card className="mt-4">
        <LevelBar totalXp={game.totalXp} />
      </Card>

      {done > 0 && (
        <ShareDayButton
          className="mt-4"
          character={app.character}
          day={{ dayKey: data.today, minutes: sharedMinutes(data.todayStats?.readingMs ?? 0), lines: done, streak: data.streak.current, points: data.todayStats?.xp ?? 0 }}
        />
      )}

      {showBackup && (
        <Card className="mt-6 border-gold/50">
          <p className="font-display text-xl font-semibold">{t('home.backupTitle')}</p>
          <p className="mt-1 text-sm text-ink-soft">{t('home.backupBody')}</p>
          <div className="mt-3 flex gap-2">
            <ButtonLink size="sm" to="/settings/data">
              {t('home.backupAction')}
            </ButtonLink>
            <Button size="sm" variant="ghost" onClick={() => void updateMeta({ backupReminderSnoozedAt: Date.now() })}>
              {t('home.later')}
            </Button>
          </div>
        </Card>
      )}
    </>
  )
}
