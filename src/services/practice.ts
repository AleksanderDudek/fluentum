import { db } from '@/db/schema'
import type { Attempt, DailyStats, GameState, SessionRun, TextStats } from '@/db/types'
import { computeStreak, dayMarksFrom, freezeAward, isComeback, levelInfo, reconcileFreezes, segmentXp, XP_RULES } from '@/domain/gamification'
import { earnsStar, STAR_XP, withStar, type PracticeMode } from '@/domain/mastery'
import { readingMs } from '@/domain/reading/pace'
import { dayKeyFor } from '@/domain/time/dayKey'
import type { DayKey, EngineId } from '@/domain/types'
import { newId } from '@/lib/id'
import { useSettingsStore } from '@/stores/settings'
import { emptyDailyStats, PROGRESS_TABLES, unlockAchievements, type UnlockedAchievement } from './progress'
import { readSettings } from './settings'

/** What the practice service needs from a matcher result (structural: `MatchResult` fits). */
export interface Evaluation {
  accepted: boolean
  coverage: number
  extra: number
  wrong: number
  transcript: string
  /** The coverage the attempt needed (its rung of the coverage ladder), stored with it. */
  threshold: number
}

export interface AttemptInput {
  runId: string
  /** Must be the run's cursor: segments are spoken in order. */
  entryIndex: number
  evaluation: Evaluation
  engine: EngineId
  durationMs: number
  now?: number
}

export interface ProgressOutcome {
  xpGained: number
  unlocked: UnlockedAchievement[]
  levelUp?: { from: number; to: number }
  streak: number
  goalReached: boolean
  goalProgress: { done: number; goal: number }
  freezeEarned: boolean
}

export interface AttemptOutcome extends ProgressOutcome {
  accepted: boolean
  firstTry: boolean
  segmentXp: number
  /** Golden quarter-hour multiplier applied to this sentence (1 outside the window). */
  golden: number
  /** Today's estimated reading time after this attempt. */
  readingMs: number
  run: SessionRun
  /** Set when this line finished the conversation with every line said. */
  conversationCompleted?: { bonusXp: number; perfect: boolean; newStar?: PracticeMode; starXp: number }
  /** Failed attempts on this entry so far (drives the "skip after 3" rule). */
  failedAttempts: number
}

export interface FinishOutcome {
  run: SessionRun
  /** Every line said: no skips. */
  clean: boolean
}

export type PracticeErrorCode = 'runNotFound' | 'notRunning' | 'outOfOrder' | 'segmentMissing'

export class PracticeError extends Error {
  readonly code: PracticeErrorCode
  constructor(code: PracticeErrorCode) {
    super(`Practice error: ${code}`)
    this.name = 'PracticeError'
    this.code = code
  }
}

const TABLES = [db.sessionRuns, db.attempts, ...PROGRESS_TABLES]

function emptyTextStats(textId: string): TextStats {
  return { textId, repetitions: 0, segmentsAccepted: 0, perfectRuns: 0, stars: [] }
}

/** Morning = before 08:00 (after the day start); evening = 21:00 until the day start (DECISIONS #19). */
function timeOfDay(timestamp: number, dayStartHour: number): { morning: boolean; evening: boolean } {
  const hour = new Date(timestamp).getHours()
  return { morning: hour >= dayStartHour && hour < 8, evening: hour >= 21 || hour < dayStartHour }
}

async function currentStreak(today: DayKey): Promise<number> {
  return computeStreak(dayMarksFrom(await db.dailyStats.toArray()), today).current
}

async function loadRunning(runId: string): Promise<SessionRun> {
  const run = await db.sessionRuns.get(runId)
  if (!run) throw new PracticeError('runNotFound')
  if (run.status === 'completed') throw new PracticeError('notRunning')
  return run
}

function nextPending(run: SessionRun, from: number): number {
  let i = from
  while (i < run.entries.length && run.entries[i]?.status !== 'pending') i++
  return i
}

/**
 * Freezes the missed days before `today` when the available freezes cover the
 * whole gap (DECISIONS #16). Mutates `game` (freezes, pending notice); the caller
 * persists it. Idempotent. Runs at app start AND before the first accepted
 * sentence of a day — an installed PWA resumed from memory may skip the former.
 */
async function bridgeMissedDays(game: GameState, today: DayKey): Promise<DayKey[]> {
  const marks = dayMarksFrom(await db.dailyStats.toArray())
  const { frozenDays, freezesLeft } = reconcileFreezes(marks, today, game.freezesAvailable)
  for (const dayKey of frozenDays) {
    const existing = (await db.dailyStats.get(dayKey)) ?? emptyDailyStats(dayKey)
    await db.dailyStats.put({ ...existing, frozen: true })
  }
  game.freezesAvailable = freezesLeft
  if (frozenDays.length > 0) game.pendingFreezeNotice = [...game.pendingFreezeNotice, ...frozenDays]
  return frozenDays
}

function publishGame(game: GameState) {
  useSettingsStore.setState({ game })
}

