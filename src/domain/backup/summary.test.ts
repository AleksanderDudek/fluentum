import { describe, expect, it } from 'vitest'
import type { DailyStats, TextStats } from '@/db/types'
import { compareSummaries, hasProgress, summarizeBackup, type BackupSummary } from './summary'

const day = (dayKey: string, segmentsAccepted: number): DailyStats => ({
  dayKey,
  segmentsAccepted,
  attempts: segmentsAccepted,
  conversationsCompleted: 0,
  xp: 0,
  goalReached: false,
  frozen: segmentsAccepted === 0,
  morning: false,
  evening: false,
  firstTryAccepted: 0,
  readingMs: 0,
})

const stats = (textId: string, stars: TextStats['stars']): TextStats => ({ textId, repetitions: stars.length, segmentsAccepted: 4, perfectRuns: 0, stars })

describe('summarizeBackup', () => {
  it('counts what a person would miss: lines, days, points, stars, achievements', () => {
    const summary = summarizeBackup({
      dailyStats: [day('2026-09-28', 12), day('2026-09-29', 0), day('2026-09-30', 5)],
      textStats: [stats('dialogue:en:cafe', ['read', 'prompt']), stats('dialogue:en:taxi', ['read'])],
      xpLedger: [
        { timestamp: 1, dayKey: '2026-09-28', reason: 'line', amount: 40 },
        { timestamp: 2, dayKey: '2026-09-30', reason: 'dailyGoal', amount: 50 },
      ],
      achievements: [{ key: 'streak.2', ruleId: 'streak.2', tier: 'bronze', xp: 50, unlockedAt: 2 }],
    })
    expect(summary).toEqual({ lines: 17, activeDays: 2, lastActiveDay: '2026-09-30', xp: 90, stars: 3, achievements: 1 })
  })

  it('handles an empty install', () => {
    const summary = summarizeBackup({ dailyStats: [], textStats: [], xpLedger: [], achievements: [] })
    expect(summary).toEqual({ lines: 0, activeDays: 0, lastActiveDay: undefined, xp: 0, stars: 0, achievements: 0 })
    expect(hasProgress(summary)).toBe(false)
  })
})

describe('compareSummaries', () => {
  const base: BackupSummary = { lines: 100, activeDays: 10, lastActiveDay: '2026-09-30', xp: 2000, stars: 4, achievements: 5 }

  it('warns when the file would take progress away from this device', () => {
    expect(compareSummaries({ ...base, xp: 1500, lines: 80, lastActiveDay: '2026-09-20' }, base)).toEqual({ older: true, lessProgress: true })
  })

  it('is quiet when the file holds as much or more', () => {
    expect(compareSummaries(base, base)).toEqual({ older: false, lessProgress: false })
    expect(compareSummaries({ ...base, xp: 2500, lastActiveDay: '2026-10-01' }, base)).toEqual({ older: false, lessProgress: false })
  })

  it('never warns for a device without progress (a new phone)', () => {
    const empty: BackupSummary = { lines: 0, activeDays: 0, lastActiveDay: undefined, xp: 0, stars: 0, achievements: 0 }
    expect(compareSummaries(base, empty)).toEqual({ older: false, lessProgress: false })
  })

  it('counts stars as progress too', () => {
    expect(hasProgress({ ...base, lines: 0, activeDays: 0, xp: 0, lastActiveDay: undefined, achievements: 0 })).toBe(true)
    expect(compareSummaries({ ...base, stars: 0 }, base).lessProgress).toBe(true)
  })
})
