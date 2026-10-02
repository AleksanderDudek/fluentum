import { useLiveQuery } from 'dexie-react-hooks'
import { DIALOGUES } from '@/content/dialogues'
import { db } from '@/db/schema'
import type { DailyStats, SessionRun } from '@/db/types'
import type { Dialogue } from '@/domain/dialogue'
import { learningLang } from '@/domain/dialogue'
import { computeStreak, dayMarksFrom, type StreakInfo } from '@/domain/gamification'
import { nextStep, starTotals, type PracticeMode } from '@/domain/mastery'
import { dayKeyFor } from '@/domain/time/dayKey'
import type { Lang } from '@/domain/types'
import { courseState } from '@/services/dialogues'
import { findResumableRun } from '@/services/runs'

export interface HomeData {
  today: string
  todayStats?: DailyStats
  streak: StreakInfo
  /** An unfinished run of today, offered first. */
  resumable?: SessionRun
  /** The course's next step in the language being learnt. */
  next?: { dialogue: Dialogue; mode: PracticeMode; stars: PracticeMode[] }
  course: { earned: number; total: number; finished: number }
  hasActivity: boolean
}

/** Everything the Home screen shows. */
export function useHome(dayStartHour: number, uiLang: Lang): HomeData | undefined {
  return useLiveQuery(async () => {
    const today = dayKeyFor(Date.now(), dayStartHour)
    const lang = learningLang(uiLang)
    const [daily, resumable, state] = await Promise.all([db.dailyStats.toArray(), findResumableRun(), courseState(lang)])
    const keys = DIALOGUES.map((d) => d.key)
    const step = nextStep(keys, state)
    const dialogue = step && DIALOGUES.find((d) => d.key === step.key)
    return {
      today,
      todayStats: daily.find((d) => d.dayKey === today),
      streak: computeStreak(dayMarksFrom(daily), today),
      resumable,
      next: dialogue && step ? { dialogue, mode: step.mode, stars: state.stars.get(dialogue.key) ?? [] } : undefined,
      course: { ...starTotals(keys, state.stars), finished: keys.filter((key) => (state.repetitions.get(key) ?? 0) > 0).length },
      hasActivity: daily.some((d) => d.segmentsAccepted > 0),
    }
  }, [dayStartHour, uiLang])
}
