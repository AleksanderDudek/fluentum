import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/schema'
import type { Attempt } from '@/db/types'
import { resetDb } from '@/test/db'
import { getActiveSegments, replaceSegments, SEGMENT_EDIT_TABLES } from './texts'

const TEXT = 'dialogue:en:cafe'

function attemptFor(segmentId: string): Attempt {
  return {
    id: `a-${segmentId}`,
    segmentId,
    textId: TEXT,
    sessionRunId: 'run',
    dayKey: '2026-10-02',
    timestamp: 1,
    coverage: 1,
    extra: 0,
    wrong: 0,
    accepted: true,
    firstTry: true,
    threshold: 0.9,
    engine: 'webspeech',
    durationMs: 1000,
  }
}

const replace = (contents: string[]) => db.transaction('rw', SEGMENT_EDIT_TABLES, () => replaceSegments(TEXT, contents))

beforeEach(resetDb)

describe('replaceSegments', () => {
  it('stores ordered segments with word counts', async () => {
    await replace(['Hi there.', 'I’d like a coffee.'])
    const segments = await getActiveSegments(TEXT)
    expect(segments.map((s) => [s.order, s.content, s.wordCount])).toEqual([
      [0, 'Hi there.', 2],
      [1, 'I’d like a coffee.', 4],
    ])
  })

  it('keeps ids of unchanged lines, archives spoken ones a new script drops, deletes unspoken ones', async () => {
    const [hi, coffee, tea] = await replace(['Hi there.', 'I’d like a coffee.', 'And a tea.'])
    await db.attempts.add(attemptFor(coffee!.id))
    const next = await replace(['Hi there.', 'I’d like a large coffee.'])
    expect(next[0]!.id).toBe(hi!.id)
    expect(next[1]!.id).not.toBe(coffee!.id)
    expect(await db.segments.get(coffee!.id)).toMatchObject({ archived: true })
    expect(await db.segments.get(tea!.id)).toBeUndefined()
    expect((await getActiveSegments(TEXT)).map((s) => s.content)).toEqual(['Hi there.', 'I’d like a large coffee.'])
  })

  it('archives a dropped line an unfinished run still needs', async () => {
    const [hi, bye] = await replace(['Hi there.', 'Bye.'])
    await db.sessionRuns.add({
      id: 'run',
      textId: TEXT,
      title: 'Café',
      dayKey: '2026-10-02',
      startedAt: 1,
      status: 'partial',
      plan: [hi!, bye!].map((s) => ({ segmentId: s.id, textId: TEXT })),
      entries: [],
      cursor: 1,
      xpEarned: 0,
      lastActivityAt: 1,
      mode: 'read',
    })
    await replace(['Hi there.'])
    expect(await db.segments.get(bye!.id)).toMatchObject({ archived: true })
  })
})
