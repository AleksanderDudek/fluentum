import { describe, expect, it } from 'vitest'
import { coursePath, nextStep, starTotals } from './course'
import { earnsStar, isPracticeMode, lineMask, nextMode, normalizeStars, withStar } from './modes'

describe('practice modes', () => {
  it('masks nothing when reading, first letters when prompted, every letter when recalling', () => {
    expect(lineMask('read')).toBeNull()
    expect(lineMask('prompt')).toBe('initials')
    expect(lineMask('recall')).toBe('hidden')
  })

  it('recognises the three modes only', () => {
    expect(['read', 'prompt', 'recall'].every(isPracticeMode)).toBe(true)
    expect(isPracticeMode('memory')).toBe(false)
    expect(isPracticeMode(undefined)).toBe(false)
  })

  it('keeps stars in course order without duplicates', () => {
    expect(normalizeStars(['recall', 'read', 'read', 'x'])).toEqual(['read', 'recall'])
    expect(withStar(['recall'], 'prompt')).toEqual(['prompt', 'recall'])
    expect(withStar(['read'], 'read')).toEqual(['read'])
  })

  it('suggests the first way without its star, and recall once all three are earned', () => {
    expect(nextMode([])).toBe('read')
    expect(nextMode(['read'])).toBe('prompt')
    expect(nextMode(['read', 'recall'])).toBe('prompt')
    expect(nextMode(['read', 'prompt', 'recall'])).toBe('recall')
  })
})

describe('earnsStar', () => {
  it('needs every line said, without a skip and without revealing one', () => {
    expect(earnsStar([{ status: 'accepted' }, { status: 'accepted' }])).toBe(true)
    expect(earnsStar([{ status: 'accepted' }, { status: 'skipped' }])).toBe(false)
    expect(earnsStar([{ status: 'accepted' }, { status: 'pending' }])).toBe(false)
    expect(earnsStar([{ status: 'accepted', hinted: true }, { status: 'accepted' }])).toBe(false)
    expect(earnsStar([])).toBe(false)
  })
})

describe('coursePath', () => {
  it('reads each conversation, prompts the one before and recalls the one before that', () => {
    expect(coursePath(['a', 'b', 'c']).map(({ key, mode }) => `${mode}:${key}`)).toEqual([
      'read:a',
      'read:b',
      'prompt:a',
      'read:c',
      'prompt:b',
      'recall:a',
      'prompt:c',
      'recall:b',
      'recall:c',
    ])
  })

  it('covers every way of every conversation exactly once', () => {
    const keys = ['a', 'b', 'c', 'd', 'e']
    const steps = coursePath(keys).map(({ key, mode }) => `${mode}:${key}`)
    expect(steps).toHaveLength(15)
    expect(new Set(steps).size).toBe(15)
  })

  it('handles a course of one conversation and an empty one', () => {
    expect(coursePath(['a']).map((s) => s.mode)).toEqual(['read', 'prompt', 'recall'])
    expect(coursePath([])).toEqual([])
  })
})

describe('nextStep', () => {
  const keys = ['a', 'b', 'c']

  it('starts with reading the first conversation', () => {
    expect(nextStep(keys, { stars: new Map() })).toEqual({ key: 'a', mode: 'read' })
  })

  it('follows the staircase, skipping steps already starred out of order', () => {
    expect(nextStep(keys, { stars: new Map([['a', ['read']]]) })).toEqual({ key: 'b', mode: 'read' })
    expect(nextStep(keys, { stars: new Map([['a', ['read']], ['b', ['read']]]) })).toEqual({ key: 'a', mode: 'prompt' })
    expect(nextStep(keys, { stars: new Map([['a', ['read', 'prompt', 'recall']], ['b', ['read']]]) })).toEqual({ key: 'c', mode: 'read' })
  })

  it('offers a recall of the conversation practised longest ago once every star is earned', () => {
    const all = new Map(keys.map((key) => [key, ['read', 'prompt', 'recall'] as const]))
    const lastPracticedAt = new Map([
      ['a', 300],
      ['b', 100],
      ['c', 200],
    ])
    expect(nextStep(keys, { stars: all, lastPracticedAt })).toEqual({ key: 'b', mode: 'recall' })
  })

  it('has nothing to offer without content', () => {
    expect(nextStep([], { stars: new Map() })).toBeUndefined()
  })
})

describe('starTotals', () => {
  it('counts the stars earned out of three per conversation', () => {
    expect(starTotals(['a', 'b'], new Map([['a', ['read', 'prompt']]]))).toEqual({ earned: 2, total: 6 })
  })
})
