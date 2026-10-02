# Decision log

Decisions taken where `docs/FLUENTUM_SPEC.md` is silent or needs a reason on record. Fluentum started on 2026-10-02 from
a snapshot of Teleo (teleo@af2b337); the engine decisions that still hold were carried over and renumbered (section
"Engine inherited from Teleo"). Newest entries at the bottom of each section; new decisions are appended at the very end.
Each entry: **decision** — why.

## Fluentum (owner request, 2026-10-02)

1. **A separate application started from a Teleo snapshot, not a shared package.** The owner wants Teleo to stay about
   prayers, affirmations and memorising, and language practice to live on its own. A monorepo with a shared engine package
   would add build and versioning machinery for one owner and two small static apps, and would couple releases of an app with
   live users to a new one. The engine is mature and tested, so Fluentum copies it (fresh history; the first commit names the
   source commit) and each app evolves on its own. Teleo removed the feature in the same change (Teleo DECISIONS #117–#118).
2. **Three ways through every conversation, one star each.** *Read* shows the line, its pronunciation and meaning;
   *Prompts* shows only the first letter of each word plus the meaning; *Recall* shows only the meaning. Words reveal as they
   are heard (live mode). A star is earned the first time the conversation is finished in that way with every line said — no
   skip, and no line revealed with "Show". Reading aloud alone is not learning to speak: prompts and recall turn the same
   script into production practice, and three stars give every conversation a visible path. Ways are never locked — adults
   choose — but the next one is suggested (`nextMode`).
3. **The course path is a staircase.** The suggested order reads conversation *k*, prompts *k−1* and recalls *k−2*
   (`coursePath`), so each conversation comes back one and two lessons after it was first read — spaced repetition without a
   scheduler, and every step is still a whole, finishable conversation. Once every star is earned, the conversation practised
   longest ago is offered for recall. Home's "Start talking" and the summary's "Next conversation" follow it.
4. **Name: Fluentum.** *Fluent* (languages) + *momentum* (motivation, progress that keeps going); Latin *fluentum*,
   "flowing" — a sibling to Teleo's Greek *telos*. It reads naturally in Polish and English. Checked on 2026-10-02: no language
   app of that name; npm `fluentum` and `github.com/AleksanderDudek/fluentum` were free.
5. **Free, like Teleo.** No accounts, backend, paid services, API keys, ads or analytics; an optional "buy a coffee" link
   (the owner's buycoffee.to, as in Teleo) in the ribbon and the support panel (#84–#85).
6. **Two apps, one browser origin.** Both live on `aleksanderdudek.github.io` (`/teleo/`, `/fluentum/`), which is one origin:
   IndexedDB `fluentum` (Teleo: `teleo`), Cache Storage `fluentum-ort` and `fluentum-models` (the Whisper model cache is not
   transformers.js' default name, so deleting a model in one app never deletes it from the other — at the cost of a second
   download for someone using both), service-worker scope `/fluentum/`. Backups carry `app: 'fluentum'`; each app refuses the
   other's file (`wrongApp`, with a hint where it belongs). The storage estimate covers the whole origin, so the Your data
   screen says Teleo's data is counted too. `navigator.storage.persist()` is per origin and so shared — harmless.
7. **A fresh data model (Dexie `fluentum` v1, nothing to migrate).** The engine's run model stays — a conversation is a text
   `dialogue:<lang>:<key>` of the learner's lines (segments), one go through it is a run — but everything prayer-specific is
   gone: text types, tags, archive flags, split modes, builtin seeding, session templates, Bible tables, per-text achievement
   rules. A run carries its way (`mode`) and the star it earned first (`newStar`, for the summary); text stats carry `stars`.
   Plan entries are just `{ segmentId, textId }`; a run is one conversation, so "text repetition" and "session completed"
   collapse into one rule (#9). Engine vocabulary (text, segment, run) is kept and documented in the spec's glossary — a
   rename through the practice service, gamification and backups would have been churn without a behaviour change.
8. **Achievements for a language course** (`rules.json`): conversations finished (1/10/50/100/365), flawless conversations
   (1/10), stars (1/10/25/48), conversations mastered with all three stars (1/5/16), A1 and A2 complete (every conversation
   of the level finished at least once), plus the streak, consistency, daily, all-time, golden quarter-hour, level, time-of-day
   and comeback rules of Teleo. Course metrics are counted per language learnt and the best language counts (someone who
   switched languages keeps what was earned in either). A content test checks that the top star/mastery thresholds stay
   reachable with the shipped conversations.
9. **XP: a finished conversation +25, a first star +15 / +25 / +40** (read / prompts / recall), on top of line XP
   (`5 + words`, first-try bonus, streak multiplier, golden quarter-hour) and the daily goal (+50). Everything a finished
   conversation earns is recorded with its last accepted line, in the same transaction (one transaction per attempt), so the
   chime, the quiet celebration lines and the summary agree; `finishRun` only closes the run. Harder ways pay more only through
   their first star — so nobody grinds reading for XP and stars stay the motivation to go deeper.
10. **"Show" costs the star; feedback never gives the line away.** In prompts and recall a "Show the line" button reveals the
    current line (stored as `hinted`, restored on resume); the run can still be finished and counts as a repetition, but earns
    no star, and the summary says why. After a rejected try, words not said yet stay masked in the comparison (first letter
    only), so recall stays recall. Skip after three failed tries stays (#35) and also costs the star.
11. **Identity "Lagoon", not the gilded icon.** Devotional imagery has no place in a language app. Sea-glass paper, deep teal
    for actions (flowing water), coral for the live voice and the streak flame, sunny gold for what is earned (XP, stars,
    the golden quarter-hour), sky blue for a streak freeze; dark theme "Night swim" (turquoise becomes the action colour).
    Every text/background pair used is ≥ 4.5:1 in both themes (checked when the tokens were set). A faint wave pattern and a
    wave divider carry the "flow" motif; hero panels are pools of light with a wave along the floor (`Pool`).
12. **Type: Lexend for headings and spoken lines, Instrument Sans for the UI**, both self-hosted (latin + latin-ext). Lexend
    was designed to make reading easier, which is exactly what a learner reading a line aloud needs. No italic face ships
    (pronunciations use the browser's synthetic italic).
13. **Icons: Phosphor Duotone only**, generated into `phosphor.ts` (`npm run icons:phosphor`); the Teleo Glyphs (devotional)
    are gone. The duotone fill is sunny gold by default (`accent`), plain for status and close buttons.
14. **The cast redrawn as flat portraits; Lori the lorikeet as the guide.** The same eight names (they work in both
    languages) are now modern head-and-shoulders portraits drawn in code with fixed pigments (`Portrait`), also used as the
    conversation partners. The guide is Lori, a rainbow lorikeet — parrots repeat words aloud — drawn in code in seven moods
    (`Lori`). Her voice: first person, warm, a little playful, never scolding; in Polish she is feminine ("usłyszałam").
15. **Sixteen conversations in course order**, eight from Teleo and eight new (bakery, taxi, weather, pharmacy, clothes,
    booking a table, airport, birthday), A1 before A2; each partner appears twice. Partners say "ty" even as shop staff: the
    polite "pan/pani" would force a choice of the learner's gender. No temperatures (°C vs °F) and no letter clothing sizes.
16. **Onboarding: the language pair first.** The welcome step shows "You speak Polish → you practise English" with the
    choice to correct it (the language still comes from the browser, #63, but here getting it wrong would teach the wrong
    language); then how a conversation goes and the three stars, the character, a microphone check in the language being
    learnt (the recogniser listens in it), and the daily goal in lines. The microphone test in Settings also listens in the
    language being learnt.
17. **Word colours can be turned off** (Settings → Daily practice; on by default). Some learners find the colour of every
    subject and predicate busy; the word list and pointing still work, the role legend is hidden.
18. **All rights reserved, like Teleo; nothing is published automatically.** The licence follows the owner's choice for
    Teleo. The repository is created locally only: creating the (public) GitHub repository publishes the code, so the owner
    does it with the two commands in the README; CI and Pages workflows are ready.

## Conversations (carried over from Teleo's language dialogues, Teleo DECISIONS #101–#108)

19. **Scripted bilingual conversations; the other language is the one learnt.** No backend and no API keys, so there is no
    generative partner: A1–A2 everyday conversations ship as data (`src/content/dialogues.json`), one bilingual script per
    conversation serving both directions. The interface language is the learner's own; the language learnt is the other one
    (`learningLang`). "The language model follows the language being learnt": the recogniser (Web Speech `lang`, Whisper's
    forced language), the matcher's normalisation and the speechSynthesis voice all use the target language. Every text is
    keyed by language, so a third language needs content (and matcher support), not a new engine.
20. **Word links are inline markup with grammatical roles**, `{word|id}` with ids `s`/`v`/`a`/`o` = subject, predicate,
    adjective, object; a word may carry several ids (Polish puts the subject into the verb ending: `{Poproszę|v1,s1}`).
    Colours follow the role (tokens `--role-*`, ≥ 4.5:1 on the bubbles in both themes), with the underlines of Polish school
    sentence analysis (subject one line, predicate two, adjective wavy, object dashed) as a cue that does not depend on colour.
    Pairs show by pointing (hover with a mouse, tap on a touch screen) and in each bubble's word list, which is also the
    keyboard and screen-reader route. "Adjective" includes predicative ones; nominal parts of predicates and adverbials stay
    unlinked. Polish learner lines avoid gendered forms (no past tense, no adjectives about the speaker).
21. **A conversation is played as an ordinary run** of its text: matcher, coverage ladder, XP, streaks, goal, golden
    quarter-hour and first-try credit apply unchanged; the partner's lines come from the script and are not attempts. A later
    script change is synced by `replaceSegments` (lines already spoken are archived, #48).
22. **One route for every run**: `/play/:runId` is the chat player; resume (Home), "once more" (the conversation page) and
    "next conversation" (summary) all start or resume a run and land there.
23. **Turn flow**: the partner "types" (0.75 s of dots), shows the line with its meaning and says it (speechSynthesis in the
    target language); only then does the learner's bubble appear and, with hands-free on, listening starts — live mode with
    Web Speech (one recognition per turn, stopped the moment the line is accepted), tap mode with Whisper or hands-free off. The
    microphone is always closed while a line is read aloud (the recogniser would accept the synthetic voice, #41). Without
    speechSynthesis the partner's line stays on screen for a reading pause (about three words a second, at least 1.5 s).
    "Listen first" reads the learner's line before listening. Leaving pauses the run (resumable the same day).
24. **Pronunciation is a respelling in the reader's own spelling**, the stressed syllable in capitals — IPA is unreadable for
    most learners. English lines for Polish readers use Polish orthography (`th` = tongue between the teeth, `ł` for w,
    `ii`/`uu` long vowels); Polish lines for English readers use English spelling (`zh`, `y`, `ee`, `oo`). Written by hand,
    shown on the current turn only in the read way (prompts and recall hide it: it would give the line away), and in the
    conversation page's list of lines.
25. **Content rules**: numbers written as words (recognisers disagree on digits), US spelling in English learner lines (the
    recogniser is en-US), no names the learner must say, no cultural traps (floor numbering differs between the US and
    Poland). `dialogues.test.ts` checks the markup, the same link ids in both languages, pronunciations, icons and partners,
    course order, and that the matcher accepts every learner line as a recogniser writes it.
26. **Screens**: four tabs — Home, Conversations, Progress, Settings. The course lists conversations as stepping stones by
    level with their stars and marks the suggested next step; a conversation page shows the scene, partner, stars, the three
    ways (suggested one first) and the learner's lines. Home puts the day (streak, goal, golden quarter-hour) above "Up next".

## Engine inherited from Teleo

### Tooling

27. **Scaffold = official `create-vite` React + TS template (Vite 8, TypeScript 6, oxlint).** TypeScript 7 (native) exists,
    but the template pins 6.x and parts of the ecosystem do not support 7 yet; linting uses oxlint (+ `jsx-a11y`).
28. **react-router 8 in data mode (`createHashRouter` + `RouterProvider`)**: hash URLs (no 404 on GitHub Pages refresh), plus
    `useBlocker` to confirm leaving a running conversation and route-level lazy loading.
29. **Node 24 in CI and current GitHub Action majors** (checkout v7, setup-node v7, upload-pages-artifact v5,
    deploy-pages v5). Vitest 5 and react-router 8 require Node ≥ 22.
30. **Tests run in two Vitest projects**: `unit` (Node, `*.test.ts`) and `dom` (jsdom, `*.test.tsx`). Domain modules are
    tested without any DOM. `TZ=Europe/Warsaw` is forced for deterministic day logic.
31. **Strict TS extras** `noUncheckedIndexedAccess` and `noImplicitOverride`; `erasableSyntaxOnly` means no
    `enum`/`namespace` — string-literal unions instead.
32. **Fonts are self-hosted** — no Google Fonts CDN, so no third-party requests and identical rendering offline.
33. **Production CSP via `<meta>`** (GitHub Pages cannot set headers): only `'self'` plus Hugging Face origins (the opt-in
    Whisper model download).
34. **PWA updates use `registerType: 'prompt'`**: an auto-update could reload the page in the middle of a conversation; the
    learner reloads when convenient.

### Rules

35. **Skip after three failed tries**; a skipped line earns no XP, breaks the conversation (no repetition, no bonus, no
    star) and counts as a failed first try in the first-try rate.
36. **Word count** = whitespace-separated chunks containing a letter or digit ("I'm" = 1 word); used for line XP
    (`5 + words`, capped at 30). Coverage uses matcher tokens.
37. **Streak** = number of *active* days in the current chain; frozen days bridge a gap but add nothing. The chain may end
    today or yesterday (then the streak is "at risk" until the learner speaks today).
38. **Freezes**: consumed when the app opens (or inside the first accepted line of a day — an installed PWA resumed from
    memory may skip start-up) and only when the freezes cover the *whole* gap; otherwise the streak ends and the freezes are
    kept. +1 every time the streak reaches a multiple of 7, max 2 stored.
39. **Comeback** = first activity after ≥ 3 full idle days. **Morning** = an accepted line at local hour ∈ [day start, 08:00);
    **evening** = at/after 21:00 or after midnight but before the day start. **Weekly rhythm** uses ISO weeks.
40. **Resume is offered only for runs with at least one processed line**, the same day; an untouched run is simply started
    again. **An empty capture is not an attempt**: "I didn't hear anything" is shown, nothing is recorded.
41. **Listen first** (and the partner's voice) pauses the microphone while speechSynthesis reads (the recogniser would
    otherwise hear the synthetic voice and accept it); a time limit guards engines that never fire `end`.
42. **Transcripts of rejected live-mode windows are stored** like any other attempt when "Save transcripts" is on; turning
    the setting off stores none. Audio is never stored.

### Matcher

43. Quote marks around a word don't block contraction expansion (`‘I’m’` → "i am"); `'re → are` for any word; `'d → would`
    only after pronouns/question words.
44. Digit tokens never near-match (`10000` ≠ `10001`); Polish number words are also recognised without diacritics
    (`dwadziescia` → 20), except `piec`.
45. A one-letter difference in a longer word is a tolerated recognition error, which also accepts a different grammatical
    gender (`wdzięczna` for `wdzięczny`).
46. **Polish recognition artefacts are forgiven, not the pass mark lowered**: split / merged words (accepted when the pieces
    make up exactly that word) and Polish sound keys (`ó`=`u`, `rz`=`ż`, `ch`=`h`, Polish only), compared next to the
    diacritic-free form. Both apply in tap and live mode and in live highlighting.
47. **The coverage ladder: each try of a line is gentler — 90 % → 80 % → 70 %.** The coverage a try needs follows the
    rejected tries on that line in this run (`run.entries[i].attempts`, so it survives pause/resume); "at least" stays
    literal (`ceil`), so a short line needs every word on its first try. A misheard word is a word not said (it lowers
    coverage but never rejects on its own); a word *added* to the line still fails the try; so does a word glued to a
    neighbour. Each attempt stores the coverage it needed (`Attempt.threshold`). The onboarding microphone check uses the last
    rung (70 %), the mic test the first (90 %).
48. **Segments needed by an unfinished run are archived, never deleted**, when a newer script changes a line, so the run can
    still be resumed and finished; lines ever spoken are archived too (their attempts keep pointing at them).

### Live mode

49. **Live mode = hands-free, on by default.** With Web Speech, one continuous recognition per turn; the line is checked in
    real time. Tap mode (one utterance per tap) stays available via the toggle in the player; with Whisper hands-free falls
    back to auto-listening when the turn starts.
50. **A line is accepted from interim results** when every word needed was heard; below 100 % coverage only once its last
    word was heard, or on a pause. Words after the matched line belong to the next one (not "extra").
51. **Failed attempts in live mode**: a pause ≥ 1.5 s after a wrong attempt, more than `line + 8` words without a match, or an
    immediate restart of the line after a slip each record one rejected attempt; the learner just says it again.
52. **While streaming, the tracker follows the best hypothesis; when a pause settles a line, every hypothesis is evaluated.**
    Tap mode always evaluates all of them. Unmatched words are carried across a recogniser restart.
53. **Celebrations never block**: the check, the XP and the chime come with the accepted line; achievements unlocked mid-run
    appear as a quiet line under the chat (toasts would cover it); the summary lists everything.
54. **Heard words get a sunny marker** (gold-soft background, gold underline) in the read way, and are revealed in prompts and
    recall; the marker lives outside the line's text node so its text stays exactly the line (or, masked, hidden from
    assistive tech with a label read instead).

### Offline Whisper engine

55. **Models `onnx-community/whisper-tiny` and `whisper-base`, dtype `q8`** (≈ 44 MB / ≈ 80 MB plus a 27 MB runtime). The
    smallest complete set; sizes shown include the runtime (tiny ≈ 70 MB, base ≈ 107 MB).
56. **WebGPU when the device has an adapter, WebAssembly otherwise**; any WebGPU failure moves the worker to WebAssembly for
    the session. WebAssembly is single-threaded (GitHub Pages cannot send COOP/COEP).
57. **Self-hosted onnxruntime-web runtime under `ort/<version>/`**, copied by a Vite plugin from `node_modules` (no CDN: the
    CSP allows 'self' scripts only), passed to the worker as `env.wasm.wasmBinary`; onnxruntime's own `new URL(...)`
    references are `@vite-ignore`d (no second 27 MB copy).
58. **Cache policy**: model files live in `fluentum-models` (#6), written only by the explicit download in Settings; at any
    other time the worker answers locally with 404, so loading a model never touches the network. The runtime is stored in
    `fluentum-ort` (versioned path, cache-first) and covered by a Workbox runtime route; never precached. Persistent storage
    is requested with the download; deleting the last model also deletes the runtime.
59. **Capture and silence**: `getUserMedia` (mono, echo cancellation, noise suppression) → `MediaRecorder` plus an
    `AnalyserNode`; speech = RMS ≥ 3× the noise floor and ≥ 0.008 for at least 150 ms; the utterance ends 1.5 s after the
    last speech, after 8 s without speech, or at 60 s. **Whisper never transcribes silence** (it invents subtitle credits).
60. **Engine resolution**: `auto` = Web Speech where the browser has it (live mode), otherwise Whisper if its model is
    downloaded; `whisper` only with a downloaded model; `webspeech` only Web Speech. A result arriving after `cancel()` is
    dropped (a skipped line must not get a late verdict).
61. **Privacy notice**: when recognition runs on the device (Whisper, or on-device Web Speech) the first-use dialog says the
    audio stays on the device instead of naming the browser vendor.

### Language, data and backups

62. **Settings live in three rows**: `app` (preferences), `game` (freezes, cached XP total, counters not derivable from daily
    stats) and `meta` (schema version, backup timestamps, share id). Boolean fields are not Dexie indexes (IndexedDB cannot
    index booleans).
63. **The language comes from the browser** (`detectUiLang`: Polish when preferred, English otherwise); onboarding and
    Settings can change it. The language switch names each language in its own language ("Polski", "English").
64. **Backup import replaces everything** in one transaction after full validation, then reloads the app at Home.
    Delete-all requires typing the confirmation word. The format is schema 1 with `appVersion`; tables added later must be
    optional on import (`OPTIONAL_BACKUP_TABLES`, none yet).
65. **Two-step export: create, then save or share** (the system share sheet where `canShare({ files })` says so — iOS refuses
    `navigator.share` after slow async work); the backup counts as made after a download or a completed share.
66. **Optional password protection**: AES-256-GCM, key from PBKDF2-SHA-256 with 600,000 iterations, a random salt and nonce
    per file, Web Crypto only; the readable header is bound as additional authenticated data; a crafted envelope is refused
    before any work (iteration bounds).
67. **Restore shows what it will do**: a protected file asks for its password first; then the file's date, app version and
    contents next to this device's (lines, active days, points, stars, achievements), with a warning when the file ends
    earlier or holds less progress.
68. **A restore can be undone — by switching, never by discarding**: the data a restore replaces is kept as the restore point
    (local only, never exported); switching exchanges it with the data in place, so whatever was done since is kept as the
    next restore point. Replace + switch instead of merging two histories (day aggregates, streaks and the XP ledger would
    double count).
69. **Storage status**: whether the browser promised persistence, the space the origin uses (Teleo included, #6), and "Ask to
    protect the data" when it is not persisted, with the Safari caveat (site data can be cleared after 7 days without a visit
    unless the app is on the Home Screen). The backup reminder on Home comes every 30 days.

### Motivation and sharing

70. **Golden quarter-hour**: lines said while today's speaking time is between 5 and 15 minutes earn ×2 XP, stacked on the
    streak multiplier; before and after it XP is plain. It promotes a daily 5–15 minute habit without punishing short or long
    days. Achievements for days with ≥ 15 minutes.
71. **Speaking time is an estimate from accepted words** (EN 140, PL 110 words/min; `domain/reading/pace.ts`). Recogniser
    durations differ between live and tap mode and engines, and pauses would pad them; words said cannot be padded.
72. **Gratification per line**: a synthesized Web Audio chime (no audio files) climbing a pentatonic scale with first-try
    lines in a row, a fuller chord for a finished conversation, goal or level; the XP just earned. "Sound effects" switch, on by
    default; audio is unlocked by the microphone tap and never plays while the page is hidden.
73. **Sharing**: the system share sheet with a 1080×1080 card drawn on canvas (square fits every feed uncropped), else copy +
    X/Facebook/WhatsApp links + download, with a preview of the exact text first. Polish posts use nominal phrasing or plurals
    keyed on the count, so no gendered verbs. After a conversation the card shares its title, lines said, first-try rate,
    points, streak and stars; "Share today" stays on Home.
74. **No global leaderboard** — there is no server. A **personal board** (current day/week/month vs your own periods) and a
    **friends board built from links**: a challenge link carries a small versioned card (name, figure, streak, current
    day/week/month points, a random per-install id); opening it adds or updates that friend on this device only. Cards are
    strictly validated; `/friend` is reachable before onboarding.
75. **Reminders are .ics only**: a daily recurring calendar event with an alarm — there is no server to send notifications,
    and the calendar works everywhere.

### Shell and UI

76. **Support ribbon at the top** (thin, sticky, one tap to buycoffee.to, not dismissible) on every screen outside a
    conversation; never in the player or onboarding. **Support panel at the end of every tab screen and of the summary**:
    Lori with her tip for today (different tomorrow), one line about the free app and the coffee button — one ask per screen.
77. **App bar, the large-title way**: `PageHeader` renders a compact bar under the ribbon — a 44 px back button on sub-screens
    (an installed app has no browser back button) and the title, which fades in once the large title scrolls under it. Back
    is "up" navigation to a fixed parent (`backTo`), not history.
78. **Tab bar**: a tab stays lit on its sub-screens (`app/tabs.ts`); tapping the current tab at its top level scrolls to the
    top; screen changes cross-fade with the View Transitions API (off with reduced motion); a thin line shows while a lazy
    screen loads; focus moves to the new screen's content unless the screen placed it.
79. **Platform polish**: dialogs are bottom sheets on phones and centred panels from `sm` up; cards answer a press on touch
    screens. **Install**: the browser's `beforeinstallprompt` is kept and offered as "Install Fluentum" in Settings; on
    iPhone/iPad the two Share-menu steps are shown instead. No manifest shortcuts (the manifest has one language).
80. **Accessibility over literal fidelity**: the microphone's inner ring is a span (the focus outline stays free); portraits
    are `role="img"` with a name, or hidden when the name is written next to them; masked lines are hidden from assistive tech
    and replaced by a label.
81. **`<Card>`'s default padding lives in the components layer** (`.card-pad`), so a padding utility passed by a screen wins.
