import type { TFunction } from 'i18next'
import { APP_URL } from '@/components/support/links'

/** One day of practice, as shared. */
export interface DayShare {
  dayKey: string
  minutes: number
  lines: number
  streak: number
  points: number
}

/** One finished conversation, as shared from its summary. */
export interface SessionShare {
  title: string
  accepted: number
  total: number
  /** Share of the lines said on the first try (0…1). */
  firstTryRate: number
  xp: number
  streak: number
  /** Stars of this conversation after the run (0–3). */
  stars: number
}

const TEMPLATES = ['share.t1', 'share.t2', 'share.t3'] as const

/** Whole minutes spoken, rounded; a day with any speaking shows at least 1. */
export function sharedMinutes(readingMs: number): number {
  return readingMs > 0 ? Math.max(1, Math.round(readingMs / 60_000)) : 0
}

/**
 * The post: first person, in the words people use about their own day, one call to action, the address
 * on its own last line (services build their link preview from the last URL of a post).
 */
export function shareText(day: DayShare, t: TFunction, seed = 0): string {
  const template = TEMPLATES[Math.abs(Math.trunc(seed)) % TEMPLATES.length]!
  const body = t(template, { count: day.lines, minutes: day.minutes, points: day.points, streak: day.streak })
  return [body, '', t('share.cta'), APP_URL].join('\n')
}

/** The post after a conversation: what was said, how cleanly, its stars and the streak; the same closing lines. */
export function sessionShareText(session: SessionShare, t: TFunction): string {
  const body = t('share.session', {
    count: session.accepted,
    title: session.title,
    firstTry: Math.round(session.firstTryRate * 100),
    streak: session.streak,
    stars: session.stars,
  })
  return [body, '', t('share.cta'), APP_URL].join('\n')
}

/** Direct "share" addresses for browsers without a system share sheet. */
export function shareLinks(text: string, t: TFunction): Array<{ name: string; url: string }> {
  const enc = encodeURIComponent
  return [
    { name: t('share.x'), url: `https://twitter.com/intent/tweet?text=${enc(text)}` },
    { name: t('share.facebook'), url: `https://www.facebook.com/sharer/sharer.php?u=${enc(APP_URL)}` },
    { name: t('share.whatsapp'), url: `https://wa.me/?text=${enc(text)}` },
  ]
}
