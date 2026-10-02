import { expect, test } from '@playwright/test'
import { finishOnboarding, installFakeSpeech } from './fakeSpeech.ts'

test.describe('onboarding', () => {
  test.use({ locale: 'en-US' })

  test('the browser language sets the pair, then a character and a goal of 20 shape Home', async ({ page }) => {
    // Playwright's headless shell has no speech service and crashes on SpeechRecognition.available().
    await installFakeSpeech(page)
    await page.goto('./')
    await expect(page.getByRole('heading', { name: 'Speak a new language — one conversation a day.' })).toBeVisible()
    // English speakers practise Polish; the pair can be corrected right here.
    await expect(page.getByText('You’ll practise Polish.')).toBeVisible()
    await page.getByRole('button', { name: 'Get started' }).click()
    await expect(page.getByText('Three stars for every conversation')).toBeVisible()
    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByText('Michał', { exact: true }).click()
    await expect(page.getByRole('radio', { name: 'Michał' })).toBeChecked()
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByRole('heading', { name: 'Let’s test the microphone' })).toBeVisible()
    await expect(page.getByText('Dzień dobry', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByRole('button', { name: '20 lines' }).click()
    await page.getByRole('button', { name: 'Begin' }).click()

    await expect(page).toHaveURL(/#\/$/)
    await expect(page.getByRole('link', { name: 'Your character: Michał' })).toBeVisible()
    await expect(page.getByRole('progressbar', { name: 'Today’s goal' })).toHaveAttribute('aria-valuemax', '20')
    // The course starts with reading the first conversation, in Polish.
    await expect(page.getByRole('link', { name: /Nice to meet you/ })).toContainText('Poznajmy się')
    await expect(page.getByRole('link', { name: /Nice to meet you/ })).toContainText('Read')
  })
})

test.describe('data', () => {
  test.use({ locale: 'pl-PL', acceptDownloads: true })

  test('the installed app shell opens offline and explains that speech needs the internet', async ({ page, context, browserName }) => {
    test.skip(browserName === 'webkit', 'Playwright WebKit cannot reload through a service worker while emulating offline')
    await installFakeSpeech(page)
    await finishOnboarding(page)
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready
    })
    await page.reload() // now controlled by the service worker
    await context.setOffline(true)
    await page.reload()
    await expect(page.getByRole('button', { name: 'Zacznij rozmowę', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Zacznij rozmowę', exact: true }).click()
    await expect(page.getByText(/Jesteś offline/)).toBeVisible()
    await context.setOffline(false)
  })

  test('privacy policy is reachable from settings', async ({ page }) => {
    await finishOnboarding(page)
    await page.goto('./#/settings')
    const [policy] = await Promise.all([page.waitForEvent('popup'), page.getByRole('link', { name: 'Polityka prywatności' }).click()])
    await expect(policy.getByRole('heading', { name: 'Fluentum – polityka prywatności' })).toBeVisible()
  })
})

test.describe('browser without Web Speech', () => {
  test.use({ locale: 'pl-PL' })

  test('Firefox explains the missing recogniser and points to the offline engine', async ({ page, browserName }) => {
    test.skip(browserName !== 'firefox', 'only Firefox ships without SpeechRecognition')
    await finishOnboarding(page) // no fake: the real browser API is used
    await page.getByRole('button', { name: 'Zacznij rozmowę', exact: true }).click()
    await expect(page.getByText(/Ta przeglądarka nie rozpoznaje mowy/)).toBeVisible()
    await page.getByRole('link', { name: /Ustawienia|Whisper/ }).first().click()
    await expect(page).toHaveURL(/#\/settings\?section=speech/)
  })
})
