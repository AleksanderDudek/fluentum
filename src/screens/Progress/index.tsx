import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Icon } from '@/components/icons/Icon'
import { FirstTryChart } from '@/components/progress/FirstTryChart'
import { Heatmap } from '@/components/progress/Heatmap'
import { Plant } from '@/components/progress/Plant'
import { StatTile } from '@/components/progress/StatTile'
import { Stars } from '@/components/Stars'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pool } from '@/components/ui/Pool'
import { ProgressBar } from '@/components/ui/Progress'
import { DIALOGUES } from '@/content/dialogues'
import { learningLang, type DialogueLevel } from '@/domain/dialogue'
import { buildGlobalMetrics, computeStreak, dayMarksFrom, levelInfo } from '@/domain/gamification'
import { starTotals } from '@/domain/mastery'
import { successMetrics, weeklyFirstTry } from '@/domain/stats'
import { levelName } from '@/i18n/dynamic'
import { useSettingsStore } from '@/stores/settings'
import { AchievementGallery } from './AchievementGallery'
import { Leaderboard } from './Leaderboard'
import { useProgress } from './useProgress'

const LEVELS: readonly DialogueLevel[] = ['A1', 'A2']

export default function Progress() {
  const { t, i18n } = useTranslation()
  const app = useSettingsStore((s) => s.app)
  const game = useSettingsStore((s) => s.game)
  const data = useProgress(app.dayStartHour, app.uiLang)
  if (!data) return null

  const target = learningLang(app.uiLang)
  const info = levelInfo(game.totalXp)
  const streak = computeStreak(dayMarksFrom(data.daily), data.today)
  const metrics = successMetrics(data.daily, data.today)
  const global = buildGlobalMetrics({ daily: data.daily, game, course: data.courseMetrics, level: info.level, today: data.today })
  const percent = (value: number | null) => (value === null ? t('progress.noValue') : `${Math.round(value * 100)}%`)
  const number = (value: number) => new Intl.NumberFormat(i18n.language).format(value)
  const date = (time: number) => new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' }).format(time)
  // In the language being learnt, like the star bars above it (achievements count the best language).
  const mastered = [...data.course.stars.values()].filter((stars) => stars.length === 3).length
  const practised = DIALOGUES.filter((d) => (data.course.repetitions.get(d.key) ?? 0) > 0 || (data.course.stars.get(d.key)?.length ?? 0) > 0)

  return (
    <>
      <PageHeader eyebrow={t('progress.eyebrow')} title={t('progress.title')} />

      {/* Words take root: the plant grows with every level. */}
      <Pool glow>
        <div className="px-4 pt-8">
          <Plant level={info.level} className="mx-auto h-50 w-full max-w-md" />
        </div>
        <div className="px-5 pt-2 pb-9 text-center">
          <p className="eyebrow">{t('level.label', { level: info.level })}</p>
          <p className="mt-1 font-display text-3xl font-semibold">{levelName(t, info.level)}</p>
          <ProgressBar className="mt-3" tone="gold" value={info.xpIntoLevel} max={info.xpForNext} label={t('level.toNext', { xp: info.nextThreshold - game.totalXp, name: levelName(t, info.level + 1) })} />
          <p className="mt-1.5 text-sm text-ink-soft">
            {t('level.xp', { xp: number(game.totalXp) })} · {t('level.toNext', { xp: number(info.nextThreshold - game.totalXp), name: levelName(t, info.level + 1) })}
          </p>
        </div>
      </Pool>

      <section className="mt-8" aria-labelledby="course-heading">
        <h2 id="course-heading" className="mb-3 text-2xl font-semibold">
          {t(`progress.courseHeading.${target}`)}
        </h2>
        <Card className="space-y-4">
          {LEVELS.map((level) => {
            const keys = DIALOGUES.filter((d) => d.level === level).map((d) => d.key)
            const totals = starTotals(keys, data.course.stars)
            return (
              <div key={level}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-semibold">{t(`course.level.${level}`)}</p>
                  <p className="inline-flex items-center gap-1 text-sm font-semibold text-gold-ink tabular">
                    <Icon name="star" size={14} fillOpacity={1} />
                    {totals.earned}/{totals.total}
                  </p>
                </div>
                <ProgressBar className="mt-2" tone="gold" value={totals.earned} max={totals.total} label={t('course.levelStars', totals)} />
              </div>
            )
          })}
          <p className="text-sm text-ink-soft">{t('progress.mastered', { count: mastered, total: DIALOGUES.length })}</p>
        </Card>
      </section>

      <Leaderboard />

      <section className="mt-8" aria-labelledby="metrics-heading">
        <h2 id="metrics-heading" className="mb-3 text-2xl font-semibold">
          {t('progress.metricsHeading')}
        </h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile label={t('progress.firstTry')} value={percent(metrics.firstTryRate)} hint={t('progress.firstTryHint')} />
          <StatTile label={t('progress.goalDays')} value={percent(metrics.goalDayShare)} />
          <StatTile label={t('progress.bestStreak')} value={t('counts.days', { count: streak.best })} />
          <StatTile label={t('progress.totalLines')} value={number(metrics.totalSegments)} />
          <StatTile label={t('progress.conversations')} value={number(global.conversations)} />
          <StatTile label={t('progress.perfect')} value={number(global.perfectConversations)} />
        </dl>
      </section>

      <section className="mt-8" aria-labelledby="heatmap-heading">
        <h2 id="heatmap-heading" className="mb-3 text-2xl font-semibold">
          {t('progress.heatmapTitle')}
        </h2>
        <Card>
          <Heatmap daily={data.daily} today={data.today} goal={app.dailyGoal} />
        </Card>
      </section>

      <section className="mt-8" aria-labelledby="firsttry-heading">
        <h2 id="firsttry-heading" className="text-2xl font-semibold">
          {t('progress.firstTryTitle')}
        </h2>
        <p className="mb-3 text-sm text-ink-soft">{t('progress.firstTrySubtitle')}</p>
        <Card>
          <FirstTryChart weeks={weeklyFirstTry(data.daily, data.today, 12)} />
        </Card>
      </section>

      <section className="mt-8" aria-labelledby="achievements-heading">
        <h2 id="achievements-heading" className="mb-3 text-2xl font-semibold">
          {t('progress.achievementsHeading')}
        </h2>
        <AchievementGallery global={global} unlocked={data.achievements} />
      </section>

      <section className="mt-8" aria-labelledby="conversations-heading">
        <h2 id="conversations-heading" className="mb-3 text-2xl font-semibold">
          {t('progress.conversationsHeading')}
        </h2>
        {practised.length === 0 ? (
          <p className="text-ink-soft">{t('progress.emptyConversations')}</p>
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="text-ink-soft">
                <tr>
                  <th className="px-4 py-2 font-medium">{t('progress.colConversation')}</th>
                  <th className="px-2 py-2 font-medium">{t('progress.colStars')}</th>
                  <th className="px-2 py-2 text-right font-medium">{t('progress.colDone')}</th>
                  <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">{t('progress.colLast')}</th>
                </tr>
              </thead>
              <tbody className="tabular">
                {practised.map((dialogue) => {
                  const last = data.course.lastPracticedAt.get(dialogue.key)
                  return (
                    <tr key={dialogue.key} className="border-t border-line">
                      <td className="px-4 py-2">
                        <Link to={`/conversations/${dialogue.key}`} className="font-display text-base font-semibold hover:underline">
                          {dialogue.title[app.uiLang]}
                        </Link>
                      </td>
                      <td className="px-2 py-2">
                        <Stars stars={data.course.stars.get(dialogue.key) ?? []} size={14} />
                      </td>
                      <td className="px-2 py-2 text-right">{number(data.course.repetitions.get(dialogue.key) ?? 0)}</td>
                      <td className="hidden px-4 py-2 text-right text-ink-soft sm:table-cell">{last ? date(last) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </>
  )
}
