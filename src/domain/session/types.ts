/** One line to say in a run: a segment of the conversation's text, in script order. */
export interface PlanEntry {
  segmentId: string
  textId: string
}

export type EntryStatus = 'pending' | 'accepted' | 'skipped'

/** Progress of one plan entry inside a run. */
export interface EntryState {
  status: EntryStatus
  attempts: number
  /** Accepted on the first attempt. */
  firstTry: boolean
  /** XP awarded for this entry (line XP incl. bonus and multipliers). */
  xp: number
  /** Prompt / recall: the learner revealed the whole line with "Show" (no star for this run). */
  hinted?: boolean
}
