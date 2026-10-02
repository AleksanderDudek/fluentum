import { expect, test } from '@playwright/test'
import { finishOnboarding, installFakeSpeech, installFakeVoice, spokenLines } from './fakeSpeech.ts'

test.beforeEach(async ({ page }) => {
  await installFakeSpeech(page, { live: true, wordDelayMs: 5 })
  await installFakeVoice(page)
  await finishOnboarding(page)
})

test('a conversation read aloud: the partner speaks, the learner answers, the first star is earned', async ({ page }) => {
  test.setTimeout(120_000)
  await page.getByRole('navigation').getByRole('link', { name: /Rozmowy|Conversations/ }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Rozmowy po angielsku|Conversations in Polish/)
  await page.getByRole('link', { name: /W kawiarni|At the café/ }).click()
  await page.getByRole('button', { name: /Start: (Czytaj|Read)/ }).click()

  // The partner opens in the language being learnt (English for Polish users, Polish for English users).
  const chat = page.getByRole('log')
  await expect(chat).toContainText(/What can I get you\?|Co mogę podać\?/)
  // The learner's line: the words to say, how to say them, and what they mean.
  await expect(page.getByTestId('segment-text')).toHaveText(/I’d like a large coffee with milk, please\.|Poproszę dużą kawę z mlekiem\./)
  await expect(chat).toContainText(/ajd lajk e lardż KO-fi|po-PRO-sheh DOO-zhom KA-veh/)
  await expect(chat.locator('.gloss-word[data-role="adjective"]').first()).toBeVisible()

  await page.getByRole('button', { name: /^(Mów|Speak)$/ }).click()
  await page.getByRole('button', { name: /Rozumiem – dalej|I understand — continue/ }).click()

  await page.waitForURL(/summary$/, { timeout: 90_000 })
  await expect(page.getByText(/Nowa gwiazdka: Czytaj|New star: Read/)).toBeVisible()
  // The partner's last line was said aloud before the summary opened.
  expect((await spokenLines(page)).some((line) => /You too!|Wzajemnie!/.test(line))).toBe(true)

  await page.goto('./#/conversations/cafe')
  await expect(page.getByRole('img', { name: /1 z 3|1 of 3/ }).first()).toBeVisible()
})

test('prompts hide the line but its first letters; "Show" reveals it and the star is not earned', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('./#/conversations/meeting')
  await page.getByRole('button', { name: /Start: (Podpowiedzi|Prompts)/ }).click()
  const line = page.getByTestId('segment-text')
  await expect(line).toHaveAttribute('data-line', /Hi! I live upstairs\.|Cześć! Mieszkam piętro wyżej\./)
  await expect(line.locator('[aria-hidden]')).toHaveText(/H·! I l··· u·······\.|C····! M······· p····· w····\./)

  await page.getByRole('button', { name: /Pokaż zdanie|Show the line/ }).click()
  await expect(line).toHaveText(/Hi! I live upstairs\.|Cześć! Mieszkam piętro wyżej\./)
  await page.getByRole('button', { name: /^(Mów|Speak)$/ }).click()
  await page.getByRole('button', { name: /Rozumiem – dalej|I understand — continue/ }).click()
  await page.waitForURL(/summary$/, { timeout: 90_000 })
  await expect(page.getByText(/Podejrzano 1 zdanie|You showed 1 line/)).toBeVisible()
  await expect(page.getByText(/Nowa gwiazdka|New star/)).toHaveCount(0)
})

test('after a conversation the summary starts the next step of the course', async ({ page }) => {
  test.setTimeout(150_000)
  await page.getByRole('button', { name: /^(Zacznij rozmowę|Start talking)$/ }).click()
  await page.getByRole('button', { name: /^(Mów|Speak)$/ }).click()
  await page.getByRole('button', { name: /Rozumiem – dalej|I understand — continue/ }).click()
  await page.waitForURL(/summary$/, { timeout: 90_000 })
  await page.getByRole('button', { name: /Następna rozmowa|Next conversation/ }).click()
  await expect(page).toHaveURL(/#\/play\/[^/]+$/)
  // The course goes on with the second conversation, read.
  await expect(page.getByRole('log')).toContainText(/What can I get you\?|Co mogę podać\?/)
})
