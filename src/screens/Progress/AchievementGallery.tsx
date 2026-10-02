import { useTranslation } from 'react-i18next'
import { AchievementRow } from '@/components/AchievementRow'
import type { AchievementRow as AchievementRowData } from '@/db/types'
import { ACHIEVEMENT_CATEGORIES, ACHIEVEMENT_RULES, type GlobalMetric } from '@/domain/gamification'

interface GalleryProps {
  global: Record<GlobalMetric, number>
  unlocked: ReadonlyMap<string, AchievementRowData>
}

/** Every achievement by category, with progress towards the locked ones. */
export function AchievementGallery({ global, unlocked }: GalleryProps) {
  const { t } = useTranslation()
  const done = ACHIEVEMENT_RULES.filter((r) => unlocked.has(r.id)).length
  return (
    <div>
      <p className="mb-3 text-sm text-ink-soft">{t('progress.unlockedCount', { count: done, total: ACHIEVEMENT_RULES.length })}</p>
      <div className="space-y-2">
        {ACHIEVEMENT_CATEGORIES.map((category) => {
          const rules = ACHIEVEMENT_RULES.filter((r) => r.category === category)
          if (rules.length === 0) return null
          const unlockedHere = rules.filter((r) => unlocked.has(r.id)).length
          return (
            <details key={category} className="group rounded-2xl border border-line bg-surface/60" open={category === 'conversations'}>
              <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 font-semibold">
                <span>{t(`progress.categories.${category}`)}</span>
                <span className="tabular text-sm font-medium text-ink-soft">
                  {unlockedHere}/{rules.length}
                </span>
              </summary>
              <ul className="space-y-2 px-2 pb-2">
                {rules.map((rule) => (
                  <AchievementRow key={rule.id} rule={rule} row={unlocked.get(rule.id)} current={global[rule.metric] ?? 0} />
                ))}
              </ul>
            </details>
          )
        })}
      </div>
    </div>
  )
}
