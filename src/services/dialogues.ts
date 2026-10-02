import { DIALOGUES, dialogueOfText, dialogueTextId } from '@/content/dialogues'
import { db } from '@/db/schema'
import type { SessionRun, TextItem } from '@/db/types'
import { dialogueSegments, learningLang } from '@/domain/dialogue'
import { nextStep, type CourseStep, type PracticeMode } from '@/domain/mastery'
import type { Lang } from '@/domain/types'
import { RunError, startRun } from './runs'
import { readSettings } from './settings'
import { replaceSegments, SEGMENT_EDIT_TABLES } from './texts'

/**
 * Starts a conversation in one way (read / prompt / recall). The learner's lines, in the language being learnt,
 * become its text `dialogue:<lang>:<key>` — created once, brought up to date with the script on later starts (lines
 * spoken before a change are archived, never lost) — and are played as a run, so the matcher, coverage ladder, XP,
 * streaks, daily goal and golden quarter-hour all apply. The partner's lines come from the script.
 */
export async function startDialogue(key: string, mode: PracticeMode, now = Date.now()): Promise<SessionRun> {
  const dialogue = DIALOGUES.find((d) => d.key === key)
  if (!dialogue) throw new RunError('notFound')
  const { app } = await readSettings()
  const lang = learningLang(app.uiLang)
  const textId = dialogueTextId(key, lang)
  const segments = dialogueSegments(dialogue, lang)
  const title = dialogue.title[app.uiLang]
  await db.transaction('rw', SEGMENT_EDIT_TABLES, async () => {
    const existing = await db.texts.get(textId)
    const body = segments.join(' ')
    const text: TextItem = existing ? { ...existing, title, body, updatedAt: now } : { id: textId, title, lang, body, createdAt: now, updatedAt: now }
    await db.texts.put(text)
    await replaceSegments(textId, segments)
  })
  return startRun(textId, mode, now)
}

export interface CourseState {
  /** Stars of each conversation (by key) in the language being learnt. */
  stars: Map<string, PracticeMode[]>
  /** Times each conversation was finished with every line said. */
  repetitions: Map<string, number>
  lastPracticedAt: Map<string, number>
}

/** The learner's progress through the course in `lang`. */
export async function courseState(lang: Lang): Promise<CourseState> {
  const stats = await db.textStats.bulkGet(DIALOGUES.map((d) => dialogueTextId(d.key, lang)))
  const state: CourseState = { stars: new Map(), repetitions: new Map(), lastPracticedAt: new Map() }
  DIALOGUES.forEach((dialogue, i) => {
    const row = stats[i]
    if (!row) return
    state.stars.set(dialogue.key, row.stars)
    state.repetitions.set(dialogue.key, row.repetitions)
    if (row.lastPracticedAt !== undefined) state.lastPracticedAt.set(dialogue.key, row.lastPracticedAt)
  })
  return state
}

/** The course's next step in `lang` (DECISIONS #3): which conversation, in which way. */
export async function nextCourseStep(lang: Lang): Promise<CourseStep | undefined> {
  return nextStep(
    DIALOGUES.map((d) => d.key),
    await courseState(lang),
  )
}

/** After a run: start the course's next step in the same language. Undefined when `textId` is no conversation. */
export async function startNextStep(textId: string, now = Date.now()): Promise<SessionRun | undefined> {
  const current = dialogueOfText(textId)
  if (!current) return undefined
  const step = await nextCourseStep(current.lang)
  return step ? startDialogue(step.key, step.mode, now) : undefined
}
