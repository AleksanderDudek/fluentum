import { describe, expect, it } from 'vitest'
import { ACHIEVEMENT_CATEGORIES, ACHIEVEMENT_RULES, evaluateAchievements, isAchievementRule, parseAchievementRules, ruleProgress } from './achievements'
import { GLOBAL_METRICS, type GlobalMetric } from './metrics'

const zeros = () => Object.fromEntries(GLOBAL_METRICS.map((metric) => [metric, 0])) as Record<GlobalMetric, number>

describe('ACHIEVEMENT_RULES', () => {
  it('has unique ids and uses every metric in at least one rule', () => {
    const ids = ACHIEVEMENT_RULES.map((rule) => rule.id)
    expect(new Set(ids).size).toBe(ids.length)
    const used = new Set(ACHIEVEMENT_RULES.map((rule) => rule.metric))
    expect(GLOBAL_METRICS.filter((metric) => !used.has(metric))).toEqual([])
  })

  it('groups rules into the known categories, each used at least once', () => {
    const used = new Set(ACHIEVEMENT_RULES.map((rule) => rule.category))
    expect(ACHIEVEMENT_CATEGORIES.filter((category) => !used.has(category))).toEqual([])
  })

  it('hides only the surprise achievements', () => {
    expect(ACHIEVEMENT_RULES.filter((rule) => rule.hidden).map((rule) => rule.id)).toEqual(['time.morning.7', 'time.evening.7', 'comeback'])
  })

  it('raises the tier with the threshold within one metric', () => {
    const order = ['bronze', 'silver', 'gold', 'platinum', 'diamond']
    for (const metric of GLOBAL_METRICS) {
      const rules = ACHIEVEMENT_RULES.filter((rule) => rule.metric === metric).sort((a, b) => a.threshold - b.threshold)
      const tiers = rules.map((rule) => order.indexOf(rule.tier))
      expect({ metric, tiers }).toEqual({ metric, tiers: [...tiers].sort((a, b) => a - b) })
    }
  })
})

describe('parseAchievementRules', () => {
  const rule = { id: 'x.1', metric: 'stars', threshold: 1, tier: 'bronze', category: 'mastery' }

  it('accepts well-formed rules', () => {
    expect(parseAchievementRules([rule, { ...rule, id: 'x.2', hidden: true }])).toHaveLength(2)
  })

  it.each([
    [{ ...rule, metric: 'textRepetitions' }],
    [{ ...rule, threshold: 0 }],
    [{ ...rule, tier: 'wood' }],
    [{ ...rule, category: 'bible' }],
    [{ ...rule, scope: 'text' }],
    [{ ...rule, hidden: 'yes' }],
    [{ ...rule, id: '' }],
  ])('rejects malformed rules (%#)', (bad) => {
    expect(isAchievementRule(bad)).toBe(false)
    expect(() => parseAchievementRules([bad])).toThrow(TypeError)
  })

  it('rejects anything but an array, and duplicate ids', () => {
    expect(() => parseAchievementRules({})).toThrow(TypeError)
    expect(() => parseAchievementRules([rule, rule])).toThrow('Duplicate')
  })
})

describe('evaluateAchievements', () => {
  it('unlocks a rule once its metric reaches the threshold, never twice', () => {
    const global = { ...zeros(), conversations: 10, stars: 1, level: 1 }
    const first = evaluateAchievements({ rules: ACHIEVEMENT_RULES, global, unlocked: new Set() })
    expect(first.map((unlock) => unlock.key)).toEqual(['conversation.1', 'conversation.10', 'stars.1'])
    expect(first[0]).toEqual({ key: 'conversation.1', ruleId: 'conversation.1', tier: 'bronze' })
    const again = evaluateAchievements({ rules: ACHIEVEMENT_RULES, global, unlocked: new Set(first.map((u) => u.key)) })
    expect(again).toEqual([])
  })

  it('unlocks nothing for a fresh user', () => {
    expect(evaluateAchievements({ rules: ACHIEVEMENT_RULES, global: { ...zeros(), level: 1 }, unlocked: new Set() })).toEqual([])
  })
})

describe('ruleProgress', () => {
  const rule = ACHIEVEMENT_RULES.find((r) => r.id === 'stars.10')!

  it('reports progress towards the threshold, capped and clamped', () => {
    expect(ruleProgress(rule, 4)).toEqual({ current: 4, threshold: 10, ratio: 0.4 })
    expect(ruleProgress(rule, 40)).toEqual({ current: 10, threshold: 10, ratio: 1 })
    expect(ruleProgress(rule, -3).current).toBe(0)
    expect(ruleProgress(rule, Number.NaN).ratio).toBe(0)
  })
})
