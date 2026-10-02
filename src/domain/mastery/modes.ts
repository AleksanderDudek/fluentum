import type { MemoryLevel } from '@/domain/memory/mask'

/**
 * Three ways through a conversation, easiest first (DECISIONS #2): *read* shows the line, its pronunciation and
 * meaning; *prompt* only the first letters of each word and the meaning; *recall* only the meaning — the learner
 * says the line from memory. Finishing a conversation cleanly in a way earns that way's star.
 */
export const PRACTICE_MODES = ['read', 'prompt', 'recall'] as const
export type PracticeMode = (typeof PRACTICE_MODES)[number]

export function isPracticeMode(value: unknown): value is PracticeMode {
  return typeof value === 'string' && (PRACTICE_MODES as readonly string[]).includes(value)
}

/** The memory mask a way puts on the learner's line (words reveal as they are heard); none when reading. */
export function lineMask(mode: PracticeMode): MemoryLevel | null {
  return mode === 'read' ? null : mode === 'prompt' ? 'initials' : 'hidden'
}

/** Bonus XP the first time a conversation earns the star of a way. */
export const STAR_XP: Record<PracticeMode, number> = { read: 15, prompt: 25, recall: 40 }

/** The stars of a conversation in course order, without duplicates (unknown values are dropped). */
export function normalizeStars(stars: readonly string[]): PracticeMode[] {
  return PRACTICE_MODES.filter((mode) => stars.includes(mode))
}

export function withStar(stars: readonly PracticeMode[], mode: PracticeMode): PracticeMode[] {
  return normalizeStars([...stars, mode])
}

interface EntryLike {
  status: 'pending' | 'accepted' | 'skipped'
  hinted?: boolean
}

/**
 * Whether a run earns its way's star: every line said (no skip, nothing pending) and none revealed with "Show".
 * Reading aloud cannot be revealed, so a clean read run always earns it.
 */
export function earnsStar(entries: readonly EntryLike[]): boolean {
  return entries.length > 0 && entries.every((entry) => entry.status === 'accepted' && !entry.hinted)
}

/** The way to practise a conversation next: the first one without its star (Read → Prompt → Recall). */
export function nextMode(stars: readonly PracticeMode[]): PracticeMode {
  return PRACTICE_MODES.find((mode) => !stars.includes(mode)) ?? 'recall'
}
