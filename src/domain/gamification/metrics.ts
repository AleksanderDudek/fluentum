import type { DayKey } from '@/domain/types'
import type { DayMarks } from './streaks'
import { computeStreak, weeklyRhythmBest } from './streaks'

/** Values measured by achievement rules. */
export const GLOBAL_METRICS = [
  'bestStreak',
  'weeklyRhythmBest',
  'goalDays',
  'dailyMax',
  'totalSegments',
  'conversations',
  'perfectConversations',
  'stars',
  'mastered',
  'courseA1',
  'courseA2',
  'morningDays',
  'eveningDays',
  'comebacks',
  'level',
  'goldenDays',
] as const
export type GlobalMetric = (typeof GLOBAL_METRICS)[number]

const globalMetrics: ReadonlySet<string> = new Set(GLOBAL_METRICS)

export function isGlobalMetric(value: unknown): value is GlobalMetric {
  return typeof value === 'string' && globalMetrics.has(value)
}

/** The fields of a `DailyStats` row that achievements read. */
export interface DailyStatsLike {
  dayKey: DayKey
  segmentsAccepted: number
  conversationsCompleted: number
  goalReached: boolean
  frozen: boolean
  morning: boolean
  evening: boolean
  /** Estimated speaking time. */
  readingMs?: number
}

/** A day on which the whole golden quarter-hour was spoken. */
export const GOLDEN_DAY_MS = 15 * 60_000

/** Counters of the `game` settings row that cannot be derived from daily stats. */
export interface GameCountersLike {
  perfectConversations: number
  comebacks: number
}

/**
 * Course progress in one language being learnt (the best language counts when both were learnt): stars earned,
 * conversations with all three stars, and 1/0 for every conversation of a level finished at least once.
 */
export interface CourseMetricsLike {
  stars: number
  mastered: number
  courseA1: number
  courseA2: number
}

/** Streak view of the daily history: active = at least one accepted line. */
export function dayMarksFrom(daily: readonly DailyStatsLike[]): DayMarks {
  return new Map(daily.map((day) => [day.dayKey, { active: day.segmentsAccepted > 0, frozen: day.frozen }]))
}

export function buildGlobalMetrics(input: {
  daily: readonly DailyStatsLike[]
  game: GameCountersLike
  course: CourseMetricsLike
  level: number
  today: DayKey
}): Record<GlobalMetric, number> {
  const { daily, game, course, level, today } = input
  const marks = dayMarksFrom(daily)
  const count = (test: (day: DailyStatsLike) => boolean) => daily.filter(test).length
  const sum = (value: (day: DailyStatsLike) => number) => daily.reduce((total, day) => total + value(day), 0)
  return {
    bestStreak: computeStreak(marks, today).best,
    weeklyRhythmBest: weeklyRhythmBest(marks),
    goalDays: count((day) => day.goalReached),
    dailyMax: daily.reduce((max, day) => Math.max(max, day.segmentsAccepted), 0),
    totalSegments: sum((day) => day.segmentsAccepted),
    conversations: sum((day) => day.conversationsCompleted),
    perfectConversations: game.perfectConversations,
    stars: course.stars,
    mastered: course.mastered,
    courseA1: course.courseA1,
    courseA2: course.courseA2,
    morningDays: count((day) => day.morning),
    eveningDays: count((day) => day.evening),
    comebacks: game.comebacks,
    level,
    goldenDays: count((day) => (day.readingMs ?? 0) >= GOLDEN_DAY_MS),
  }
}

/**
 * Course metrics from each conversation's stars, grouped by the language being learnt; the language with the most
 * progress counts (a learner who switched languages keeps what was earned in either).
 */
export function buildCourseMetrics(
  conversations: ReadonlyArray<{ key: string; lang: string; stars: readonly string[] }>,
  /** Level of every conversation of the course, by key. */
  levels: ReadonlyMap<string, string>,
): CourseMetricsLike {
  const byLang = new Map<string, Array<{ key: string; stars: readonly string[] }>>()
  for (const conversation of conversations) byLang.set(conversation.lang, [...(byLang.get(conversation.lang) ?? []), conversation])
  const best: CourseMetricsLike = { stars: 0, mastered: 0, courseA1: 0, courseA2: 0 }
  const keysOf = (level: string) => [...levels].filter(([, l]) => l === level).map(([key]) => key)
  for (const rows of byLang.values()) {
    const starred = new Set(rows.filter((row) => row.stars.length > 0).map((row) => row.key))
    const complete = (level: string) => {
      const keys = keysOf(level)
      return keys.length > 0 && keys.every((key) => starred.has(key)) ? 1 : 0
    }
    best.stars = Math.max(best.stars, rows.reduce((total, row) => total + row.stars.length, 0))
    best.mastered = Math.max(best.mastered, rows.filter((row) => row.stars.length >= 3).length)
    best.courseA1 = Math.max(best.courseA1, complete('A1'))
    best.courseA2 = Math.max(best.courseA2, complete('A2'))
  }
  return best
}
