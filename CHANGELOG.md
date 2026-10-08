# Changelog

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
