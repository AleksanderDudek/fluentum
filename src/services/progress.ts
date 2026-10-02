import { DIALOGUES, dialogueOfText } from '@/content/dialogues'
import { db } from '@/db/schema'
import type { AchievementRow, DailyStats, GameState, TextStats } from '@/db/types'
import { ACHIEVEMENT_RULES, buildCourseMetrics, buildGlobalMetrics, evaluateAchievements, levelInfo, TIER_XP } from '@/domain/gamification'
import type { DayKey } from '@/domain/types'

/** Tables an achievement evaluation reads or writes — include them in the caller's transaction. */
export const PROGRESS_TABLES = [db.achievements, db.xpLedger, db.dailyStats, db.textStats, db.texts, db.segments, db.settings] as const

const LEVELS = new Map(DIALOGUES.map((dialogue) => [dialogue.key, dialogue.level]))

export interface UnlockedAchievement {
  key: string
  ruleId: string
  tier: AchievementRow['tier']
  xp: number
}

export function emptyDailyStats(dayKey: DayKey): DailyStats {
  return {
    dayKey,
    segmentsAccepted: 0,
    attempts: 0,
    conversationsCompleted: 0,
    xp: 0,
    goalReached: false,
    frozen: false,
    morning: false,
    evening: false,
    firstTryAccepted: 0,
    readingMs: 0,
  }
}

/** Course metrics of achievements from the stats of every conversation started so far (in either language). */
export function courseMetricsOf(textStats: readonly TextStats[]) {
  const rows = []
  for (const stats of textStats) {
    const found = dialogueOfText(stats.textId)
    if (found) rows.push({ key: found.dialogue.key, lang: found.lang, stars: stats.stars })
  }
  return buildCourseMetrics(rows, LEVELS)
}

/**
 * Evaluates the achievement rules against the current aggregates and stores new unlocks with their XP.
 * Achievement XP can raise the level, which can unlock `level.*` rules, so evaluation repeats until nothing new
 * unlocks. Must run inside a transaction over {@link PROGRESS_TABLES}; mutates `game` and the day's stats row (both
 * persisted here).
 */
export async function unlockAchievements(input: { game: GameState; dayKey: DayKey; now: number }): Promise<UnlockedAchievement[]> {
  const { game, dayKey, now } = input
  const unlockedKeys = new Set((await db.achievements.toCollection().primaryKeys()) as string[])
  const course = courseMetricsOf(await db.textStats.toArray())
  const all: UnlockedAchievement[] = []
  for (let round = 0; round < 5; round++) {
    const daily = await db.dailyStats.toArray()
    const global = buildGlobalMetrics({ daily, game, course, level: levelInfo(game.totalXp).level, today: dayKey })
    const fresh = evaluateAchievements({ rules: ACHIEVEMENT_RULES, global, unlocked: unlockedKeys })
    if (fresh.length === 0) break
    const day = (await db.dailyStats.get(dayKey)) ?? emptyDailyStats(dayKey)
    for (const unlock of fresh) {
      const xp = TIER_XP[unlock.tier]
      const row: AchievementRow = { key: unlock.key, ruleId: unlock.ruleId, tier: unlock.tier, xp, unlockedAt: now }
      await db.achievements.add(row)
      await db.xpLedger.add({ timestamp: now, dayKey, reason: 'achievement', amount: xp, refId: unlock.key })
      unlockedKeys.add(unlock.key)
      game.totalXp += xp
      day.xp += xp
      all.push({ ...unlock, xp })
    }
    await db.dailyStats.put(day)
  }
  await db.settings.put({ key: 'game', value: game })
  return all
}
