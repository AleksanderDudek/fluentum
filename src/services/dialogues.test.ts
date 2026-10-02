import { beforeEach, describe, expect, it } from 'vitest'
import { DIALOGUES } from '@/content/dialogues'
import { db } from '@/db/schema'
import { dialogueSegments } from '@/domain/dialogue'
import { resetDb } from '@/test/db'
import { courseState, nextCourseStep, startDialogue, startNextStep } from './dialogues'
import { finishRun, recordAttempt, type Evaluation } from './practice'
import { RunError } from './runs'
import { updateAppSettings } from './settings'

const ok: Evaluation = { accepted: true, coverage: 1, extra: 0, wrong: 0, transcript: 'ok', threshold: 0.9 }
const at = (minute: number) => new Date(2026, 9, 2, 12, minute).getTime()
const cafe = DIALOGUES.find((d) => d.key === 'cafe')!
const [first, second] = DIALOGUES

async function sayAll(runId: string, turns: number, from = 1) {
  for (let i = 0; i < turns; i++) {
    await recordAttempt({ runId, entryIndex: i, evaluation: ok, engine: 'webspeech', durationMs: 1, now: at(from + i) })
  }
  return finishRun(runId, at(from + turns))
}

beforeEach(async () => {
  await resetDb()
  await updateAppSettings({ uiLang: 'pl', dayStartHour: 3, dailyGoal: 50 })
})

describe('startDialogue', () => {
  it('turns the learner’s lines into a text in the language being learnt and starts it in the chosen way', async () => {
    const run = await startDialogue('cafe', 'prompt', at(0))
    expect(await db.texts.get('dialogue:en:cafe')).toMatchObject({ lang: 'en', title: 'W kawiarni' })
    const segments = await db.segments.where('textId').equals('dialogue:en:cafe').sortBy('order')
    expect(segments.map((s) => s.content)).toEqual(dialogueSegments(cafe, 'en'))
    expect(run).toMatchObject({ textId: 'dialogue:en:cafe', title: 'W kawiarni', status: 'in_progress', mode: 'prompt' })
    expect(run.plan).toHaveLength(dialogueSegments(cafe, 'en').length)
  })

  it('learns Polish from English: an English interface gets the Polish lines', async () => {
    await updateAppSettings({ uiLang: 'en' })
    const run = await startDialogue('cafe', 'read', at(0))
    expect(await db.texts.get('dialogue:pl:cafe')).toMatchObject({ lang: 'pl', title: 'At the café' })
    expect(run.textId).toBe('dialogue:pl:cafe')
  })

  it('reuses the text when the conversation is started again', async () => {
    await startDialogue('cafe', 'read', at(0))
    await startDialogue('cafe', 'recall', at(1))
    expect(await db.texts.count()).toBe(1)
    expect(await db.segments.where('textId').equals('dialogue:en:cafe').count()).toBe(dialogueSegments(cafe, 'en').length)
  })

  it('follows script changes of a later version and keeps the old lines already spoken', async () => {
    const run = await startDialogue('cafe', 'read', at(0))
    await recordAttempt({ runId: run.id, entryIndex: 0, evaluation: ok, engine: 'webspeech', durationMs: 1, now: at(1) })
    const spoken = run.plan[0]!.segmentId
    await db.segments.update(spoken, { content: 'An older wording.' })

    await startDialogue('cafe', 'read', at(2))
    const active = (await db.segments.where('textId').equals('dialogue:en:cafe').sortBy('order')).filter((s) => !s.archived)
    expect(active.map((s) => s.content)).toEqual(dialogueSegments(cafe, 'en'))
    expect(await db.segments.get(spoken)).toMatchObject({ archived: true, content: 'An older wording.' })
  })

  it('refuses a conversation that does not exist', async () => {
    await expect(startDialogue('nope', 'read', at(0))).rejects.toBeInstanceOf(RunError)
  })
})

describe('the course', () => {
  it('records the star of the way a conversation was finished in, per language learnt', async () => {
    const run = await startDialogue('cafe', 'prompt', at(0))
    await sayAll(run.id, run.plan.length)
    const en = await courseState('en')
    expect(en.stars.get('cafe')).toEqual(['prompt'])
    expect(en.repetitions.get('cafe')).toBe(1)
    expect((await courseState('pl')).stars.size).toBe(0)
  })

  it('suggests reading the first conversation, then the next one, then prompting the first', async () => {
    expect(await nextCourseStep('en')).toEqual({ key: first!.key, mode: 'read' })
    const a = await startDialogue(first!.key, 'read', at(0))
    await sayAll(a.id, a.plan.length)
    expect(await nextCourseStep('en')).toEqual({ key: second!.key, mode: 'read' })
    const b = await startDialogue(second!.key, 'read', at(20))
    await sayAll(b.id, b.plan.length, 21)
    expect(await nextCourseStep('en')).toEqual({ key: first!.key, mode: 'prompt' })
  })

  it('starts the next step after a run, and nothing after a text that is no conversation', async () => {
    const run = await startDialogue(first!.key, 'read', at(0))
    await sayAll(run.id, run.plan.length)
    const next = await startNextStep(run.textId, at(30))
    expect(next).toMatchObject({ textId: `dialogue:en:${second!.key}`, mode: 'read' })
    expect(await startNextStep('something-else', at(31))).toBeUndefined()
  })
})
