import Dexie from 'dexie'
import { db } from '@/db/schema'
import type { Segment } from '@/db/types'
import { countWords } from '@/domain/text/countWords'
import { newId } from '@/lib/id'

/** Active (non-archived) segments of a text in reading order. */
export async function getActiveSegments(textId: string): Promise<Segment[]> {
  return db.segments
    .where('[textId+order]')
    .between([textId, Dexie.minKey], [textId, Dexie.maxKey])
    .filter((segment) => !segment.archived)
    .toArray()
}

async function hasAttempts(segmentId: string): Promise<boolean> {
  return (await db.attempts.where('segmentId').equals(segmentId).limit(1).count()) > 0
}

/** Segments still needed by a run that can be resumed. */
async function segmentsInUnfinishedRuns(): Promise<Set<string>> {
  const runs = await db.sessionRuns.where('status').anyOf('in_progress', 'partial').toArray()
  return new Set(runs.flatMap((run) => run.plan.map((entry) => entry.segmentId)))
}

/** Tables `replaceSegments` touches — include them in the caller's transaction. */
export const SEGMENT_EDIT_TABLES = [db.texts, db.segments, db.attempts, db.sessionRuns] as const

/**
 * Replaces the active segments of a text while preserving history: unchanged lines keep their ids (and attempt
 * history); lines that a newer script removed or changed are archived when they were ever spoken or an unfinished
 * run still needs them (so it can be resumed), deleted otherwise.
 * Must run inside a transaction covering {@link SEGMENT_EDIT_TABLES}.
 */
export async function replaceSegments(textId: string, contents: readonly string[]): Promise<Segment[]> {
  const pool = new Map<string, Segment[]>()
  for (const segment of await getActiveSegments(textId)) {
    const queue = pool.get(segment.content)
    if (queue) queue.push(segment)
    else pool.set(segment.content, [segment])
  }
  const next: Segment[] = contents.map((content, order) => {
    const reused = pool.get(content)?.shift()
    return reused ? { ...reused, order } : { id: newId(), textId, order, content, wordCount: countWords(content), archived: false }
  })
  const leftovers = [...pool.values()].flat()
  const needed = leftovers.length > 0 ? await segmentsInUnfinishedRuns() : new Set<string>()
  for (const leftover of leftovers) {
    if (needed.has(leftover.id) || (await hasAttempts(leftover.id))) await db.segments.put({ ...leftover, archived: true })
    else await db.segments.delete(leftover.id)
  }
  await db.segments.bulkPut(next)
  return next
}
