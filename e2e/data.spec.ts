import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'
import { finishOnboarding, installFakeSpeech, installFakeVoice, talkThroughNext } from './fakeSpeech.ts'

test.use({ locale: 'pl-PL', acceptDownloads: true })

/** Has one conversation, so the device has a day of progress and a star. */
async function practiseOnce(page: Page) {
  await talkThroughNext(page)
  await page.getByRole('link', { name: 'Start', exact: true }).click()
  await expect(page.getByText('1 dzień z rzędu')).toBeVisible()
}

/** Your data → create a backup (optionally with a password) → download it. */
async function downloadBackup(page: Page, path: string, password?: string) {
  await page.getByRole('navigation').getByRole('link', { name: 'Ustawienia' }).click()
  await page.getByRole('link', { name: 'Kopia i przywracanie' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Twoje dane')
  if (password) {
    const backup = page.getByRole('region', { name: 'Kopia zapasowa' })
    await backup.getByRole('switch', { name: 'Chroń hasłem' }).click()
    await backup.getByLabel('Hasło', { exact: true }).fill(password)
    await backup.getByLabel('Powtórz hasło').fill(password)
  }
  await page.getByRole('button', { name: 'Utwórz kopię' }).click()
  await expect(page.getByText('Kopia gotowa')).toBeVisible()
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Pobierz plik' }).click()])
  await download.saveAs(path)
  await expect(page.getByText(/^Ostatnia kopia:/)).toBeVisible()
}

test('backup → delete everything → restore brings the history back, after showing what the file holds', async ({ page }, testInfo) => {
  test.setTimeout(120_000)
  await installFakeSpeech(page, { live: true, wordDelayMs: 10 })
  await installFakeVoice(page)
  await finishOnboarding(page)
  await practiseOnce(page)

  const file = testInfo.outputPath('backup.json')
  await downloadBackup(page, file)
  expect(JSON.parse(await readFile(file, 'utf8'))).toMatchObject({ app: 'fluentum', schemaVersion: 1 })

  await page.getByRole('button', { name: 'Usuń wszystkie dane' }).click()
  await page.getByRole('dialog').getByRole('textbox').fill('USUŃ')
  await page.getByRole('button', { name: 'Usuń wszystko' }).click()
  await expect(page).toHaveURL(/#\/onboarding$/)
  await finishOnboarding(page)
  await expect(page.getByText('Zacznij dziś serię')).toBeVisible()

  await page.goto('./#/settings/data')
  await page.locator('input[type="file"]').setInputFiles(file)
  const preview = page.getByRole('dialog', { name: 'Przywrócić tę kopię?' })
  await expect(preview.getByRole('rowheader', { name: 'Aktywne dni' })).toBeVisible()
  await expect(preview.getByRole('row', { name: /Aktywne dni/ })).toContainText('1')
  await preview.getByRole('button', { name: 'Zastąp i przywróć' }).click()
  await expect(page.getByText('1 dzień z rzędu')).toBeVisible({ timeout: 15_000 })
})

test('a password-protected backup needs its password, and a restore can be undone', async ({ page }, testInfo) => {
  test.setTimeout(120_000)
  await installFakeSpeech(page, { live: true, wordDelayMs: 10 })
  await installFakeVoice(page)
  await finishOnboarding(page)
  await practiseOnce(page)

  const file = testInfo.outputPath('protected.json')
  await downloadBackup(page, file, 'rozmowa-123')
  const sealed = await readFile(file, 'utf8')
  expect(JSON.parse(sealed)).toMatchObject({ app: 'fluentum', encrypted: { cipher: 'AES-256-GCM' } })
  expect(sealed).not.toContain('W kawiarni')
  expect(sealed).not.toContain('Poznajmy')

  await page.locator('input[type="file"]').setInputFiles(file)
  const unlock = page.getByRole('dialog', { name: 'Kopia chroniona hasłem' })
  await unlock.getByLabel('Hasło').fill('zle-haslo')
  await unlock.getByRole('button', { name: 'Odblokuj' }).click()
  await expect(unlock.getByRole('alert')).toHaveText(/Nieprawidłowe hasło/, { timeout: 15_000 })
  await unlock.getByLabel('Hasło').fill('rozmowa-123')
  await unlock.getByRole('button', { name: 'Odblokuj' }).click()

  const preview = page.getByRole('dialog', { name: 'Przywrócić tę kopię?' })
  await expect(preview.getByRole('columnheader', { name: 'Teraz' })).toBeVisible({ timeout: 15_000 })
  await expect(preview.getByText(/przywrócenie można cofnąć/)).toBeVisible()
  await preview.getByRole('button', { name: 'Zastąp i przywróć' }).click()
  await expect(page.getByText('1 dzień z rzędu')).toBeVisible({ timeout: 15_000 })

  await page.goto('./#/settings/data')
  await expect(page.getByRole('heading', { name: 'Cofnij przywrócenie' })).toBeVisible()
  await page.getByRole('button', { name: 'Przywróć poprzednie dane' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Przywróć poprzednie dane' }).click()
  await expect(page.getByText('1 dzień z rzędu')).toBeVisible({ timeout: 15_000 })
  // Switching back kept the restored data too: it can be brought back again.
  await page.goto('./#/settings/data')
  await expect(page.getByRole('heading', { name: 'Wróć do danych z kopii' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Cofnij przywrócenie' })).toHaveCount(0)
})
