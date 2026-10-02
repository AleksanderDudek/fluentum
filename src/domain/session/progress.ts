import type { EntryState } from './types'

/** Aggregate stats of a run, for the summary screen. A skipped line counts as a failed first try. */
export function summarizeRun(entries: readonly EntryState[]): {
  total: number
  accepted: number
  skipped: number
  firstTry: number
  firstTryRate: number
} {
  const accepted = entries.filter((entry) => entry.status === 'accepted').length
  const skipped = entries.filter((entry) => entry.status === 'skipped').length
  const firstTry = entries.filter((entry) => entry.status === 'accepted' && entry.firstTry).length
  const processed = accepted + skipped
  return { total: entries.length, accepted, skipped, firstTry, firstTryRate: processed === 0 ? 0 : firstTry / processed }
}
