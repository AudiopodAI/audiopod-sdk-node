# Changelog

## 2.10.0

### Added — Score-first music (v3)

New `client.music` methods for AudioMusic v3, where the song is written as an
editable score (ABC notation) first and the audio is rendered from it:

- `v3Availability()` — whether v3 is offered.
- `compose()` — write a score only, no audio (`POST /music/v3/plan`).
- `reviseScore()` — revise a score from a plain-language instruction
  (`POST /music/v3/revise`, coming soon on the server; 404 until then).
  `instruction` is limited to 500 characters client-side.
- `recordScore()` — render audio from a complete score (`POST /music/v3/edit`).
- `generateV3()` — score and audio in one call (`POST /music/v3/generate`).
- `getV3Job()`, `getScore()`, `listV3Jobs()`, `waitForV3Job()`.
- Typed `MusicV3*` params and response interfaces, and a `ValidationError`
  thrown before any request when arguments are invalid.

`compose` also accepts `description` (mutually exclusive with `lyrics`),
`targetSeconds` and `language`; these are coming soon on the server and are
rejected (422) until then. They are only sent when you set them.

### Changed

- The `quality` option on the v2 music methods is deprecated and no longer
  needed: every plan now gets the highest-quality music model at the standard
  rate. It is still accepted and is only sent when set.
- `VERSION` and the `User-Agent` now report the package version.
