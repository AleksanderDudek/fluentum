/** Literal types shared by every layer. Pure module: no DOM, no Dexie. */

export type Lang = 'pl' | 'en'
export const LANGS = ['pl', 'en'] as const satisfies readonly Lang[]

export type SpeechLang = 'pl-PL' | 'en-US'
export const SPEECH_LANG: Record<Lang, SpeechLang> = { pl: 'pl-PL', en: 'en-US' }

export type EngineId = 'webspeech' | 'whisper'
export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
/** The figure that stands for the user (four women, four men), shown as their avatar; also the conversation partners. */
export type CharacterId = 'anna' | 'maria' | 'grace' | 'ewa' | 'jan' | 'michal' | 'david' | 'piotr'
export const CHARACTER_IDS = ['anna', 'maria', 'grace', 'ewa', 'jan', 'michal', 'david', 'piotr'] as const satisfies readonly CharacterId[]

/** Local calendar day `YYYY-MM-DD`, shifted by the configurable day-start hour. */
export type DayKey = string
