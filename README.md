# AudioPod Node.js SDK

Official Node.js SDK for [AudioPod AI](https://audiopod.ai) — an all-in-one AI
**audio** platform: music generation, text-to-speech (with directing), voice
cloning, stem separation, transcription, speaker separation, noise reduction,
and audiobook production.

This SDK is the **Platform (API + Agent)** surface of AudioPod — the developer
entry point alongside the [Python SDK](https://pypi.org/project/audiopod/), the
CLI, and the MCP server. **Start free** — mint a key, get free credits to try,
no card required. API usage is **pay-as-you-go** ($1 = 7,500 credits, credits
never expire).

[![npm version](https://badge.fury.io/js/audiopod.svg)](https://www.npmjs.com/package/audiopod)
[![Node 16+](https://img.shields.io/badge/node-16+-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Run in Postman](https://run.pstmn.io/button.svg)](https://god.gw.postman.com/run-collection/58401244-916ddbda-1a70-4c07-8ccd-fe524703a84b?action=collection%2Ffork&source=rip_markdown&collection-url=entityId%3D58401244-916ddbda-1a70-4c07-8ccd-fe524703a84b%26entityType%3Dcollection%26workspaceId%3D8013472d-5897-47d1-bf5c-92683a027b35&utm_source=audiopod-sdk-node)

Want to see a response before installing anything? The **Getting Started**
collection reaches a real `200` in two requests with no account and no API key.
[More about the collections](https://docs.audiopod.ai/sdks/postman).

## Installation

```bash
npm install audiopod
# or
yarn add audiopod
```

## Quick start: one call per task

Set `AUDIOPOD_API_KEY` (or pass `{ apiKey: "ap_..." }`), then each task is one
call that waits for the job and returns its output links. Get a key at
[audiopod.ai/dashboard/account/api-keys](https://www.audiopod.ai/dashboard/account/api-keys).

**Transcribe with speaker labels (as SRT subtitles)**

```typescript
import AudioPod from "audiopod";
const client = new AudioPod();
const job = await client.transcription.transcribe({ url: "https://example.com/interview.mp3", speakerDiarization: true });
console.log(await client.transcription.getTranscript(job.id, "srt"));
```

**Split a song into stems**

```typescript
import AudioPod from "audiopod";
const client = new AudioPod();
const job = await client.stems.separate({ file: "./song.mp3", mode: "four" }); // vocals, drums, bass, other
console.log(job.download_urls);
```

**Text to speech**

```typescript
import AudioPod from "audiopod";
const client = new AudioPod();
const job = await client.voice.generate({ text: "Welcome to AudioPod.", voiceId: 368 });
console.log(job.output_url);
```

**Generate music**

```typescript
import AudioPod from "audiopod";
const client = new AudioPod();
const track = await client.music.generate({ prompt: "lo-fi hip hop, 80 BPM, soft piano", duration: 60 });
console.log(track.output_url);
```

**Audio to MIDI / noise removal**

```typescript
import AudioPod from "audiopod";
const client = new AudioPod();
console.log((await client.midi.transcribe({ file: "./song.mp3" })).merged_midi_url);
console.log((await client.denoiser.denoise({ file: "./voice-memo.m4a" })).output_url);
```

Step-by-step guides for each task start at
[docs.audiopod.ai/quickstarts/transcription](https://docs.audiopod.ai/quickstarts/transcription).

## Using with AI agents

- **Coding agents (Claude Code, Cursor, Copilot, Windsurf):** tell the agent to
  use the `audiopod` npm package and point it at
  [docs.audiopod.ai/llms.txt](https://docs.audiopod.ai/llms.txt). Every docs page
  is also served as Markdown: add `.md` to its URL.
- **Agents as tools (MCP):** connect `https://mcp.audiopod.ai/core` (transcribe,
  stems, cleanup, MIDI) or `https://mcp.audiopod.ai` (adds speech, voices and
  music). Sign-in is OAuth; an `X-API-Key` header works for CI.
- **Claude Code plugin:** `/plugin marketplace add AudiopodAI/claude-plugin`, then
  `/plugin install audiopod@audiopod`.
- **ChatGPT:** add `https://mcp.audiopod.ai/core` as a connector in developer mode.

Setup for every client, plus copy-paste prompts:
[AudioPod for AI agents](https://docs.audiopod.ai/agents).

## Text-to-Speech

500+ voices across 85+ languages, with **inline directing** written straight
into the text.

```typescript
// Emotion, non-verbal sounds, pauses, and pronunciation — all inline in `text`
const job = await client.voice.speak({
  text: '[warm, unhurried] Good evening. [breathe] Tonight, a story. <break time="600ms"/> It begins in Worcester /ˈwʊstər/.',
  voiceId: 368,
});
```

- **Emotion / delivery** — a leading bracket per segment: `[whispering, tense] …`
- **Non-verbal sounds** — `[laugh] [sigh] [clear throat] [breathe] [cough] [yawn] [chuckle] [gasp] [groan]`
- **Pauses** — `<break time="500ms"/>` (≤10s each, ≤20 per request)
- **Pronunciation** — inline IPA between slashes: `Worcester /ˈwʊstər/`

Word-level timestamps (for follow-along / karaoke UIs) and **Voice Design**
(create a voice from a text description) are available via the REST API —
see [the docs](https://docs.audiopod.ai/api-reference/text-to-speech).

## Voice Cloning

```typescript
// Instant clone from a 5–30s reference clip
const voice = await client.voice.create({ name: "My Voice", audioFile: "./sample.wav" });

// Reuse the clone for TTS
const job = await client.voice.speak({ text: "Now in my own voice.", voiceId: voice.id });
```

Voice conversion (voice-to-voice) is available via the REST API — see
[Voice Changer](https://docs.audiopod.ai/api-reference/voice-changer).

## Music Generation

```typescript
// Duration is not tier-capped (10s–10min; -1 = model-decided)
const job = await client.music.generate({
  prompt: "upbeat synthwave, 120 BPM, driving bassline",
  duration: 60,
});
const song = await client.music.waitForCompletion(job.id);
```

Every plan now gets the highest-quality music model at the standard rate, so
the old `quality` option is no longer needed. It is still accepted for
compatibility and is only sent when you set it.

### Score-first music (v3)

AudioMusic v3 writes the song as an editable score (ABC notation) first and
renders the audio from that score, so you can read and change the music itself
before paying for a recording. There is no `duration`: length follows the
lyrics and the score.

```typescript
const caps = await client.music.v3Availability(); // { available, revise }
if (caps.available) {
  // 1. Write the score only (no audio). Bring your own lyrics, or describe
  //    the song and AudioPod writes the lyrics first.
  let plan = await client.music.compose({
    description: "a hopeful folk song about leaving a harbour town at dawn",
    targetSeconds: 150,
  });
  plan = await client.music.waitForV3Job(plan.job_id);

  // 2. Optional: change it in plain English (when enabled for your account)
  if (caps.revise) {
    const job = await client.music.reviseScore({
      sourceJobId: plan.job_id,
      instruction: "make the chorus higher",
      section: "chorus",
      idempotencyKey: "my-retry-safe-key",
    });
    plan = await client.music.waitForV3Job(job.job_id);
    console.log(plan.note, plan.score_comparison?.changed_bars); // { Vocal: [[9, 16]] }
  }

  // 3. Record the score as audio (omit abc to record the score as it is)
  const take = await client.music.recordScore({ sourceJobId: plan.job_id });
  const song = await client.music.waitForV3Job(take.job_id);
  console.log(song.audio_url);
}
```

| Method | Endpoint |
|---|---|
| `v3Availability()` | `GET /api/v1/music/v3/availability` |
| `compose({ style?, lyrics?, description?, targetSeconds?, language?, ... })` | `POST /api/v1/music/v3/plan` (score only) |
| `reviseScore({ sourceJobId, instruction, section?, bars?, idempotencyKey?, ... })` | `POST /api/v1/music/v3/revise` (score only) |
| `recordScore({ sourceJobId, abc?, ... })` | `POST /api/v1/music/v3/edit` (renders audio) |
| `generateV3({ style, lyrics?, abc?, ... })` | `POST /api/v1/music/v3/generate` (score + audio) |
| `getV3Job(id)` / `getScore(id)` | `GET /api/v1/music/v3/jobs/{id}` / `.../score` |
| `listV3Jobs({ workflow?, sourceJobId? })` | `GET /api/v1/music/v3/jobs` |
| `waitForV3Job(id, { timeout?, pollInterval? })` | polls until `COMPLETED` |

Checked client-side before any request (throws `ValidationError`): `lyrics`
and `description` are mutually exclusive, `style` is required without a
`description`, `targetSeconds` is 30–300, `instruction` is 1–500 characters,
`section` at most 60, `bars` 1–10000 with start ≤ end, and `idempotencyKey`
(sent as the `Idempotency-Key` header) at most 200.

Server error codes (in the `APIError` message; nothing is charged for any of
them): `LYRICS_FAILED` (422), `LYRICS_BUSY` (503), `DESCRIPTION_NOT_ALLOWED`
(422) on `compose`; `REVISE_FAILED` (422), `REVISE_TARGET_NOT_FOUND` (422),
`REVISE_IN_FLIGHT` (409), `IDEMPOTENCY_KEY_REUSED` (422), `REVISE_RATE_LIMITED`
(429), `REVISE_UNAVAILABLE` (503) on `reviseScore`; `SCORE_ALREADY_RECORDING`
(409) on `recordScore`.

## Stem Separation

Extract individual audio components from a mixed recording.

### Available Modes

| Mode        | Stems | Output                                                          |
| ----------- | ----- | --------------------------------------------------------------- |
| `single`    | 1     | Specified stem only (vocals, drums, bass, guitar, piano, other) |
| `two`       | 2     | Vocals + Instrumental                                           |
| `four`      | 4     | Vocals, Drums, Bass, Other                                      |
| `six`       | 6     | Vocals, Drums, Bass, Guitar, Piano, Other                       |
| `producer`  | 8     | + Kick, Snare, Hihat                                            |
| `studio`    | 12    | Full production toolkit                                         |
| `mastering` | 16    | Maximum detail                                                  |

```typescript
// From a local file (or pass { url: "https://.../song.mp3" })
const result = await client.stems.separate({ file: "./song.mp3", mode: "six" });
for (const [stem, url] of Object.entries(result.download_urls)) {
  console.log(`${stem}: ${url}`);
}

// Isolate just the vocals
const vocals = await client.stems.separate({ file: "./song.mp3", mode: "single", stem: "vocals" });
```

## Audio to MIDI

Convert a mix — or stems you already separated — into MIDI (bass, vocals,
piano by default; guitar is opt-in/experimental). It's a starting-point
transcription: tidy timing/lengths in your DAW, drums aren't transcribed
yet, and dynamics are approximate.

```typescript
// Standalone: split + transcribe in one call (default stems: bass, vocals, piano)
const result = await client.midi.transcribe({ file: "./song.mp3" });
console.log(result.merged_midi_url);

// Add-on: transcribe stems you already separated (bills the add-on rate only)
const stemJob = await client.stems.separate({ file: "./song.mp3", mode: "six" });
const midiJob = await client.midi.convertFromStemJob(stemJob.id);
for (const [stem, url] of Object.entries(midiJob.midi_urls ?? {})) {
  console.log(`${stem}: ${url}`);
}
```

## Transcription

```typescript
// Speaker labels + word timestamps
const job = await client.transcription.create({
  url: "https://example.com/meeting.mp3",
  speakerDiarization: true,
  wordTimestamps: true,
});
const result = await client.transcription.waitForCompletion(job.id);
```

Premium-accuracy transcription and real-time WebSocket streaming
(`client.transcription.stream(...)`) are also supported — see
[Speech-to-Text](https://docs.audiopod.ai/api-reference/speech-to-text).

## Other Audio Services

```typescript
// Speaker separation / diarization
const speakers = await client.speaker.diarize({ url: "https://example.com/interview.wav" });

// Noise reduction
const clean = await client.denoiser.denoise({ file: "./noisy.wav" });

// Audiobook production (manuscript → ACX-ready export)
const project = await client.audiobook.createProject({ title: "My Book", language: "en" });
```

## Audiobooks: paragraph-level control

Narration works at paragraph granularity — project → chapter → paragraph.

```typescript
// Manuscript parsing is async. waitForParse polls the project and throws
// immediately if the parse failed (instead of hanging forever).
await client.audiobook.waitForParse(projectId);

// One round-trip for the project plus its chapters.
const project = await client.audiobook.getProject(projectId, { includeChapters: true });
const chapterId = project.chapters![0].id;

// Omit page/perPage to get every paragraph in the chapter.
const { paragraphs, total } = await client.audiobook.listParagraphs(projectId, chapterId);

// Narrate a single paragraph (first take billed, first regeneration free).
const take = await client.audiobook.narrateParagraph(projectId, paragraphs[0].id, {
  voiceId: 42,
  direction: "warm, unhurried",
});
const status = await client.audiobook.getParagraph(projectId, paragraphs[0].id);

// Or queue one job for many paragraphs — omit both id lists for the whole project.
const batch = await client.audiobook.batchNarrate(projectId, { voiceId: 42, chapterIds: [chapterId] });
```

## OpenAI-Compatible Endpoints

Already have OpenAI-shaped audio code? Point it at AudioPod — set the client
base URL to `https://api.audiopod.ai/api/v1` and `Authorization: Bearer ap_...`.
The `/audio/speech`, `/audio/transcriptions`, and `/audio/translations`
endpoints behave like their OpenAI counterparts. See
[OpenAI compatibility](https://docs.audiopod.ai/api-reference/openai-compatibility).

## API Wallet

```typescript
const balance = await client.wallet.getBalance();
console.log(`Balance: ${balance.balance_usd}`);

const estimate = await client.wallet.estimateCost({ serviceType: "text_to_speech", durationSeconds: 180 });
console.log(`Estimated cost: ${estimate.cost_usd}`);
```

## Error Handling

```typescript
import AudioPod, {
  InsufficientBalanceError,
  AuthenticationError,
} from "audiopod";

try {
  const client = new AudioPod({ apiKey: "ap_..." });
  const job = await client.voice.speak({ text: "Hello", voiceId: 368 });
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.log("Invalid API key");
  } else if (error instanceof InsufficientBalanceError) {
    console.log(`Need more credits. Required: ${error.requiredCents} cents`);
  }
}
```

## Environment Variables

```bash
export AUDIOPOD_API_KEY="ap_your_api_key"
```

```typescript
// Client reads from env automatically
const client = new AudioPod();
```

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import AudioPod, { StemExtractionJob, StemMode, WalletBalance } from "audiopod";
```

## Documentation

- [API Documentation](https://docs.audiopod.ai)
- [Text-to-Speech](https://docs.audiopod.ai/api-reference/text-to-speech)
- [Get API Key](https://www.audiopod.ai/dashboard/account/api-keys)

## License

MIT License - see [LICENSE](LICENSE) for details.
