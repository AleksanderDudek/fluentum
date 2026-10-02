import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/schema'
import type { SessionRun } from '@/db/types'
import type { PracticeMode } from '@/domain/mastery'
import { resetDb } from '@/test/db'
import { startDialogue } from './dialogues'
import { finishRun, markHinted, reconcileStreakFreezes, recordAttempt, skipEntry, type Evaluation } from './practice'
import { emptyDailyStats } from './progress'
import { readSettings, updateAppSettings, updateGameState } from './settings'

const at = (day: number, hour = 12, minute = 0) => new Date(2026, 9, day, hour, minute).getTime()
const ok: Evaluation = { accepted: true, coverage: 1, extra: 0, wrong: 0, transcript: 'ok', threshold: 0.9 }
const bad: Evaluation = { accepted: false, coverage: 0.5, extra: 1, wrong: 0, transcript: 'nope', threshold: 0.9 }
const CAFE = 'dialogue:en:cafe'

/** Says every line of a run (optionally failing the first try of some), one second apart. */
async function speakAll(run: SessionRun, start: number, failFirstOf: ReadonlySet<number> = new Set()) {
  let now = start
  for (let i = 0; i < run.plan.length; i++) {
    if (failFirstOf.has(i)) await recordAttempt({ runId: run.id, entryIndex: i, evaluation: bad, engine: 'webspeech', durationMs: 900, now: (now += 1000) })
    await recordAttempt({ runId: run.id, entryIndex: i, evaluation: ok, engine: 'webspeech', durationMs: 900, now: (now += 1000) })
  }
  return now
}

const start = (mode: PracticeMode = 'read', now = at(2)) => startDialogue('cafe', mode, now)
const ledgerTotal = async () => (await db.xpLedger.toArray()).reduce((sum, row) => sum + row.amount, 0)
const ledger = async (reason: string) => db.xpLedger.where('reason').equals(reason).toArray()
const unlockedKeys = async () => new Set((await db.achievements.toCollection().primaryKeys()) as string[])

beforeEach(async () => {
  await resetDb()
  await updateAppSettings({ uiLang: 'pl', dailyGoal: 10, dayStartHour: 3 })
})

describe('a whole conversation', () => {
  it('counts lines, the finished conversation, its star, XP and achievements consistently', async () => {
    const run = await start('read')
    const end = await speakAll(run, at(2), new Set([0]))
    const finished = await finishRun(run.id, end + 1000)

    expect(finished.clean).toBe(true)
    expect(await db.textStats.get(CAFE)).toMatchObject({ repetitions: 1, segmentsAccepted: run.plan.length, perfectRuns: 0, stars: ['read'] })
    expect(await db.dailyStats.get('2026-10-02')).toMatchObject({
      segmentsAccepted: run.plan.length,
      attempts: run.plan.length + 1,
      conversationsCompleted: 1,
      firstTryAccepted: run.plan.length - 1,
    })
    expect(await ledger('conversation')).toHaveLength(1)
    expect((await ledger('star')).map((row) => row.amount)).toEqual([15])

    const keys = await unlockedKeys()
    expect(['conversation.1', 'stars.1'].filter((key) => !keys.has(key))).toEqual([])
    expect(keys.has('perfect.1')).toBe(false) // the first line needed a second try

    const { game } = await readSettings()
    expect(game.totalXp).toBe(await ledgerTotal())
    expect((await db.dailyStats.get('2026-10-02'))?.xp).toBe(await ledgerTotal())
    const row = await db.sessionRuns.get(run.id)
    expect(row).toMatchObject({ status: 'completed', cursor: run.plan.length, newStar: 'read' })
    expect([...(row?.unlocked ?? [])].sort()).toEqual([...keys].sort())
    expect(row?.xpEarned).toBe(await ledgerTotal())
  })

  it('reports the finished conversation with the last accepted line, perfect when every line was a first try', async () => {
    const run = await start('prompt')
    const outcomes = []
    for (let i = 0; i < run.plan.length; i++) {
      outcomes.push(await recordAttempt({ runId: run.id, entryIndex: i, evaluation: ok, engine: 'webspeech', durationMs: 1, now: at(2, 12, i) }))
    }
    expect(outcomes.slice(0, -1).map((outcome) => outcome.conversationCompleted)).toEqual(outcomes.slice(0, -1).map(() => undefined))
    expect(outcomes.at(-1)?.conversationCompleted).toEqual({ bonusXp: 25, perfect: true, newStar: 'prompt', starXp: 25 })
    expect((await readSettings()).game.perfectConversations).toBe(1)
    expect((await unlockedKeys()).has('perfect.1')).toBe(true)
  })

  it('records the first try only when the first attempt is accepted', async () => {
    const run = await start()
    const first = await recordAttempt({ runId: run.id, entryIndex: 0, evaluation: bad, engine: 'webspeech', durationMs: 1, now: at(2, 12, 1) })
    expect(first).toMatchObject({ accepted: false, failedAttempts: 1, xpGained: 0 })
    const second = await recordAttempt({ runId: run.id, entryIndex: 0, evaluation: ok, engine: 'webspeech', durationMs: 1, now: at(2, 12, 2) })
    expect(second).toMatchObject({ accepted: true, firstTry: false, failedAttempts: 1 })
    expect(second.segmentXp).toBe(5 + 8) // "I’d like a large coffee with milk, please." has 8 words
    expect((await db.attempts.toArray()).map((a) => a.threshold)).toEqual([0.9, 0.9])
    await expect(recordAttempt({ runId: run.id, entryIndex: 0, evaluation: ok, engine: 'webspeech', durationMs: 1 })).rejects.toMatchObject({ code: 'outOfOrder' })
  })
})

