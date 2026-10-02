import type { TFunction } from 'i18next'
import { describe, expect, it } from 'vitest'
import { APP_URL } from '@/components/support/links'
import { sessionShareText, sharedMinutes, shareLinks, shareText, type DayShare, type SessionShare } from './shareText'

const t = ((key: string, options?: Record<string, unknown>) => (options ? `${key}${JSON.stringify(options)}` : key)) as unknown as TFunction
const day: DayShare = { dayKey: '2026-10-02', minutes: 12, lines: 86, streak: 5, points: 1240 }

describe('shareText', () => {
  it('writes the day, one call to action and the address on its own last line', () => {
    const lines = shareText(day, t, 0).split('\n')
    expect(lines[0]).toBe('share.t1{"count":86,"minutes":12,"points":1240,"streak":5}')
    expect(lines.slice(1)).toEqual(['', 'share.cta', APP_URL])
  })

  it('varies the wording with the seed', () => {
    expect(shareText(day, t, 1)).toContain('share.t2')
    expect(shareText(day, t, 5)).toContain('share.t3')
  })
})

describe('sessionShareText', () => {
  const session: SessionShare = { title: 'W kawiarni', accepted: 4, total: 4, firstTryRate: 0.75, xp: 60, streak: 3, stars: 2 }

  it('writes the session, one call to action and the address on its own last line', () => {
    const lines = sessionShareText(session, t).split('\n')
    expect(lines[0]).toBe('share.session{"count":4,"title":"W kawiarni","firstTry":75,"streak":3,"stars":2}')
    expect(lines.slice(1)).toEqual(['', 'share.cta', APP_URL])
  })

  it('rounds the first-try rate', () => {
    expect(sessionShareText({ ...session, firstTryRate: 2 / 3 }, t)).toContain('"firstTry":67')
  })
})

describe('sharedMinutes', () => {
  it('rounds to whole minutes and never shows 0 for a day with speaking', () => {
    expect(sharedMinutes(0)).toBe(0)
    expect(sharedMinutes(20_000)).toBe(1)
    expect(sharedMinutes(90_000)).toBe(2)
    expect(sharedMinutes(12 * 60_000 + 20_000)).toBe(12)
  })
})

describe('shareLinks', () => {
  it('encodes the post for X and WhatsApp and the app address for Facebook', () => {
    const [x, facebook, whatsapp] = shareLinks('A & B\nC', t)
    expect(x!.url).toBe('https://twitter.com/intent/tweet?text=A%20%26%20B%0AC')
    expect(facebook!.url).toBe(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(APP_URL)}`)
    expect(whatsapp!.url).toBe('https://wa.me/?text=A%20%26%20B%0AC')
  })
})
