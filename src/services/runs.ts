import { db } from '@/db/schema'
import type { SessionRun } from '@/db/types'
import type { PracticeMode } from '@/domain/mastery'
import type { EntryState } from '@/domain/session'
import { dayKeyFor } from '@/domain/time/dayKey'
import { newId } from '@/lib/id'
import { readSettings } from './settings'
import { getActiveSegments } from './texts'

export type RunErrorCode = 'notFound' | 'empty'

export class RunError extends Error {
  readonly code: RunErrorCode
  constructor(code: RunErrorCode) {
    super(`Run error: ${code}`)
    this.name = 'RunError'
    this.code = code
  }
}

const freshEntry = (): EntryState => ({ status: 'pending', attempts: 0, firstTry: false, xp: 0 })

/** Pauses every running run (only one runs at a time; also used at app start). */
export async function markRunningRunsPartial(exceptId?: string): Promise<void> {
  await db.sessionRuns
    .where('status')
    .equals('in_progress')
    .filter((run) => run.id !== exceptId)
    .modify({ status: 'partial' })
}

/** Starts a run through a text's active lines, in one way (read / prompt / recall). */
export async function startRun(textId: string, mode: PracticeMode, now = Date.now()): Promise<SessionRun> {
  const { app } = await readSettings()
  const text = await db.texts.get(textId)
  if (!text) throw new RunError('notFound')
  const plan = (await getActiveSegments(textId)).map((segment) => ({ segmentId: segment.id, textId }))
  if (plan.length === 0) throw new RunError('empty')
  const run: SessionRun = {
    id: newId(),
    textId,
    title: text.title,
    dayKey: dayKeyFor(now, app.dayStartHour),
    startedAt: now,
    status: 'in_progress',
    plan,
    entries: plan.map(freshEntry),
    cursor: 0,
    xpEarned: 0,
    lastActivityAt: now,
    mode,
  }
  await db.transaction('rw', db.sessionRuns, async () => {
    await markRunningRunsPartial()
    await db.sessionRuns.add(run)
  })
  return run
}

/** Most recent unfinished run of today with some progress (resumable the same day). */
export async function findResumableRun(now = Date.now()): Promise<SessionRun | undefined> {
  const { app } = await readSettings()
  const today = dayKeyFor(now, app.dayStartHour)
  const runs = await db.sessionRuns.where('dayKey').equals(today).toArray()
  return runs
    .filter((run) => run.status !== 'completed' && run.cursor > 0 && run.cursor < run.plan.length)
    .sort((a, b) => b.lastActivityAt - a.lastActivityAt)[0]
}

export async function resumeRun(runId: string, now = Date.now()): Promise<SessionRun> {
  return db.transaction('rw', db.sessionRuns, async () => {
    const run = await db.sessionRuns.get(runId)
    if (!run || run.status === 'completed' || run.cursor >= run.plan.length) throw new RunError('notFound')
    await markRunningRunsPartial(runId)
    const next = { ...run, status: 'in_progress' as const, lastActivityAt: now }
    await db.sessionRuns.put(next)
    return next
  })
}
