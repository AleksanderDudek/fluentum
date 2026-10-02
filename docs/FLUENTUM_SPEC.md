# Fluentum — speak a new language, one conversation a day

> **Source of truth.** Decisions not covered here: `docs/DECISIONS.md` (add an entry whenever you make one). Fluentum was
> started on 2026-10-02 from the engine of Teleo (a sibling app for prayers and affirmations); section numbers of the engine
> chapters (§5 speech, §6 matcher, §9 gamification) follow Teleo's spec, so code comments can cite them.

## Glossary

| Term | Meaning |
|---|---|
| **Conversation** (dialogue) | A scripted bilingual scene: the partner's lines and the learner's lines, in Polish and English. |
| **Line** | One thing said in a conversation. The learner's lines are checked; the partner's are spoken by the app. |
| **Way** (mode) | How a conversation is practised: *read*, *prompts*, *recall* (§7.3). |
| **Star** | Earned the first time a conversation is finished cleanly in a way (§9.5). |
| **Text** (engine) | The learner's lines of one conversation in one language being learnt, stored as `dialogue:<lang>:<key>`. |
| **Segment** (engine) | One learner line of a text. |
| **Run** (engine) | One go through a conversation in one way. |

## 0. Instructions for Claude Code

- Work stage by stage; keep `npm run lint`, `npm run typecheck`, `npm run test -- --run` and the e2e suite green.
- Business rules live in `src/domain/**` (pure, unit-tested). The matcher is the heart: change it test-first.
- Every UI string goes through i18n with identical PL/EN key sets.
- No backend, no paid services, no API keys, no analytics.

## 1. Vision and goals

Learning to *speak* needs speaking. Fluentum gives a few minutes of real conversation a day: a partner says a line, the
learner answers aloud, the app checks every word — then makes the same conversation harder (prompts, then recall) until it
can be said from memory. Motivation and visible progress carry the habit: streaks, a daily goal, stars, levels and achievements.

**Languages:** Polish speakers practise English; English speakers practise Polish. The interface language is the learner's
own; the other one is learnt. Content is keyed by language, so more languages need content and matcher support only.

**Principles:** free (no ads, no accounts), private (local-first; audio never stored), honest checking (generous to
recognition errors, never to missing or extra words), calm motivation (no penalties; freezes protect streaks), accessible.

### Persona

An adult A1–A2 learner who wants to dare to speak: commuting, at home, five to fifteen minutes a day, on a phone.

## 2. Scope (1.0)

- 16 conversations, A1 and A2 (§7.1), each in three ways with three stars (§7.3, §9.5); a suggested course path (§7.4).
- Chat player with live speech checking (Web Speech) or tap mode (offline Whisper), word colours by grammatical role,
  pronunciation respelt for the reader, listen-first, skip after three tries.
- Home, Conversations (the course), conversation page, summary, Progress, Settings, Your data, mic test, onboarding.
- Gamification (§9), friends' leaderboard by links, shareable cards, calendar reminder, backups (optional password), PWA.

**Later:** more conversations and levels (B1), more languages, conversations with branches, an offline voice for the partner.

## 3. Stack (100 % free)

Vite 8 · React 19 · TypeScript 6 (strict) · react-router 8 (hash router, data mode) · Tailwind CSS 4 (CSS-first tokens) ·
Zustand 5 · Dexie 4 (IndexedDB) · vite-plugin-pwa (Workbox) · i18next · Vitest 5 · Playwright · oxlint ·
@huggingface/transformers (offline Whisper, opt-in). Static hosting on GitHub Pages under `/fluentum/`.

## 4. Architecture

- `src/domain/**` — pure logic: matcher, live tracker, speech interfaces, dialogue (gloss, turns, languages), mastery
  (ways, stars, course path), gamification, session (run summary), time, stats, backup validation and crypto.
- `src/db/` — Dexie schema and row types. `src/services/` — DB-coupled orchestration (one transaction per user event).
- `src/content/dialogues.json` — the course. `src/screens/<Name>/` — routes. `src/components/` — shared UI and brand.
- Local-first: everything in IndexedDB `fluentum`; the only network use is the browser's speech recogniser and the opt-in
  Whisper model download.

