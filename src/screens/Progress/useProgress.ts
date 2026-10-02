import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import type { AchievementRow, DailyStats } from '@/db/types'
import { learningLang } from '@/domain/dialogue'
import type { CourseMetricsLike } from '@/domain/gamification'
import { dayKeyFor } from '@/domain/time/dayKey'
import type { Lang } from '@/domain/types'
import { courseState, type CourseState } from '@/services/dialogues'
import { courseMetricsOf } from '@/services/progress'

export interface ProgressData {
  today: string
  daily: DailyStats[]
  achievements: Map<string, AchievementRow>
  /** The course in the language being learnt. */
  course: CourseState
  /** Metrics of the course achievements (both languages, the best counts). */
  courseMetrics: CourseMetricsLike
}

export function useProgress(dayStartHour: number, uiLang: Lang): ProgressData | undefined {
  return useLiveQuery(async () => {
    const [daily, achievements, textStats, course] = await Promise.all([
      db.dailyStats.toArray(),
      db.achievements.toArray(),
      db.textStats.toArray(),
      courseState(learningLang(uiLang)),
    ])
    return {
      today: dayKeyFor(Date.now(), dayStartHour),
      daily,
      achievements: new Map(achievements.map((a) => [a.key, a])),
      course,
      courseMetrics: courseMetricsOf(textStats),
    }
  }, [dayStartHour, uiLang])
}
