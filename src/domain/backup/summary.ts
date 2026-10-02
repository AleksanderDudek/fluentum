import type { BackupData } from './validate'

/** What a backup (or this device) holds, in the terms a person would miss it. */
export interface BackupSummary {
  /** Lines said (accepted). */
  lines: number
  /** Days with at least one line said. */
  activeDays: number
  lastActiveDay?: string
  /** Points from the XP ledger (the source of truth; the cached total follows it). */
  xp: number
  /** Stars earned across every conversation. */
  stars: number
  achievements: number
}

export type SummarySource = Pick<BackupData, 'dailyStats' | 'textStats' | 'xpLedger' | 'achievements'>

export function summarizeBackup(data: SummarySource): BackupSummary {
  const active = data.dailyStats.filter((day) => day.segmentsAccepted > 0)
  return {
    lines: data.dailyStats.reduce((sum, day) => sum + day.segmentsAccepted, 0),
    activeDays: active.length,
    lastActiveDay: active.map((day) => day.dayKey).sort().at(-1),
    xp: data.xpLedger.reduce((sum, row) => sum + row.amount, 0),
    stars: data.textStats.reduce((sum, stats) => sum + stats.stars.length, 0),
    achievements: data.achievements.length,
  }
}

/** Anything worth keeping: something said or earned. */
export function hasProgress(summary: BackupSummary): boolean {
  return summary.lines > 0 || summary.xp > 0 || summary.stars > 0 || summary.achievements > 0
}

/**
 * Would restoring `file` over `device` lose something? `older`: the file ends before the last active day here;
 * `lessProgress`: it holds fewer lines, points or stars. A device without progress never warns.
 */
export function compareSummaries(file: BackupSummary, device: BackupSummary): { older: boolean; lessProgress: boolean } {
  if (!hasProgress(device)) return { older: false, lessProgress: false }
  const older = device.lastActiveDay !== undefined && (file.lastActiveDay === undefined || file.lastActiveDay < device.lastActiveDay)
  const lessProgress = file.lines < device.lines || file.xp < device.xp || file.stars < device.stars
  return { older, lessProgress }
}