/**
 * Records one spoken attempt and applies every consequence in ONE transaction: attempt row, run progress, daily and
 * conversation aggregates, XP ledger (line, finished conversation, first star of a way, daily goal), streak freezes,
 * comeback and achievements.
 */
export async function recordAttempt(input: AttemptInput): Promise<AttemptOutcome> {
  const now = input.now ?? Date.now()
  const outcome = await db.transaction('rw', TABLES, async (): Promise<AttemptOutcome> => {
    const { app, game } = await readSettings()
    const run = await loadRunning(input.runId)
    if (input.entryIndex !== run.cursor) throw new PracticeError('outOfOrder')
    const planEntry = run.plan[input.entryIndex]
    const entry = run.entries[input.entryIndex]
    if (!planEntry || !entry || entry.status !== 'pending') throw new PracticeError('outOfOrder')
    const segment = await db.segments.get(planEntry.segmentId)
    const text = await db.texts.get(planEntry.textId)
    if (!segment || !text) throw new PracticeError('segmentMissing')

    const dayKey = dayKeyFor(now, app.dayStartHour)
    const levelBefore = levelInfo(game.totalXp).level
    const accepted = input.evaluation.accepted
    entry.attempts += 1
    const firstTry = accepted && entry.attempts === 1

    const attempt: Attempt = {
      id: newId(),
      segmentId: segment.id,
      textId: text.id,
      sessionRunId: run.id,
      dayKey,
      timestamp: now,
      transcript: app.saveTranscripts ? input.evaluation.transcript : undefined,
      coverage: input.evaluation.coverage,
      extra: input.evaluation.extra,
      wrong: input.evaluation.wrong,
      accepted,
      firstTry,
      threshold: input.evaluation.threshold,
      engine: input.engine,
      durationMs: input.durationMs,
    }
    await db.attempts.add(attempt)

    const daily: DailyStats = (await db.dailyStats.get(dayKey)) ?? emptyDailyStats(dayKey)
    const textStats = (await db.textStats.get(text.id)) ?? emptyTextStats(text.id)
    daily.attempts += 1
    run.lastActivityAt = now
    run.status = 'in_progress'

    const result: AttemptOutcome = {
      accepted,
      firstTry,
      segmentXp: 0,
      golden: 1,
      readingMs: daily.readingMs ?? 0,
      run,
      failedAttempts: entry.attempts - (accepted ? 1 : 0),
      xpGained: 0,
      unlocked: [],
      streak: 0,
      goalReached: false,
      goalProgress: { done: daily.segmentsAccepted, goal: app.dailyGoal },
      freezeEarned: false,
    }

    if (!accepted) {
      await db.dailyStats.put(daily)
      await db.textStats.put(textStats)
      await db.sessionRuns.put(run)
      result.streak = await currentStreak(dayKey)
      return result
    }

    // --- accepted -----------------------------------------------------------
    const firstActivityToday = daily.segmentsAccepted === 0
    if (firstActivityToday) {
      await bridgeMissedDays(game, dayKey)
      const previous = (await db.dailyStats.toArray())
        .filter((d) => d.segmentsAccepted > 0 && d.dayKey < dayKey)
        .map((d) => d.dayKey)
        .sort()
        .at(-1)
      if (isComeback(previous, dayKey)) game.comebacks += 1
    }
    const { morning, evening } = timeOfDay(now, app.dayStartHour)
    daily.segmentsAccepted += 1
    daily.firstTryAccepted += firstTry ? 1 : 0
    daily.firstActivityAt ??= now
    daily.lastActivityAt = now
    daily.morning ||= morning
    daily.evening ||= evening
    await db.dailyStats.put(daily)

    const streak = await currentStreak(dayKey)
    if (firstActivityToday) {
      const award = freezeAward(streak, game.lastFreezeAwardStreak, game.freezesAvailable)
      game.lastFreezeAwardStreak = award.lastAwardStreak
      game.freezesAvailable += award.award
      result.freezeEarned = award.award > 0
    }

    const readBefore = daily.readingMs
    const breakdown = segmentXp(segment.wordCount, firstTry, streak, readBefore)
    const xp = breakdown.total
    daily.readingMs = readBefore + readingMs(segment.wordCount, text.lang)
    await db.xpLedger.add({ timestamp: now, dayKey, reason: 'line', amount: xp, refId: attempt.id })
    let gained = xp
    entry.status = 'accepted'
    entry.firstTry = firstTry
    entry.xp = xp

    textStats.segmentsAccepted += 1
    textStats.lastPracticedAt = now
    run.cursor = nextPending(run, input.entryIndex + 1)

    // The last line said and every line accepted: the conversation is finished (a skip anywhere breaks it).
    if (run.cursor >= run.entries.length && run.entries.every((e) => e.status === 'accepted')) {
      const perfect = run.entries.every((e) => e.firstTry)
      textStats.repetitions += 1
      daily.conversationsCompleted += 1
      if (perfect) {
        textStats.perfectRuns += 1
        game.perfectConversations += 1
      }
      const bonusXp = XP_RULES.conversationComplete
      await db.xpLedger.add({ timestamp: now, dayKey, reason: 'conversation', amount: bonusXp, refId: run.id })
      gained += bonusXp
      // A way's star: earned the first time the conversation is finished in it without revealing a line.
      let newStar: PracticeMode | undefined
      let starXp = 0
      if (earnsStar(run.entries) && !textStats.stars.includes(run.mode)) {
        newStar = run.mode
        starXp = STAR_XP[run.mode]
        textStats.stars = withStar(textStats.stars, run.mode)
        run.newStar = run.mode
        await db.xpLedger.add({ timestamp: now, dayKey, reason: 'star', amount: starXp, refId: `${run.id}:${run.mode}` })
        gained += starXp
      }
      result.conversationCompleted = { bonusXp, perfect, newStar, starXp }
    }

    if (!daily.goalReached && daily.segmentsAccepted >= app.dailyGoal) {
      daily.goalReached = true
      await db.xpLedger.add({ timestamp: now, dayKey, reason: 'dailyGoal', amount: XP_RULES.dailyGoal, refId: dayKey })
      gained += XP_RULES.dailyGoal
      result.goalReached = true
    }

    daily.xp += gained
    game.totalXp += gained
    run.xpEarned += gained
    await db.dailyStats.put(daily)
    await db.textStats.put(textStats)

    const unlocked = await unlockAchievements({ game, dayKey, now })
    const achievementXp = unlocked.reduce((sum, u) => sum + u.xp, 0)
    run.xpEarned += achievementXp
    if (unlocked.length > 0) run.unlocked = [...(run.unlocked ?? []), ...unlocked.map((u) => u.key)]
    await db.sessionRuns.put(run)

    const levelAfter = levelInfo(game.totalXp).level
    Object.assign(result, {
      segmentXp: xp,
      golden: breakdown.golden,
      readingMs: daily.readingMs,
      xpGained: gained + achievementXp,
      unlocked,
      streak,
      goalProgress: { done: daily.segmentsAccepted, goal: app.dailyGoal },
      levelUp: levelAfter > levelBefore ? { from: levelBefore, to: levelAfter } : undefined,
    })
    return result
  })
  publishGame((await readSettings()).game)
  return outcome
}