describe('stars', () => {
  it('are earned once per way; finishing again in the same way gives no second star', async () => {
    const one = await start('recall')
    await speakAll(one, at(2))
    const two = await start('recall', at(2, 13))
    await speakAll(two, at(2, 13))
    expect((await db.textStats.get(CAFE))?.stars).toEqual(['recall'])
    expect((await ledger('star')).map((row) => row.amount)).toEqual([40])
    expect((await db.textStats.get(CAFE))?.repetitions).toBe(2)
    expect((await db.sessionRuns.get(two.id))?.newStar).toBeUndefined()
  })

  it('need no line revealed: a "Show" keeps the repetition but not the star', async () => {
    const run = await start('recall')
    await markHinted(run.id, 1)
    await speakAll(run, at(2))
    expect(await db.textStats.get(CAFE)).toMatchObject({ repetitions: 1, stars: [] })
    expect((await db.sessionRuns.get(run.id))?.entries[1]?.hinted).toBe(true)
  })

  it('add up in course order and unlock the mastery achievements', async () => {
    for (const [i, mode] of (['recall', 'read', 'prompt'] as const).entries()) {
      const run = await start(mode, at(2, 12 + i))
      await speakAll(run, at(2, 12 + i))
    }
    expect((await db.textStats.get(CAFE))?.stars).toEqual(['read', 'prompt', 'recall'])
    expect((await unlockedKeys()).has('mastered.1')).toBe(true)
  })
})

describe('skips', () => {
  it('a skipped line means the conversation is not finished: no repetition, bonus or star', async () => {
    const run = await start()
    await recordAttempt({ runId: run.id, entryIndex: 0, evaluation: ok, engine: 'webspeech', durationMs: 1, now: at(2, 12, 1) })
    for (let i = 0; i < 3; i++) await recordAttempt({ runId: run.id, entryIndex: 1, evaluation: bad, engine: 'webspeech', durationMs: 1, now: at(2, 12, 2) })
    await skipEntry(run.id, 1, at(2, 12, 3))
    for (let i = 2; i < run.plan.length; i++) {
      await recordAttempt({ runId: run.id, entryIndex: i, evaluation: ok, engine: 'webspeech', durationMs: 1, now: at(2, 12, 3 + i) })
    }
    const finished = await finishRun(run.id, at(2, 12, 30))
    expect(finished.clean).toBe(false)
    expect(await db.textStats.get(CAFE)).toMatchObject({ repetitions: 0, stars: [] })
    expect((await db.dailyStats.get('2026-10-02'))?.conversationsCompleted).toBe(0)
    expect(await ledger('conversation')).toHaveLength(0)
    expect((await db.sessionRuns.get(run.id))?.status).toBe('completed')
  })

  it('refuses to skip a line that is not the current one', async () => {
    const run = await start()
    await expect(skipEntry(run.id, 2)).rejects.toMatchObject({ code: 'outOfOrder' })
  })
})

