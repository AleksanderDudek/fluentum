import { describe, expect, it } from 'vitest'
import type { DayKey } from '@/domain/types'
import { buildCourseMetrics, buildGlobalMetrics, type DailyStatsLike, dayMarksFrom, GLOBAL_METRICS, isGlobalMetric } from './metrics'

function dayRow(dayKey: DayKey, overrides: Partial<DailyStatsLike> = {}): DailyStatsLike {
  return { dayKey, segmentsAccepted: 0, conversationsCompleted: 0, goalReached: false, frozen: false, morning: false, evening: false, ...overrides }
}

const NO_COUNTERS = { perfectConversations: 0, comebacks: 0 }
const NO_COURSE = { stars: 0, mastered: 0, courseA1: 0, courseA2: 0 }

describe('metric names', () => {
  it('recognises the metrics of the rule engine only', () => {
    expect(GLOBAL_METRICS.every(isGlobalMetric)).toBe(true)
    expect(isGlobalMetric('textRepetitions')).toBe(false)
    expect(isGlobalMetric(3)).toBe(false)
  })
})

describe('dayMarksFrom', () => {
  it('marks days with accepted lines as active and keeps the frozen flag', () => {
    const marks = dayMarksFrom([dayRow('2026-10-01', { segmentsAccepted: 3 }), dayRow('2026-10-02', { frozen: true })])
    expect(marks.get('2026-10-01')).toEqual({ active: true, frozen: false })
    expect(marks.get('2026-10-02')).toEqual({ active: false, frozen: true })
  })
})

describe('buildGlobalMetrics', () => {
  it('aggregates daily stats and passes counters and course progress through', () => {
    const daily = [
      dayRow('2026-09-30', { segmentsAccepted: 12, conversationsCompleted: 2, goalReached: true, morning: true }),
      dayRow('2026-10-01', { segmentsAccepted: 4, conversationsCompleted: 1, evening: true, readingMs: 16 * 60_000 }),
      dayRow('2026-10-02', { segmentsAccepted: 20, conversationsCompleted: 3, goalReached: true }),
    ]
    const metrics = buildGlobalMetrics({
      daily,
      game: { perfectConversations: 2, comebacks: 1 },
      course: { stars: 7, mastered: 1, courseA1: 1, courseA2: 0 },
      level: 4,
      today: '2026-10-02',
    })
    expect(metrics).toEqual({
      bestStreak: 3,
      weeklyRhythmBest: 0,
      goalDays: 2,
      dailyMax: 20,
      totalSegments: 36,
      conversations: 6,
      perfectConversations: 2,
      stars: 7,
      mastered: 1,
      courseA1: 1,
      courseA2: 0,
      morningDays: 1,
      eveningDays: 1,
      comebacks: 1,
      level: 4,
      goldenDays: 1,
    })
  })

  it('is all zeros for a new user (level 1)', () => {
    const metrics = buildGlobalMetrics({ daily: [], game: NO_COUNTERS, course: NO_COURSE, level: 1, today: '2026-10-02' })
    expect(Object.entries(metrics).filter(([, value]) => value !== 0)).toEqual([['level', 1]])
  })
})

describe('buildCourseMetrics', () => {
  const levels = new Map([
    ['a', 'A1'],
    ['b', 'A1'],
    ['c', 'A2'],
  ])

  it('counts stars and fully mastered conversations, and completes a level once each of its conversations has a star', () => {
    const metrics = buildCourseMetrics(
      [
        { key: 'a', lang: 'en', stars: ['read', 'prompt', 'recall'] },
        { key: 'b', lang: 'en', stars: ['read'] },
        { key: 'c', lang: 'en', stars: [] },
      ],
      levels,
    )
    expect(metrics).toEqual({ stars: 4, mastered: 1, courseA1: 1, courseA2: 0 })
  })

  it('keeps the languages apart and counts the one with the most progress', () => {
    const metrics = buildCourseMetrics(
      [
        { key: 'a', lang: 'en', stars: ['read'] },
        { key: 'b', lang: 'pl', stars: ['read'] },
        { key: 'c', lang: 'pl', stars: ['read', 'prompt'] },
      ],
      levels,
    )
    expect(metrics).toEqual({ stars: 3, mastered: 0, courseA1: 0, courseA2: 1 })
  })

  it('is empty without any conversation started', () => {
    expect(buildCourseMetrics([], levels)).toEqual(NO_COURSE)
  })
})
