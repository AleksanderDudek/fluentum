import { expect, test } from '@playwright/test'
import { finishOnboarding } from './fakeSpeech.ts'

test('first launch shows onboarding, then the four tabs navigate', async ({ page }) => {
  await page.goto('./')
  await expect(page).toHaveURL(/#\/onboarding$/)
  await finishOnboarding(page)

  const nav = page.getByRole('navigation')
  for (const name of [/Rozmowy|Conversations/, /Postępy|Progress/, /Ustawienia|Settings/, /^(Start|Home)$/]) {
    await nav.getByRole('link', { name }).click()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  }
})

test('the own language can be switched in settings, and with it the language practised', async ({ page }) => {
  await finishOnboarding(page)
  await page.goto('./#/settings')
  await page.getByText('English', { exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Settings')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByText('You practise Polish.')).toBeVisible()
  await page.getByText('Polski', { exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ustawienia')
  await expect(page.getByText('Ćwiczysz angielski.')).toBeVisible()
})
