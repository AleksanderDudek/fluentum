import Dexie, { type EntityTable, type Table } from 'dexie'
import type {
  AchievementRow,
  Attempt,
  DailyStats,
  FriendRow,
  RestorePointRow,
  Segment,
  SessionRun,
  SettingsRow,
  TextItem,
  TextStats,
  XpLedgerRow,
} from './types'

/** Teleo shares the browser origin (`aleksanderdudek.github.io`): the database name must stay distinct. */
export const DB_NAME = 'fluentum'
export const SCHEMA_VERSION = 1

/** IndexedDB schema. Boolean fields (`archived`, `accepted`) are not indexed: IndexedDB cannot index booleans. */
export class FluentumDB extends Dexie {
  declare texts: EntityTable<TextItem, 'id'>
  declare segments: EntityTable<Segment, 'id'>
  declare sessionRuns: EntityTable<SessionRun, 'id'>
  declare attempts: EntityTable<Attempt, 'id'>
  declare dailyStats: EntityTable<DailyStats, 'dayKey'>
  declare textStats: EntityTable<TextStats, 'textId'>
  declare achievements: EntityTable<AchievementRow, 'key'>
  declare xpLedger: EntityTable<XpLedgerRow, 'id'>
  declare settings: Table<SettingsRow, SettingsRow['key']>
  declare friends: EntityTable<FriendRow, 'id'>
  declare restorePoints: EntityTable<RestorePointRow, 'key'>

  constructor(name = DB_NAME) {
    super(name)
    this.version(1).stores({
      texts: 'id, lang, updatedAt',
      segments: 'id, textId, [textId+order]',
      sessionRuns: 'id, textId, dayKey, startedAt, status',
      attempts: 'id, segmentId, textId, sessionRunId, dayKey, timestamp',
      dailyStats: 'dayKey',
      textStats: 'textId',
      achievements: 'key, ruleId, unlockedAt',
      xpLedger: '++id, timestamp, reason',
      settings: 'key',
      friends: 'id',
      // The data an import replaced, kept for "undo" (never exported).
      restorePoints: 'key',
    })
  }
}

export const db = new FluentumDB()

/** Every table, in export/import order (`restorePoints` is local only: never exported). */
export const ALL_TABLES = [
  'texts',
  'segments',
  'sessionRuns',
  'attempts',
  'dailyStats',
  'textStats',
  'achievements',
  'xpLedger',
  'settings',
  'friends',
] as const
