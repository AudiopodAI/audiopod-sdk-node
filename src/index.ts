/**
 * AudioPod SDK for Node.js
 * Professional Audio Processing powered by AI
 */

export { AudioPodClient } from './client';
export { WalletService } from './services/wallet';
export { StemExtractionService } from './services/stemExtraction';
export { TranscriptionService } from './services/transcription';
export { VoiceService } from './services/voice';
export { MusicService } from './services/music';
export { SpeakerService } from './services/speaker';
export { DenoiserService } from './services/denoiser';
export { CreditService } from './services/credits';

export * from './types';
export * from './errors';

export const VERSION = '1.3.0';

