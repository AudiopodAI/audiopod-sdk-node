# Changelog

## Unreleased

### Added — `voice.create({ ..., waitForReady: true })` (PLAT-3976)

A new clone is `PENDING` while it processes, and speech with it fails until it
is `COMPLETED`. `voice.create` now takes `waitForReady` (default `false`),
`timeout` and `pollInterval` (milliseconds) and polls the voice status until it
is usable; a failed or cancelled clone, or a timeout, throws `AudioPodError`
with the reason. The poll is also public as `client.voice.waitForReady(voiceOrId)`.
`audiopod clone` now waits too. `Voice` gains optional `uuid`, `status` and
`error_message`.

### Changed — 401 and 402 errors say how to fix them

`AuthenticationError` now says to set `AUDIOPOD_API_KEY` and where to create a
key. `InsufficientBalanceError` explains the prepaid API wallet and how to top
it up, and now reads the server's message and `requiredCents` /
`availableCents` from the nested `detail` object (the message used to be
`[object Object]` and the amounts `undefined`). Error classes are unchanged.
`AGENTS.md` ships in the package.

### Fixed — `denoiser.denoise({ url })` sends a form (PLAT-3976)

A URL denoise was posted as JSON, but the API reads form fields, so the job
arrived without its URL and was rejected. It now goes as a form, like a file
upload. New optional `mode` (`"balanced"`, `"studio"` or `"ultra"`) is sent as
the API's `quality_mode`; leave it unset for the server default (`"studio"`).

### Fixed — `voice.generate()` and `music.generate()` wait on the right job

`POST /voice/voices/{id}/generate` answers `{ job_id }` and the music create
endpoints answer `{ job: { id }, message }`; both helpers read `job.id` and
polled `undefined` (422). They now read the id each endpoint actually returns.

### Fixed — `speaker.diarize({ url, numSpeakers })`

A URL job was posted as JSON, but the API reads `url` from a form and
`num_speakers` from the query string, so both were lost. It now sends a form
plus a query parameter (file uploads also send `num_speakers` in the query).

### Docs

README opens with a one-call quickstart per task and a "Using with AI agents"
section; `examples/` adds `node-tts`, `next-tts` and `stems-cli`.

## 2.10.1

### Fixed — an empty selection no longer means "the whole book" (PLAT-3944)

`autoDirect`, `batchNarrate`, `startNarration` and `startExport` (and the
wrappers built on them) now throw for an explicitly empty `chapterIds`,
`paragraphIds` or `includeChapters` array, e.g.
`chapterIds is empty; pass undefined to use the whole book`. Previously
`autoDirect(id, { chapterIds: [] })` dropped the array and directed the whole
book again. Omit the field to use the whole book; the API itself now rejects an
empty array with 400 `empty_selection`.

## 2.10.0

### Added — Score-first music (v3)

New `client.music` methods for AudioMusic v3, where the song is written as an
editable score (ABC notation) first and the audio is rendered from it:

- `v3Availability()` — `{ available, revise }`: whether v3, and score
  revision, are offered for your account.
- `compose()` — write a score only, no audio (`POST /music/v3/plan`). Bring
  your own `lyrics`, or send a `description` (with optional `targetSeconds`
  30–300 and `language`) and AudioPod writes the lyrics first.
- `reviseScore()` — change a score in plain English (`POST /music/v3/revise`),
  narrowed by `section` or `bars`; returns a new score-only job whose
  `score_comparison.changed_bars` is `{ voice: [[start, end], ...] }`. Available
  when enabled for your account. `idempotencyKey` is sent as the
  `Idempotency-Key` header.
- `recordScore()` — render audio from a score (`POST /music/v3/edit`). Omit
  `abc` to record the source job's score as it is (fetched via `getScore()`).
- `generateV3()` — score and audio in one call (`POST /music/v3/generate`).
- `getV3Job()`, `getScore()`, `listV3Jobs()`, `waitForV3Job()`.
- Typed `MusicV3*` params and response interfaces, and a `ValidationError`
  thrown before any request when arguments break the server's limits.

### Changed

- The `quality` option on the v2 music methods is deprecated and no longer
  needed: every plan now gets the highest-quality music model at the standard
  rate. It is still accepted and is only sent when set.
- `VERSION` and the `User-Agent` now report the package version.
