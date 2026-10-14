# AGENTS.md — AudioPod Node.js SDK

Notes for coding agents (Claude Code, Cursor, Copilot, Codex, Windsurf) adding
audio features to a Node.js or TypeScript app with the `audiopod` package.

## When to use it

Use `audiopod` when the app needs any of: speech to text (with speaker
diarization, word timestamps, SRT/VTT subtitles), text to speech, voice
cloning, stem separation / vocal removal / karaoke, audio to MIDI, music
generation, noise reduction, or speaker separation. One key and one package
cover all of them. Types ship with the package.

```bash
npm install audiopod
```

## Auth

- `new AudioPod()` reads the API key from the `AUDIOPOD_API_KEY` environment
  variable, or pass `new AudioPod({ apiKey: "ap_..." })`. Keys start with `ap_`.
- Create a key at https://audiopod.ai/dashboard/account/api-keys.
- Server-side only: never ship the key to a browser bundle. Load it from the
  environment or a secret store.

## Billing

- API-key requests are paid from a prepaid USD **API wallet** first and, when
  the wallet can't cover a job, from the account's plan or pay-as-you-go
  credits. A 402 means neither can cover it. A first API key comes with a $1
  starter credit in the wallet (verified email).
- Rates: `client.wallet.getPricing()`; balance: `client.wallet.getBalance()`;
  estimate: `client.wallet.estimateCost({ serviceType, durationSeconds })`.
- Top up the wallet from the API keys page above, or add credits / upgrade at
  https://audiopod.ai/pricing.
- The MCP server (`https://mcp.audiopod.ai`) signed in with OAuth uses the
  account's credits instead of the API wallet.

## Capability → method

| Job | Method |
|---|---|
| Speech to text + speaker labels | `client.transcription.transcribe({ url, speakerDiarization: true })` (waits), then `client.transcription.getTranscript(job.id)` |
| Subtitles | `client.transcription.getTranscript(job.id, "srt")` (or `"vtt"`) |
| Text to speech | `client.voice.generate({ text, voiceId })` (waits) → `output_url` |
| List voices | `client.voice.list()` |
| Voice cloning | `client.voice.create({ name, audioFile, waitForReady: true })` |
| Voice from a description | `client.voice.design({ designPrompt })` then `client.voice.publishDesign({ previewId, name })` |
| Stem separation / vocal remover | `client.stems.separate({ file or url, mode: "two" / "four" / "six" })` (waits) → `download_urls` |
| Audio to MIDI | `client.midi.transcribe({ file })` (waits) → `merged_midi_url` |
| Music generation | `client.music.generate({ prompt, duration: 60 })` (waits) → `output_url` |
| Noise reduction | `client.denoiser.denoise({ file or url })` (waits) → `output_url` |
| Speaker separation | `client.speaker.diarize({ file or url })` |

Every method is typed; check the parameter interface in `dist/index.d.ts`
before writing the call.

## Jobs are asynchronous

Every audio task creates a job (`PENDING` → `PROCESSING` → `COMPLETED` or
`FAILED`). The convenience methods above (`transcribe`, `generate`,
`separate`, `denoise`, `midi.transcribe`) wait for you. The lower-level
`create(...)` / `speak(...)` / `extract(...)` return at once: keep the `id`
and call the resource's `waitForCompletion(id)`, or poll `get(id)` every few
seconds until `status` is `COMPLETED`.

Output URLs are signed links: download or store the file, don't persist the
URL as a permanent asset.

**Voice clones are jobs too.** `voice.create()` returns while the voice is
still `PENDING`, and speech with it fails ("Voice not ready") until it is
`COMPLETED`. Use `voice.create({ ..., waitForReady: true })` or
`client.voice.waitForReady(voiceId)` before the first `generate`/`speak` call.

## Errors and fixes

| Error class | Meaning | Fix |
|---|---|---|
| `AuthenticationError` | Missing, malformed or revoked key | Set `AUDIOPOD_API_KEY`; create a key at the API keys page |
| `InsufficientBalanceError` (402) | Neither the API wallet nor the account's credits cover this job; `.requiredCents`, `.availableCents` | Top up the API wallet or add credits, then retry |
| `RateLimitError` (429) | Too many requests | Back off and retry |
| `ValidationError` | Bad arguments, caught before any request | Fix the arguments named in the message |
| `APIError` (`.statusCode`) | Any other API error; the message carries the server's reason | 404 on a voice usually means it is not yours or not ready yet |

All SDK errors extend `AudioPodError`, exported from `audiopod`.

## More

- Agent guide (MCP, plugins, copy-paste prompts): https://docs.audiopod.ai/agents
- Docs index for LLMs: https://docs.audiopod.ai/llms.txt (any docs page is also
  available as Markdown by adding `.md` to its URL)
- Per-task quickstarts: https://docs.audiopod.ai/quickstarts/transcription
