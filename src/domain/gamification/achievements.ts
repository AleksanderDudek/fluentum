import type { Tier } from '@/domain/types'
import type { GlobalMetric } from './metrics'
import { isGlobalMetric } from './metrics'
import rulesJson from './rules.json'
import { TIER_XP } from './xp'

export const ACHIEVEMENT_CATEGORIES = [
  'conversations',
  'mastery',
  'course',
  'streak',
  'consistency',
  'daily',
  'volume',
  'golden',
  'level',
  'time',
  'other',
] as const
export type AchievementCategory = (typeof ACHIEVEMENT_CATEGORIES)[number]

/** One achievement: unlocks once its metric reaches the threshold. */
export interface AchievementRule {
  id: string
  metric: GlobalMetric
  /** Unlocks when the metric value is at least this (> 0). */
  threshold: number
  tier: Tier
  category: AchievementCategory
  /** Shown as "???" until unlocked. */
  hidden?: boolean
}

export interface AchievementUnlock {
  key: string
  ruleId: string
  tier: Tier
}

const RULE_KEYS: ReadonlySet<string> = new Set(['id', 'metric', 'threshold', 'tier', 'category', 'hidden'])
const CATEGORIES: ReadonlySet<string> = new Set(ACHIEVEMENT_CATEGORIES)
const isTier = (value: unknown): value is Tier => typeof value === 'string' && Object.hasOwn(TIER_XP, value)

/** Shape check for one rule; unknown keys are rejected so typos in `rules.json` fail loudly. */
export function isAchievementRule(value: unknown): value is AchievementRule {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const rule = value as Record<string, unknown>
  if (Object.keys(rule).some((key) => !RULE_KEYS.has(key))) return false
  const { id, metric, threshold, tier, category, hidden } = rule
  return (
    typeof id === 'string' &&
    id.length > 0 &&
    isGlobalMetric(metric) &&
    typeof threshold === 'number' &&
    Number.isFinite(threshold) &&
    threshold > 0 &&
    isTier(tier) &&
    typeof category === 'string' &&
    CATEGORIES.has(category) &&
    (hidden === undefined || typeof hidden === 'boolean')
  )
}

/** Validates a rule list (e.g. `rules.json`); throws on the first invalid or duplicate rule. */
export function parseAchievementRules(value: unknown): AchievementRule[] {
  if (!Array.isArray(value)) throw new TypeError('Achievement rules must be an array')
  const ids = new Set<string>()
  return value.map((rule: unknown, index) => {
    if (!isAchievementRule(rule)) throw new TypeError(`Invalid achievement rule at index ${index}: ${JSON.stringify(rule)}`)
    if (ids.has(rule.id)) throw new TypeError(`Duplicate achievement rule id: ${rule.id}`)
    ids.add(rule.id)
    return rule
  })
}

/** Every achievement, in gallery order. */
export const ACHIEVEMENT_RULES: readonly AchievementRule[] = parseAchievementRules(rulesJson)

/** Achievements to unlock now: rules whose metric reached the threshold and which are not unlocked yet. */
export function evaluateAchievements(input: {
  rules: readonly AchievementRule[]
  global: Record<GlobalMetric, number>
  unlocked: ReadonlySet<string>
}): AchievementUnlock[] {
  return input.rules
    .filter((rule) => !input.unlocked.has(rule.id) && input.global[rule.metric] >= rule.threshold)
    .map((rule) => ({ key: rule.id, ruleId: rule.id, tier: rule.tier }))
}

export interface RuleProgress {
  /** The metric value clamped to 0…threshold (NaN counts as 0). */
  current: number
  threshold: number
  /** `current / threshold`, always within 0…1. */
  ratio: number
}

export function ruleProgress(rule: AchievementRule, value: number): RuleProgress {
  const current = Number.isNaN(value) ? 0 : Math.min(Math.max(value, 0), rule.threshold)
  return { current, threshold: rule.threshold, ratio: current / rule.threshold }
}
