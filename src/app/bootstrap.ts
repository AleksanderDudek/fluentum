import { db } from '@/db/schema'
import { initI18n } from '@/i18n'
import { requestPersistentStorage } from '@/services/backup'
import { reconcileStreakFreezes } from '@/services/practice'
import { markRunningRunsPartial } from '@/services/runs'
import { ensureSettings, readSettings } from '@/services/settings'
import { startSettingsSync } from '@/stores/settings'
import { startAppearanceSync } from './appearance'

/**
 * Everything that must happen before the first render: open IndexedDB,
 * create default settings, reconcile data, load translations, apply theme.
 */
export async function bootstrap(): Promise<void> {
  await db.open()
  await ensureSettings()
  // A run still marked as running was interrupted (tab closed): it becomes resumable.
  await markRunningRunsPartial()
  await reconcileStreakFreezes()
  const snapshot = await readSettings()
  startSettingsSync(snapshot)
  await initI18n(snapshot.app.uiLang)
  startAppearanceSync()
  // Ask at every start — browsers often grant it only later (e.g. once installed).
  if (snapshot.app.onboardingCompleted) void requestPersistentStorage()
}