/** Skips the current line after three failed attempts: no XP, and the conversation does not count as finished. */
export async function skipEntry(runId: string, entryIndex: number, now = Date.now()): Promise<SessionRun> {
  return db.transaction('rw', db.sessionRuns, async () => {
    const run = await loadRunning(runId)
    const entry = run.entries[entryIndex]
    const planEntry = run.plan[entryIndex]
    if (entryIndex !== run.cursor || !entry || !planEntry || entry.status !== 'pending') throw new PracticeError('outOfOrder')
    entry.status = 'skipped'
    run.cursor = nextPending(run, entryIndex + 1)
    run.lastActivityAt = now
    await db.sessionRuns.put(run)
    return run
  })
}

/** Prompt / recall: the learner revealed the current line with "Show" (that run earns no star). */
export async function markHinted(runId: string, entryIndex: number): Promise<void> {
  await db.transaction('rw', db.sessionRuns, async () => {
    const run = await db.sessionRuns.get(runId)
    const entry = run?.entries[entryIndex]
    if (!run || !entry || entry.hinted) return
    entry.hinted = true
    await db.sessionRuns.put(run)
  })
}

/** Leaves a conversation midway; it can be resumed the same day. */
export async function pauseRun(runId: string, now = Date.now()): Promise<void> {
  await db.sessionRuns.where('id').equals(runId).filter((r) => r.status === 'in_progress').modify({ status: 'partial', lastActivityAt: now })
}

/**
 * Ends a run that reached its last line. Everything a finished conversation earns was already recorded with its
 * last accepted line (`recordAttempt`); this only closes the run. Idempotent.
 */
export async function finishRun(runId: string, now = Date.now()): Promise<FinishOutcome> {
  return db.transaction('rw', db.sessionRuns, async () => {
    const run = await db.sessionRuns.get(runId)
    if (!run) throw new PracticeError('runNotFound')
    const clean = run.entries.length > 0 && run.entries.every((e) => e.status === 'accepted')
    if (run.status !== 'completed') {
      run.status = 'completed'
      run.endedAt = now
      run.lastActivityAt = now
      await db.sessionRuns.put(run)
    }
    return { run, clean }
  })
}

/**
 * App start: bridge missed days with streak freezes when they cover the whole gap
 * (DECISIONS #16) and remember them for the "your streak is safe" notice.
 */
export async function reconcileStreakFreezes(now = Date.now()): Promise<DayKey[]> {
  return db.transaction('rw', [db.dailyStats, db.settings], async () => {
    const { app, game } = await readSettings()
    const frozenDays = await bridgeMissedDays(game, dayKeyFor(now, app.dayStartHour))
    if (frozenDays.length > 0) await db.settings.put({ key: 'game', value: game })
    return frozenDays
  })
}