describe('the golden quarter-hour', () => {
  const todayRow = async (readingMs: number) => {
    await db.dailyStats.put({ ...emptyDailyStats('2026-10-02'), segmentsAccepted: 1, readingMs })
  }

  it('adds the estimated speaking time of accepted lines only', async () => {
    const run = await start()
    await recordAttempt({ runId: run.id, entryIndex: 0, evaluation: bad, engine: 'webspeech', durationMs: 5000, now: at(2, 12, 1) })
    expect((await db.dailyStats.get('2026-10-02'))?.readingMs).toBe(0)
    const outcome = await recordAttempt({ runId: run.id, entryIndex: 0, evaluation: ok, engine: 'webspeech', durationMs: 5000, now: at(2, 12, 2) })
    expect((await db.dailyStats.get('2026-10-02'))?.readingMs).toBe(3429) // 8 words at 140 words a minute
    expect(outcome).toMatchObject({ golden: 1, readingMs: 3429 })
  })

  it('doubles line XP between 5 and 15 minutes of speaking, and only then', async () => {
    await todayRow(6 * 60_000)
    const run = await start()
    const inside = await recordAttempt({ runId: run.id, entryIndex: 0, evaluation: ok, engine: 'webspeech', durationMs: 1, now: at(2, 12, 1) })
    expect(inside).toMatchObject({ golden: 2, segmentXp: 2 * (5 + 8 + 2) })

    await todayRow(15 * 60_000)
    const after = await start('read', at(2, 12, 4))
    const late = await recordAttempt({ runId: after.id, entryIndex: 0, evaluation: ok, engine: 'webspeech', durationMs: 1, now: at(2, 12, 5) })
    expect(late).toMatchObject({ golden: 1, segmentXp: 5 + 8 + 2 })
  })
})

describe('days, streaks and freezes', () => {
  it('attributes activity after midnight to the previous day and flags evening/morning', async () => {
    const run = await start('read', at(2, 23, 50))
    await recordAttempt({ runId: run.id, entryIndex: 0, evaluation: ok, engine: 'webspeech', durationMs: 1, now: at(3, 0, 30) })
    await recordAttempt({ runId: run.id, entryIndex: 1, evaluation: ok, engine: 'webspeech', durationMs: 1, now: at(3, 6, 30) })
    expect(await db.dailyStats.get('2026-10-02')).toMatchObject({ segmentsAccepted: 1, evening: true, morning: false })
    expect(await db.dailyStats.get('2026-10-03')).toMatchObject({ segmentsAccepted: 1, morning: true })
  })

  it('earns a freeze at a 7-day streak and uses it to bridge a missed day', async () => {
    for (let day = 10; day <= 16; day++) await speakAll(await start('read', at(day)), at(day))
    let { game } = await readSettings()
    expect(game.freezesAvailable).toBe(1)
    expect((await unlockedKeys()).has('streak.7')).toBe(true)

    // The 17th is missed; the app opens on the 18th → the gap is bridged.
    expect(await reconcileStreakFreezes(at(18, 9))).toEqual(['2026-10-17'])
    ;({ game } = await readSettings())
    expect(game).toMatchObject({ freezesAvailable: 0, pendingFreezeNotice: ['2026-10-17'] })
    expect(await db.dailyStats.get('2026-10-17')).toMatchObject({ frozen: true, segmentsAccepted: 0 })
    expect(await reconcileStreakFreezes(at(18, 10))).toEqual([])
  })

  it('bridges a missed day inside the attempt when startup reconciliation did not run (app resumed from memory)', async () => {
    await updateGameState({ freezesAvailable: 1 })
    for (let day = 10; day <= 15; day++) await speakAll(await start('read', at(day)), at(day))
    // The 16th is missed; on the 17th the first line arrives before any reconcile.
    const run = await start('read', at(17))
    const outcome = await recordAttempt({ runId: run.id, entryIndex: 0, evaluation: ok, engine: 'webspeech', durationMs: 1, now: at(17, 12, 1) })
    expect(outcome.streak).toBe(7)
    expect(outcome.segmentXp).toBe(Math.round((5 + 8 + 2) * 1.25))
    expect(outcome.freezeEarned).toBe(true)
    expect(await db.dailyStats.get('2026-10-16')).toMatchObject({ frozen: true })
    expect((await readSettings()).game).toMatchObject({ freezesAvailable: 1, pendingFreezeNotice: ['2026-10-16'] })
  })

  it('does not waste freezes on a gap they cannot cover, and counts a comeback', async () => {
    await updateGameState({ freezesAvailable: 2 })
    await speakAll(await start('read', at(10)), at(10))
    expect(await reconcileStreakFreezes(at(14))).toEqual([])
    expect((await readSettings()).game.freezesAvailable).toBe(2)
    await speakAll(await start('read', at(14)), at(14))
    expect((await readSettings()).game.comebacks).toBe(1)
    expect((await unlockedKeys()).has('comeback')).toBe(true)
  })
})