## 5. Speech recognition

### 5.1 Engine abstraction

```ts
interface SpeechEngine {
  id: 'webspeech' | 'whisper'
  isSupported(): Promise<boolean>
  start(opts: { lang: 'pl-PL' | 'en-US'; onInterim?: (text: string) => void }): Promise<void>
  stop(): Promise<SpeechResult>
  abort(): void
}
interface SpeechResult { alternatives: string[]; durationMs: number; engine: 'webspeech' | 'whisper' }
```
Chosen automatically (feature detection), changeable in Settings. The recogniser always listens in the **language being
learnt**.

### 5.2 Default engine: Web Speech API

- `SpeechRecognition || webkitSpeechRecognition`, `interimResults = true`, `maxAlternatives = 3`, continuous with a silence
  timer; the matcher checks **all alternatives**.
- Chrome/Edge (desktop, Android), Safari (macOS, iOS); **not Firefox** → Whisper.
- **Privacy:** in some browsers audio goes to the browser vendor's servers. The app says so before the first use of the
  microphone and in the privacy policy; on-device recognition is preferred where the browser offers it.
- iOS standalone (installed PWA) recognition can be unreliable: show a hint and offer Whisper.

### 5.3 Offline engine: Whisper in the browser

`@huggingface/transformers` in a Web Worker (WebGPU when available, else WASM); `whisper-tiny` or `whisper-base`, downloaded
on request from Hugging Face (size shown first, mobile-data warning), then fully offline; 16 kHz mono capture, forced
language. 100 % private, works in Firefox; slower, and checks a line after it is finished (no live mode).

### 5.4 Recordings

Audio is **never stored**. Only the recognised transcript of an attempt is kept, and that can be switched off.

## 6. Matcher — the heart of the app

### 6.1 Acceptance rule

A line is **accepted** when both hold:
1. **Coverage** — at least the needed share of the line's words was said. The share follows the **coverage ladder**: 90 % on
   the first try of a line, 80 % on the second, 70 % on the third and every later one ("at least" is literal: a short line
   needs every word on its first try). `coverage = matchedWords / sourceWords`.
2. **No extra words** — nothing outside the line was said (a word glued to a neighbour counts as extra).

A misheard word (a different word in its place) counts as a word not said: it lowers coverage but never rejects on its own.

### 6.2 Normalisation (both sides)

1. Unicode NFC, locale-aware lower case. 2. Punctuation and symbols removed; a dash between words → space. 3. Apostrophes
unified (`’` → `'`). 4. **EN:** contractions expanded (`I'm → i am`, `don't → do not`, …) on both sides. 5. **Numbers:**
digits and number words (PL/EN, basic forms) to one canonical form — content writes numbers as words. 6. Tokenise on
whitespace. 7. **Fillers** removed from the transcript only (PL `yyy, eee, hmm, mmm`; EN `um, uh, er, hmm, mm`).
8. A diacritic-free form for soft comparison (`ą→a, ć→c, …`).

### 6.3 Word alignment

Word-level edit distance with backtracking between source and transcript: `match` (identical), `near` (a recognition slip:
equal without diacritics, Polish sound keys, or for words ≥ 4 characters a character similarity ≥ 0.8; split/merged words
that make up exactly the source word), `missing`, `extra` (→ rejection), `wrong` (a different word: counted as missing).
Costs: `match 0`, `near 0.2`, `missing 1`, `extra 1`, `wrong 1.5`.

### 6.4 Coverage needed per try

The rung of the ladder follows the rejected tries on that line in this run (survives pause/resume) and is stored with every
attempt (`Attempt.threshold`) for honest statistics.

### 6.5 Result

