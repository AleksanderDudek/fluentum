import type { BackupFile, BackupSummary } from '@/domain/backup'
import type { FriendCard } from '@/domain/leaderboard/friends'
import type { PracticeMode } from '@/domain/mastery'
import type { EntryState, PlanEntry } from '@/domain/session/types'
import type { CharacterId, DayKey, EngineId, Lang, Tier } from '@/domain/types'

/*
 * Row types stored in IndexedDB. Engine vocabulary (docs/FLUENTUM_SPEC.md §Glossary): a *text* is the learner's lines
 * of one conversation in the language being learnt, each line a *segment*; one go through a conversation is a run.
 */

/** The learner's lines of a conversation, materialised when it is first started (`dialogue:<lang>:<key>`). */
export interface TextItem {
  id: string
  /** The conversation's title in the interface language at the time it was last started. */
  title: string
  /** The language being learnt (the lines are said in it). */
  lang: Lang
  body: string
  createdAt: number
  updatedAt: number
}

export interface Segment {
  id: string
  textId: string
  order: number
  content: string
  wordCount: number
  /** Replaced by a later script after it had been spoken — kept for history, never practised again. */
  archived: boolean
}

export type SessionRunStatus = 'in_progress' | 'completed' | 'partial'

/** One go through a conversation in one way (read / prompt / recall). */
export interface SessionRun {
  id: string
  textId: string
  title: string
  dayKey: DayKey
  startedAt: number
  endedAt?: number
  status: SessionRunStatus
  plan: PlanEntry[]
  entries: EntryState[]
  /** Index of the next plan entry to speak. */
  cursor: number
  xpEarned: number
  lastActivityAt: number
  mode: PracticeMode
  /** Achievement keys unlocked by this run (listed on its summary). */
  unlocked?: string[]
  /** The star this run earned for the first time (shown on the summary). */
  newStar?: PracticeMode
}

export interface Attempt {
  id: string
  segmentId: string
  textId: string
  sessionRunId: string
  dayKey: DayKey
  timestamp: number
  /** Omitted when the user disabled transcript storage. */
  transcript?: string
  coverage: number
  extra: number
  wrong: number
  accepted: boolean
  firstTry: boolean
  /** The coverage this attempt needed (its rung of the coverage ladder). */
  threshold: number
  engine: EngineId
  durationMs: number
}

export interface DailyStats {
  dayKey: DayKey
  /** Lines said (accepted). */
  segmentsAccepted: number
  attempts: number
  /** Conversations finished with every line said. */
  conversationsCompleted: number
  xp: number
  goalReached: boolean
  /** Inactive day bridged by a streak freeze. */
  frozen: boolean
  firstActivityAt?: number
  lastActivityAt?: number
  /** Had an accepted line before 08:00 (after the day start). */
  morning: boolean
  /** Had an accepted line at/after 21:00 (or after midnight, before the day start). */
  evening: boolean
  firstTryAccepted: number
  /** Estimated time spent speaking (accepted lines). */
  readingMs: number
}

export interface TextStats {
  textId: string
  /** Times the conversation was finished with every line said, in any way. */
  repetitions: number
  segmentsAccepted: number
  /** Finished with every line accepted on the first try. */
  perfectRuns: number
  /** The ways this conversation was finished cleanly (one star each), in course order. */
  stars: PracticeMode[]
  lastPracticedAt?: number
}

export interface AchievementRow {
  key: string
  ruleId: string
  tier: Tier
  xp: number
  unlockedAt: number
}

/**
 * The other version of the data, kept on this device: what the latest restore replaced (`beforeRestore`) or,
 * after switching back, the restored data with everything done since (`beforeUndo`). Switching exchanges it with
 * the current data, so neither is ever lost.
 */
export interface RestorePointRow {
  key: 'previous'
  kind: 'beforeRestore' | 'beforeUndo'
  createdAt: number
  /** What it holds, for the "undo" offer without reading the whole copy. */
  summary: BackupSummary
  file: BackupFile
}

/** The latest card received from a friend (friends' leaderboard, no server). */
export interface FriendRow extends FriendCard {
  receivedAt: number
}

export type XpReason = 'line' | 'conversation' | 'star' | 'dailyGoal' | 'achievement'

export interface XpLedgerRow {
  id?: number
  timestamp: number
  dayKey: DayKey
  reason: XpReason
  amount: number
  /** Attempt id, run id, achievement key or day key the award refers to. */
  refId?: string
}

export type ThemePreference = 'system' | 'light' | 'dark'
export type FontSize = 'sm' | 'md' | 'lg'

export interface AppSettings {
  /** The user's own language; the other one is learnt. */
  uiLang: Lang
  theme: ThemePreference
  engine: 'auto' | EngineId
  whisperModel: 'tiny' | 'base'
  /** Hour (0–6) at which a new day starts. */
  dayStartHour: number
  /** Lines said per day (1–150). */
  dailyGoal: number
  handsFree: boolean
  saveTranscripts: boolean
  fontSize: FontSize
  listenFirst: boolean
  /** Colour the subject, predicate, adjectives and objects of every line. */
  wordColours: boolean
  /** `HH:MM`, used for the calendar reminder. */
  reminderTime: string
  onboardingCompleted: boolean
  speechPrivacyAcknowledged: boolean
  /** The figure shown as the user's avatar. */
  character: CharacterId
  /** Chime for every accepted line. */
  sounds: boolean
  /** Name on shared cards and friends' leaderboards; empty = the character's name. */
  displayName: string
}

export interface GameState {
  freezesAvailable: number
  /** Streak value that last earned a freeze (prevents double awards). */
  lastFreezeAwardStreak: number
  /** Conversations finished with every line accepted on the first try. */
  perfectConversations: number
  comebacks: number
  /** Cached sum of the XP ledger. */
  totalXp: number
  /** Days bridged by freezes that the user has not been told about yet. */
  pendingFreezeNotice: DayKey[]
}

export interface MetaState {
  schemaVersion: number
  installedAt: number
  lastBackupAt?: number
  backupReminderSnoozedAt?: number
  /** Random id of this install on friend cards, so a friend's board updates instead of duplicating. */
  shareId?: string
}

export type SettingsRow =
  | { key: 'app'; value: AppSettings }
  | { key: 'game'; value: GameState }
  | { key: 'meta'; value: MetaState }
