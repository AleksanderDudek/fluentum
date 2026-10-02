import { describe, expect, it } from 'vitest'
import * as gamification from '@/domain/gamification'
import { ACHIEVEMENT_RULES, buildGlobalMetrics, type DailyStatsLike, evaluateAchievements, levelInfo } from '@/domain/gamification'
import { rangeDays } from '@/domain/time/dayKey'

describe('gamification entry point', () => {
  it('exposes the whole domain API', () => {
    expect(Object.keys(gamification)).toEqual(
      expect.arrayContaining([
        'XP_RULES',
        'TIER_XP',
        'streakMultiplier',
        'segmentXp',
        'MAX_NAMED_LEVEL',
        'thresholdForLevel',
        'levelInfo',
        'toRoman',
        'MAX_FREEZES',
        'FREEZE_EVERY',
        'computeStreak',
        'reconcileFreezes',
        'freezeAward',
        'isComeback',
        'weeklyRhythmBest',
        'dayMarksFrom',
        'buildGlobalMetrics',
        'buildCourseMetrics',
        'ACHIEVEMENT_RULES',
        'evaluateAchievements',
        'ruleProgress',
      ]),
    )
  })
})

describe('from stats to unlocked achievements', () => {
  it('unlocks what a first week of daily conversations has earned', () => {
    const today = '2026-10-02'
    const daily: DailyStatsLike[] = rangeDays('2026-09-26', today).map((dayKey) => ({
      dayKey,
      segmentsAccepted: 12,
      conversationsCompleted: 2,
      goalReached: true,
      frozen: false,
      morning: false,
      evening: false,
    }))
    const global = buildGlobalMetrics({
      daily,
      game: { perfectConversations: 1, comebacks: 0 },
      course: { stars: 10, mastered: 1, courseA1: 0, courseA2: 0 },
      level: levelInfo(3200).level,
      today,
    })
    const unlocks = evaluateAchievements({ rules: ACHIEVEMENT_RULES, global, unlocked: new Set() })
    expect(unlocks.map((unlock) => unlock.key).sort()).toEqual([
      'conversation.1',
      'conversation.10',
      'daily.10',
      'goal.days.7',
      'mastered.1',
      'perfect.1',
      'stars.1',
      'stars.10',
      'streak.2',
      'streak.5',
      'streak.7',
      'total.50',
    ])
  })
})
