import type { IconName } from '@/components/icons/Icon'
import type { Dialogue } from '@/domain/dialogue'
import { LANGS, type Lang } from '@/domain/types'
import dialoguesJson from './dialogues.json'

/*
 * The course: scripted bilingual conversations in course order (A1, then A2). JSON imports widen literal types to
 * `string`; `dialogues.test.ts` validates the data (markup, links, pronunciations, icons, figures).
 */
export const DIALOGUES = dialoguesJson as Dialogue[]

/** The icon of a conversation (validated against the generated icon set by `dialogues.test.ts`). */
export const dialogueIcon = (dialogue: Dialogue) => dialogue.icon as IconName

/** The text of a conversation learnt in `lang` (the same script is a different text in each direction). */
export const dialogueTextId = (key: string, lang: Lang) => `dialogue:${lang}:${key}`

/** The conversation and the language being learnt behind a text id, if any. */
export function dialogueOfText(textId: string | undefined): { dialogue: Dialogue; lang: Lang } | undefined {
  const match = textId?.match(/^dialogue:([a-z]+):(.+)$/)
  const lang = LANGS.find((l) => l === match?.[1])
  const dialogue = DIALOGUES.find((d) => d.key === match?.[2])
  return lang && dialogue ? { dialogue, lang } : undefined
}
