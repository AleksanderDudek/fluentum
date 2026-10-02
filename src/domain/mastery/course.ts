import { PRACTICE_MODES, type PracticeMode } from './modes'

/*
 * The course path (DECISIONS #3): every conversation is met three times — read, then prompted, then recalled —
 * at growing intervals instead of three times in a row. Step k reads conversation k, prompts conversation k-1 and
 * recalls conversation k-2 (a staircase), so a conversation comes back one and two lessons after it was first read.
 */

export interface CourseStep {
  key: string
  mode: PracticeMode
}

/** The order in which the course suggests each conversation's three ways (keys in course order). */
export function coursePath(keys: readonly string[]): CourseStep[] {
  const steps: CourseStep[] = []
  for (let wave = 0; wave < keys.length + PRACTICE_MODES.length - 1; wave++) {
    PRACTICE_MODES.forEach((mode, lag) => {
      const key = keys[wave - lag]
      if (key !== undefined) steps.push({ key, mode })
    })
  }
  return steps
}

export interface CourseProgress {
  stars: ReadonlyMap<string, readonly PracticeMode[]>
  /** When each conversation was last practised (review order once every star is earned). */
  lastPracticedAt?: ReadonlyMap<string, number>
}

/**
 * What to practise next: the first step of the path whose star is still missing; once every star is earned, a
 * recall of the conversation practised longest ago (never practised counts as longest). Undefined without content.
 */
export function nextStep(keys: readonly string[], progress: CourseProgress): CourseStep | undefined {
  const open = coursePath(keys).find(({ key, mode }) => !progress.stars.get(key)?.includes(mode))
  if (open) return open
  const review = [...keys].sort((a, b) => (progress.lastPracticedAt?.get(a) ?? 0) - (progress.lastPracticedAt?.get(b) ?? 0))[0]
  return review === undefined ? undefined : { key: review, mode: 'recall' }
}

/** Stars earned out of the stars available for a group of conversations. */
export function starTotals(keys: readonly string[], stars: ReadonlyMap<string, readonly PracticeMode[]>): { earned: number; total: number } {
  const earned = keys.reduce((sum, key) => sum + (stars.get(key)?.length ?? 0), 0)
  return { earned, total: keys.length * PRACTICE_MODES.length }
}
