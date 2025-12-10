# AudioPod SDK for Node.js

Official Node.js SDK for [AudioPod AI](https://audiopod.ai) - Professional Audio Processing powered by AI.

## Installation

```bash
npm install audiopod-sdk
# or
yarn add audiopod-sdk
```

## Quick Start

```typescript
import { AudioPodClient } from 'audiopod-sdk';

// Initialize client
const client = new AudioPodClient({ apiKey: 'ap_your_api_key' });
// Or set AUDIOPOD_API_KEY environment variable

// Check wallet balance
const balance = await client.wallet.getBalance();
console.log(`Balance: ${balance.balance_usd}`);

// Extract stems from audio
const job = await client.stemExtraction.extractStems({
  audioFile: 'song.mp3',
  stemTypes: ['vocals', 'drums', 'bass', 'other'],
  waitForCompletion: true,
});

// Download stems
for (const [stem, url] of Object.entries(job.download_urls || {})) {
  console.log(`${stem}: ${url}`);
}
```

## Services

### Wallet (API Billing)

```typescript
// Get balance
const balance = await client.wallet.getBalance();

// Get pricing
const pricing = await client.wallet.getPricing();

// Estimate cost
const estimate = await client.wallet.estimateCost('stem_extraction', 300);

// Top up wallet
const checkout = await client.wallet.createTopupCheckout(2500); // $25
console.log(`Pay at: ${checkout.url}`);

// Usage history
const usage = await client.wallet.getUsageHistory(1, 50);
```

### Stem Extraction

```typescript
// Extract all stems
const job = await client.stemExtraction.extractStems({
  audioFile: 'song.mp3',
  stemTypes: ['vocals', 'drums', 'bass', 'other'],
  waitForCompletion: true,
});

// From URL
const job = await client.stemExtraction.extractStems({
  url: 'https://example.com/song.mp3',
  stemTypes: ['vocals', 'other'],
});

// Check status
const status = await client.stemExtraction.getJob(123);
```

### Transcription

```typescript
// Transcribe audio
const result = await client.transcription.transcribe({
  audioFile: 'podcast.mp3',
  speakerDiarization: true,
  waitForCompletion: true,
});
console.log(result.transcript);
```

### Voice Cloning & TTS

```typescript
// List voices
const voices = await client.voice.listVoices();

// Generate speech
const audio = await client.voice.generateSpeech({
  text: 'Hello, world!',
  voiceId: 123,
  waitForCompletion: true,
});
```

### Music Generation

```typescript
// Generate music
const result = await client.music.generate({
  prompt: 'upbeat electronic dance music',
  duration: 30,
  waitForCompletion: true,
});
```

### Noise Reduction

```typescript
// Denoise audio
const result = await client.denoiser.denoise({
  audioFile: 'noisy.mp3',
  mode: 'studio',
  waitForCompletion: true,
});
```

## Error Handling

```typescript
import { AudioPodClient, AuthenticationError, InsufficientBalanceError } from 'audiopod-sdk';

try {
  const client = new AudioPodClient();
  const job = await client.stemExtraction.extractStems({ audioFile: 'song.mp3' });
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.log('Invalid API key');
  } else if (error instanceof InsufficientBalanceError) {
    console.log(`Need to top up: required ${error.requiredCents} cents`);
  }
}
```

## TypeScript Support

This SDK is written in TypeScript and includes full type definitions.

```typescript
import { AudioPodClient, WalletBalance, StemExtractionResult } from 'audiopod-sdk';

const client = new AudioPodClient();

const balance: WalletBalance = await client.wallet.getBalance();
const job: StemExtractionResult = await client.stemExtraction.extractStems({
  audioFile: 'song.mp3',
  waitForCompletion: true,
});
```

## Documentation

- [API Reference](https://docs.audiopod.ai)
- [API Wallet](https://docs.audiopod.ai/account/api-wallet)
- [Stem Separation](https://docs.audiopod.ai/api-reference/stem-splitter)

## License

MIT

