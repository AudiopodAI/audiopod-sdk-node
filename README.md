# AudioPod Node.js SDK

Official Node.js SDK for [AudioPod AI](https://audiopod.ai) — professional audio
processing powered by AI: stem separation, transcription, voice cloning, music
generation, noise reduction, and speaker diarization.

This SDK is the **Platform (API + Agent)** surface of AudioPod — the developer
entry point alongside the [Python SDK](https://pypi.org/project/audiopod/), the
CLI, and the MCP server. API access is **pay-as-you-go** ($1 = 7,500 credits,
credits never expire) — no subscription required.

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

// Initialize client
const client = new AudioPod({ apiKey: "ap_your_api_key" });

// Separate audio into 6 stems
const result = await client.stems.separate({
  url: "https://youtube.com/watch?v=VIDEO_ID",
  mode: "six",
});

// Download stems
for (const [stem, url] of Object.entries(result.download_urls)) {
  console.log(`${stem}: ${url}`);
}
```

## Stem Separation

Extract individual audio components from mixed recordings.

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

### Examples

```typescript
import AudioPod from "audiopod";

const client = new AudioPod({ apiKey: "ap_your_api_key" });

// Six-stem separation from YouTube
const job = await client.stems.extract({
  url: "https://youtube.com/watch?v=VIDEO_ID",
  mode: "six",
});
console.log(`Job ID: ${job.id}`);

// Wait for completion
const result = await client.stems.waitForCompletion(job.id);
console.log(result.download_urls);

// Or use the convenience method (extract + wait)
const result = await client.stems.separate({
  url: "https://youtube.com/watch?v=VIDEO_ID",
  mode: "six",
});

// From local file
const result = await client.stems.separate({
  file: "./song.mp3",
  mode: "four",
});

// Extract only vocals
const result = await client.stems.separate({
  url: "https://youtube.com/watch?v=VIDEO_ID",
  mode: "single",
  stem: "vocals",
});

// Get available modes
const modes = await client.stems.modes();
modes.modes.forEach((m) => {
  console.log(`${m.mode}: ${m.description}`);
});
```

## API Wallet

Check balance and manage your wallet.

```typescript
// Check balance
const balance = await client.wallet.balance();
console.log(`Balance: ${balance.balance_usd}`);

// Estimate cost
const estimate = await client.wallet.estimate("stem_extraction", 180);
console.log(`Estimated cost: ${estimate.cost_usd}`);

// Get usage history
const usage = await client.wallet.usage();
usage.logs.forEach((log) => {
  console.log(`${log.service_type}: ${log.amount_usd}`);
});
```

## Other Services

```typescript
// Transcription
const job = await client.transcription.create({ url: "https://..." });
const result = await client.transcription.waitForCompletion(job.id);

// Voice cloning
const voice = await client.voice.clone({
  file: "./sample.wav",
  name: "My Voice",
});

// Music generation
const song = await client.music.generate({
  prompt: "upbeat electronic dance music",
});

// Noise reduction
const clean = await client.denoiser.denoise({ file: "./noisy.wav" });

// Speaker diarization
const speakers = await client.speaker.diarize({ url: "https://..." });
```

## Error Handling

```typescript
import AudioPod, {
  InsufficientBalanceError,
  AuthenticationError,
} from "audiopod";

try {
  const client = new AudioPod({ apiKey: "ap_..." });
  const result = await client.stems.separate({ url: "...", mode: "six" });
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
- [API Reference](https://docs.audiopod.ai/api-reference/stem-splitter)
- [Get API Key](https://www.audiopod.ai/dashboard/account/api-keys)

## License

MIT License - see [LICENSE](LICENSE) for details.
