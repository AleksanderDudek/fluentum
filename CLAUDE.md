# Fluentum — project brief for Claude Code

Local-first PWA for speaking practice: short scripted conversations said aloud, every line checked (Polish speakers
practise English, English speakers practise Polish). **Source of truth:** [docs/FLUENTUM_SPEC.md](docs/FLUENTUM_SPEC.md).
Decisions not covered by the spec: [docs/DECISIONS.md](docs/DECISIONS.md) — add an entry whenever you make a new one.
Started from the engine of Teleo (teleo@af2b337); engine decisions carried over are in DECISIONS "Engine inherited from Teleo".

## Stack
Vite 8 · React 19 · TypeScript 6 (strict, `erasableSyntaxOnly`, `noUncheckedIndexedAccess`) ·
react-router 8 data mode (`createHashRouter`) · Tailwind CSS 4 (CSS-first tokens in `src/index.css`) ·
Zustand 5 · Dexie 4 (IndexedDB) · vite-plugin-pwa (Workbox) · i18next · Vitest 5 · Playwright · oxlint.
Deployed as static files to GitHub Pages under `/fluentum/` — **no backend, no paid services, no API keys,
no analytics**.

## Commands
```bash
npm run dev          # dev server  → http://localhost:5173/fluentum/
npm run build        # tsc -b + vite build → dist/
npm run preview      # serve dist → http://localhost:4173/fluentum/
npm run test         # vitest (watch); CI: npm run test -- --run
npm run test:e2e     # playwright (builds + previews automatically)
npm run lint         # oxlint
npm run typecheck    # tsc -b
npm run icons        # PWA icons from public/icons/fluentum-mark.svg
npm run icons:phosphor  # regenerate src/components/icons/phosphor.ts
```

## Layout & conventions
- `src/domain/**` — pure business logic (matcher, live tracker, dialogue, mastery, gamification, session, time, speech
  interfaces, backup validation). No DOM, no Dexie. Every rule lives here and is unit-tested (`*.test.ts`, Node env).
- `src/db/` — Dexie schema + row types. `src/services/` — DB-coupled orchestration (one Dexie transaction per user
  event), tested with `fake-indexeddb`.
- `src/screens/<Name>/` — route screens; `src/components/` — shared UI; `src/hooks/`, `src/stores/`.
- Engine vocabulary (spec glossary): a *text* is the learner's lines of one conversation in the language being learnt
  (`dialogue:<lang>:<key>`), each line a *segment*; one go through a conversation is a *run* (table `sessionRuns`) in one
  way (`mode`: `read` | `prompt` | `recall`).
- Languages: the interface language is the learner's own; the other is learnt (`learningLang`). Recogniser, matcher and
  partner voice use the language being learnt.
- UI strings only via i18n keys (`src/i18n/pl.json` + `en.json`, identical key sets — enforced by a test).
- Code, comments, commits in English. Imports use the `@/` alias for `src/`.
- No `enum`/`namespace`; prefer string-literal unions and `as const` objects.
- Matcher = heart of the app: change it only test-first (`src/domain/matcher/*.test.ts`); the coverage a try needs comes
  from the ladder `coverageNeeded(failedTries)` — 90/80/70 % (DECISIONS #47).
- Key modules: `src/domain/live/liveTracker.ts` (continuous-listening state machine), `src/services/practice.ts` (one
  transaction per attempt: stats, XP ledger, streaks/freezes, finished conversation, stars, achievements),
  `src/domain/mastery` (ways, stars, staircase course path), `src/services/dialogues.ts` (start a conversation, course
  state, next step), `src/screens/Player` (the chat: live + tap modes, masks, "Show", listen-first),
  `src/domain/speech` (Web Speech engine, offline Whisper engine + worker, registry).
- The course: bilingual scripts in `src/content/dialogues.json`, in course order (A1 then A2); `{word|id}` role links parsed
  by `src/domain/dialogue/gloss.ts`; `dialogues.test.ts` validates every line (markup, same ids in both languages,
  respellings, icons, partners, the matcher accepts each learner line). Polish learner lines stay gender-neutral; numbers
  as words; a new icon name goes into `scripts/generate-phosphor-icons.mjs`.
- The onnxruntime-web runtime for Whisper is copied to `dist/ort/<version>/` by a Vite plugin and never
  precached; `npm ci` also pulls `onnxruntime-node` (transformers.js dependency, not bundled).
- Regenerate `package-lock.json` with CI's npm (`npx npm@11.19.0 install`), not an older local npm: npm
  11.6 omits the bundled deps of `@tailwindcss/oxide-wasm32-wasi` and `npm ci` on the runner then fails.
- Design "Lagoon" (DECISIONS #11–#14): tokens in `src/index.css` (teal `primary`, `coral`, `gold`, `sea`, `frost`; dark
  theme under `.dark`), fonts Lexend (`font-display`) + Instrument Sans, icons only through `<Icon name>` (Phosphor Duotone
  paths generated into `src/components/icons/phosphor.ts` — never import an icon package), portraits (`Portrait`,
  `Character`, `Avatar`) and Lori (`Lori`, `GuideBubble`) in `src/components/brand/`, drawn in code with fixed pigments.
- Same origin as Teleo (`aleksanderdudek.github.io`): keep the database (`fluentum`), cache (`fluentum-*`) and backup app
  (`fluentum`) names distinct (DECISIONS #6).
- Backups: `src/domain/backup` (validate, `crypto.ts` password envelope, `summary.ts`), `src/services/backup.ts`
  (import keeps a restore point in `restorePoints` — local only, never in `ALL_TABLES`), screen `src/screens/Data`
  (`/settings/data`). A new table must be added to `ALL_TABLES`, the backup validator (optional for old files) and
  the e2e round trip.
- Leaderboard: no server; friends' cards travel in links (`src/domain/leaderboard/friends.ts`, strict decoding).
- App shell (`src/app/TabsLayout.tsx`): support ribbon on top (`SupportStrip`), support panel at the end of each screen
  (`SupportBanner`), tab bar (`src/app/tabs.ts`: Home, Conversations, Progress, Settings). Screens start with `PageHeader`
  (sticky compact bar with back button and condensing title; pass `backTo` on sub-screens). Nothing of this in the player.
- e2e tests stub speech with `e2e/fakeSpeech.ts` (it says a line's `data-line`, so masked lines work; the headless shell
  crashes on the real `SpeechRecognition.available()`) and the partner's voice with `installFakeVoice`.
- Commit per feature with Conventional Commits (`feat: …`, `fix: …`). Nothing is pushed or published automatically
  (DECISIONS #18).