```ts
interface MatchResult {
  accepted: boolean; coverage: number; threshold: number
  matched: number; near: number; missing: number; extra: number; wrong: number
  ops: Array<{ op: 'match' | 'near' | 'missing' | 'extra' | 'wrong'; source?: string; spoken?: string }>
  bestAlternativeIndex: number
}
```
The UI shows a diff (green said, amber close, grey missing, red extra/different) and a short message ("Extra word: *very*.
Try again."). In prompts and recall the words not said stay masked in the diff (first letter only).

### 6.6 Mandatory test cases (Vitest)


| Source | Said | Expected |
|---|---|---|
| `Jestem spokojny i pewny siebie.` | `jestem spokojny i pewny siebie` | ✅ |
| `Jestem spokojny i pewny siebie.` | `jestem bardzo spokojny i pewny siebie` | ❌ extra |
| `Jestem spokojny i pewny siebie.` | `jestem spokojny pewny siebie` | ❌ first try (80 % < 90 %) |
| 20-word line | 2 words left out | ✅ first try (90 %) |
| 20-word line | 3 words left out | ❌ first try (85 %) |
| `I am enough.` | `I'm enough` | ✅ contraction |
| `Zdrowaś Maryjo, łaski pełna` | `zdrowas maryjo laski pelna` | ✅ near, diacritics |
| `I am grateful for today.` | `um I am grateful for today` | ✅ filler |
| `I am grateful for today.` | `I am grateful for for today` | ❌ extra (repeated word) |
| `Mam 10 celów.` | `mam dziesięć celów` | ✅ numbers |
| any | empty transcript | ❌ "I didn't hear anything" (not an attempt) |

(The engine's matcher tests keep Teleo's original example sentences: they exercise Polish and English matching, not content.)

## 7. Conversations

### 7.1 Content model

`src/content/dialogues.json`, validated by `dialogues.test.ts`:
```ts
interface Dialogue {
  key: string                 // url-safe, stable
  level: 'A1' | 'A2'
  icon: PhosphorName
  partner: CharacterId        // one of the eight portraits
  title: Record<Lang, string>
  scene: Record<Lang, string>
  lines: Array<{ who: 'bot' | 'you'; text: Record<Lang, string>; say?: Partial<Record<Lang, string>> }>
}
```
A conversation opens with the partner and gives the learner at least three lines. Content rules: DECISIONS #25; Polish
learner lines gender-neutral.

### 7.2 Word links

Inline markup `{word(s)|id}` with role ids `s` subject, `v` predicate, `a` adjective, `o` object; one word may carry several
ids. Every line links the same ids in both languages. Shown as colours with the Polish school underlines (DECISIONS #20);
pointing at a word lights its counterpart; each bubble has a word list (keyboard / screen readers). Can be turned off.

### 7.3 The three ways (masks)


| Way | The learner's current line shows | Star |
|---|---|---|
| **Read** | the line, its pronunciation, its meaning | ★ |
| **Prompts** | only the first letter of each word (`initials` mask) and the meaning | ★★ |
| **Recall** | only the meaning (`hidden` mask) | ★★★ |

Words reveal as they are heard (live mode) and the whole line once accepted. "Show the line" reveals it (and costs the star of
that run). The partner's lines always show in full with their meaning. "Listen first" and the listen buttons speak a line with
speechSynthesis in the language being learnt.

### 7.4 The course

Course order = file order (A1 then A2). The suggested next step follows the staircase path (read *k*, prompts *k−1*, recall
*k−2*); once all stars are earned, a recall of the conversation practised longest ago (`nextStep`).

## 8. Runs

### 8.1 Definitions

Starting a conversation in a way materialises (or updates) its text and creates a run over its active segments. Only one run
is running at a time; leaving pauses it; an interrupted run becomes resumable.

### 8.2 Quick start

Home offers, in this order: today's unfinished run (resume), else the course's next step. The conversation page starts any
way; the summary starts the next step.

### 8.3 Player flow

1. The partner "types", shows a line with its meaning and says it (the microphone is closed meanwhile).
2. The learner's bubble appears; with hands-free on listening starts (live with Web Speech, auto-listen with Whisper).
3. The line is checked (§6); accepted → check mark, XP, chime, the partner answers; rejected → feedback card with the next
   rung of the ladder.
4. After three failed tries the line may be skipped (no XP, no star).
5. Trailing partner lines are spoken, then the summary opens.
6. Leaving asks for confirmation once something was said; the run is paused and can be resumed the same day.
7. The screen is kept awake (Wake Lock) while a run is in progress; the microphone never stays open in the background.

### 8.4 Finishing and stars

A conversation is **finished** when its last line is accepted and every line was accepted (no skip): +1 repetition,
+25 XP, `conversationsCompleted` +1, and if every line was a first try, a flawless conversation. If no line was revealed,
the run's way earns its star the first time (+15/+25/+40 XP). All of it in the transaction of the last attempt.

### 8.5 Day and streak

A day starts at a configurable hour (default 03:00). A day is active with at least one accepted line. Streak, freezes,
comeback: §9.7, DECISIONS #37–#39.

## 9. Gamification

### 9.1 Principles

Reward, in this order: **regularity** > **volume** > **depth** (stars) > **precision**. No penalties; gaps softened by freezes
and the comeback achievement. Growth metaphor: a plant that grows with every level (words take root).

### 9.2 XP


| Event | XP |
|---|---|
| Accepted line | `5 + words` (max 30), +2 on the first try; × streak multiplier (3+ days ×1.1, 7+ ×1.25, 30+ ×1.5); × 2 in the golden quarter-hour (5–15 minutes of speaking today) |
| Finished conversation | +25 |
| First star of a way | +15 read, +25 prompts, +40 recall |
| Daily goal reached (once a day) | +50 |
| Achievement | by tier (§9.4) |

Every award is a row in the XP ledger (`xpLedger`) with its reason.

### 9.3 Levels

Cumulative threshold `XP(n) = 250 · n · (n − 1)`. Names (PL / EN): 1 Ziarno / Seed · 2 Kiełek / Sprout · 3 Siewka / Seedling ·
4 Pęd / Shoot · 5 Łodyga / Stem · 6 Liść / Leaf · 7 Pąk / Bud · 8 Kwiat / Blossom · 9 Owoc / Fruit · 10 Krzew / Shrub ·
11 Młode drzewo / Sapling · 12 Drzewo / Tree · 13 Mocne korzenie / Deep Roots · 14 Rozłożysta korona / Wide Canopy ·
15 Gaj / Grove · 16 Sad / Orchard · 17 Las / Forest · 18 Stary las / Old-growth Forest · 19 Ogród / Garden ·
20 Biegłość / Fluent (95,000 XP). Then circles (Fluent I, II, …) every 25,000 XP. Progress shows the plant (SVG in code).

### 9.4 Achievement tiers

Bronze 50 · Silver 100 · Gold 250 · Platinum 500 · Diamond 1000 XP.

### 9.5 Stars and mastery

Three stars per conversation (§7.3). A conversation with all three is **mastered**. Course totals show stars earned out of
three per conversation, per level and in all.

### 9.6 Achievements (global rules, `rules.json`)

Conversations finished 1/10/50/100/365 · flawless 1/10 · stars 1/10/25/48 · mastered 1/5/16 · A1 complete · A2 complete ·
streak 2/5/7/14/30/60/100/365 · 5 of 7 days for 4 weeks · goal days 7/30/100 · lines in a day 10/25/50/100 · lines in all
50/250/1000/5000/10000/50000 · golden quarter-hour days 1/7/30/100/365 · levels 5/10/20 · hidden: early bird (7 mornings),
night owl (7 evenings), `comeback` (first activity after ≥ 3 idle days).

### 9.7 Streak freezes

+1 freeze every 7 days of streak, at most 2 stored; a gap is bridged only when the freezes cover all of it.

### 9.8 Rule engine

Achievements are data (`rules.json`, validated); evaluated after every accepted line and repeated while achievement XP
raises the level. Course metrics come from text stats per language learnt; the best language counts.

## 10. Data model (Dexie, database `fluentum`, version 1)


| Table | Key / indexes | Rows |
|---|---|---|
| `texts` | `id, lang, updatedAt` | `{ id, title, lang, body, createdAt, updatedAt }` |
| `segments` | `id, textId, [textId+order]` | `{ id, textId, order, content, wordCount, archived }` |
| `sessionRuns` | `id, textId, dayKey, startedAt, status` | `{ id, textId, title, dayKey, status, plan, entries, cursor, xpEarned, mode, unlocked?, newStar?, … }` |
| `attempts` | `id, segmentId, textId, sessionRunId, dayKey, timestamp` | transcript (optional), coverage, threshold, extra, wrong, accepted, firstTry, engine |
| `dailyStats` | `dayKey` | lines accepted, attempts, conversations completed, XP, goal, frozen, morning/evening, speaking time |
| `textStats` | `textId` | repetitions, lines accepted, perfect runs, `stars`, last practised |
| `achievements` | `key, ruleId, unlockedAt` | tier, XP, date |
| `xpLedger` | `++id, timestamp, reason` | `line` · `conversation` · `star` · `dailyGoal` · `achievement` |
| `settings` | `key` | `app`, `game`, `meta` |
| `friends` | `id` | friends' cards |
| `restorePoints` | `key` | the data a restore replaced (local only, never exported) |

## 11. Screens and UX

1. **Onboarding** (5 steps, skippable): welcome + language pair → how a conversation goes + the three stars → character →
   microphone check in the language being learnt (with the recogniser's privacy notice) → daily goal (lines).
2. **Home:** greeting, streak and freezes, goal ring, golden quarter-hour, "Up next" (resume or the next step) and Start,
   Lori's line, course stars, level, share today, backup reminder.
3. **Conversations:** the course by level, stepping stones with stars, the next step marked.
4. **Conversation page:** scene, partner, stars, the three ways (suggested first), the learner's lines, legend and how to read
   pronunciations.
5. **Player** (§8.3). 6. **Summary:** stars (new one animated), goal, numbers, share, achievements, next conversation.
7. **Progress:** plant and level, course stars per level, leaderboard, numbers, heatmap, first-try chart, achievements,
   conversations table. 8. **Settings:** languages, appearance, speech (engine, Whisper, hands-free, transcripts, mic test),
   daily practice (goal, day start, listen first, word colours, sounds), reminders, backup, privacy, about.

**Accessibility:** WCAG AA contrast in both themes, keyboard (Space = microphone), `aria-live` chat log, three line sizes,
reduced motion respected, masked lines labelled for assistive tech.

**Design:** the "Lagoon" identity (DECISIONS #11–#14): teal, coral, gold; Lexend + Instrument Sans; Phosphor Duotone; flat
portraits; Lori the lorikeet.

## 12. Reminders (no server)

A calendar file (.ics) with a daily recurring event ("Time for Fluentum") and a link to the app — the main solution; works on
every phone, free and reliable.

## 13. Privacy

Local-first: the author processes no learner data. The browser's speech recogniser may send audio to its vendor — stated before
first use and in `public/privacy.html` (PL + EN), with offline Whisper as the private alternative. Full JSON export/import with
validation (optional password), a backup reminder every 30 days, `storage.persist()` requested.

## 14. Delivery

- `npm run build` → static `dist/`; GitHub Actions: `ci.yml` (lint, typecheck, unit, e2e in Chromium/WebKit/Firefox on pull
  requests) and `deploy.yml` (Pages on push to `main`). Repository Settings → Pages → Source: GitHub Actions.
- Manifest: name "Fluentum – rozmowy po angielsku i po polsku", short name "Fluentum", `start_url`/`scope` `/fluentum/`,
  theme `#0b6b66`, icons 64/192/512 + maskable, install-sheet screenshots.

## 15. Relationship with Teleo

Same author, same engine lineage, separate repositories and data. Both apps share the browser origin
`aleksanderdudek.github.io`, so names of databases and caches are distinct and backups are not interchangeable
(DECISIONS #6). Engine improvements are ported by hand when useful.

## 16. Success metrics (local, visible only to the learner)

- First-try success ≥ 80 % (lower → tune the matcher or the content).
- Share of days with the goal reached; longest streak; stars earned.
No external analytics.

## 17. Definition of done (1.0)

- [x] Lint, typecheck, unit and e2e tests green.
- [x] A conversation in each way, PL→EN and EN→PL, end to end (fake speech in e2e; Chrome and Safari on devices by hand).
- [x] Installs as a PWA and opens offline (Web Speech then explains it needs the internet).
- [x] Backup → delete everything → restore brings the full state back.
- [x] Privacy policy (PL/EN) reachable from Settings and onboarding.
- [ ] Lighthouse PWA / Accessibility / Best Practices ≥ 90 on the deployed site (after publishing).
