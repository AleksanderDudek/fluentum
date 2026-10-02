import { describe, expect, it } from 'vitest'
import { summarizeRun } from './progress'
import type { EntryState } from './types'

const state = (overrides: Partial<EntryState> = {}): EntryState => ({ status: 'pending', attempts: 0, firstTry: false, xp: 0, ...overrides })

describe('summarizeRun', () => {
  it('counts lines said, skipped and said on the first try', () => {
    const summary = summarizeRun([
      state({ status: 'accepted', firstTry: true }),
      state({ status: 'accepted' }),
      state({ status: 'skipped' }),
      state(),
    ])
    expect(summary).toEqual({ total: 4, accepted: 2, skipped: 1, firstTry: 1, firstTryRate: 1 / 3 })
  })

  it('has a first-try rate of 0 before any line was processed', () => {
    expect(summarizeRun([state(), state()]).firstTryRate).toBe(0)
    expect(summarizeRun([]).total).toBe(0)
  })
})
