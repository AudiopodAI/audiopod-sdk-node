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

## Installation

```bash
npm install audiopod
# or
yarn add audiopod
```

## Quick Start

```typescript
import AudioPod from "audiopod";

// Reads AUDIOPOD_API_KEY, or pass { apiKey: "ap_your_api_key" }
const client = new AudioPod();

// Text-to-speech
const job = await client.voice.speak({ text: "Welcome to AudioPod.", voiceId: 368 });
const done = await client.voice.waitForCompletion(job.id);
console.log(done.output_url);
```

Get a key at [audiopod.ai/dashboard/account/api-keys](https://www.audiopod.ai/dashboard/account/api-keys).

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
