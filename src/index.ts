/**
 * AudioPod SDK for Node.js
 * Professional Audio Processing powered by AI
 * 
 * @example
 * ```typescript
 * import AudioPod from 'audiopod';
 * 
 * const client = new AudioPod({ apiKey: 'ap_...' });
 * 
 * // Transcribe audio
 * const job = await client.transcription.create({ url: 'https://...' });
 * const result = await client.transcription.waitForCompletion(job.id);
 * ```
 */

export { default, default as AudioPod } from './client';
export type { AudioPodOptions } from './client';

// Service types
export type {
  // Transcription
  TranscriptionCreateParams,
  TranscriptionJob,
  TranscriptionSegment,
  TranscriptionStreamConfig,
  TranscriptionStreamEvent,
  TranscriptionStreamWord,

  // Voice & TTS
  Voice,
  VoiceCreateParams,
  TTSCreateParams,
  TTSJob,
  
  // Music
  MusicCreateParams,
  MusicJob,
  
  // Stem Extraction
  StemExtractionParams,
  StemExtractionJob,
  StemType,
  StemMode,
  SingleStem,
  StemModeInfo,
  ModesResponse,
  
  // Denoiser
  DenoiseParams,
  DenoiseJob,
  
  // Speaker
  SpeakerDiarizeParams,
  SpeakerJob,
  
  // Wallet
  WalletBalance,
  UsageLog,
} from './types';

// Streaming transcription
export { TranscriptionStream } from './resources/transcription-stream';

// Errors
export {
  AudioPodError,
  AuthenticationError,
  APIError,
  RateLimitError,
  InsufficientBalanceError,
} from './errors';

export const VERSION = '2.5.0';
