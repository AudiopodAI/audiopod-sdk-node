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
  VoiceWaitOptions,
  TTSCreateParams,
  TTSJob,
  TTSDeliveryMode,
  TTSTimestampType,
  TTSGenerationParams,

  // Voice Design
  VoiceDesignParams,
  VoiceDesignPreview,
  VoiceDesignResponse,
  VoiceDesignPublishParams,

  // Music
  MusicCreateParams,
  MusicSimpleParams,
  MusicCoverParams,
  MusicReferenceParams,
  MusicQuality,
  MusicJob,

  // Score-first music (AudioMusic v3)
  MusicV3Cot,
  MusicV3Workflow,
  MusicV3Bars,
  MusicV3ComposeParams,
  MusicV3ReviseParams,
  MusicV3RecordParams,
  MusicV3GenerateParams,
  MusicV3ListParams,
  MusicV3WaitOptions,
  MusicV3Score,
  MusicV3ScoreComparison,
  MusicV3Diagnostics,
  MusicV3Billing,
  MusicV3Job,
  MusicV3Availability,

  // Stem Extraction
  StemExtractionParams,
  StemExtractionJob,
  StemType,
  StemMode,
  SingleStem,
  StemModeInfo,
  ModesResponse,
  StemPackage,
  StemExtractionAdvancedParams,
  StemCatalogEntry,

  // Denoiser
  DenoiseParams,
  DenoiseJob,

  // Speaker
  SpeakerDiarizeParams,
  SpeakerJob,

  // Wallet
  WalletBalance,
  UsageLog,

  // Audio to MIDI
  MidiStem,
  MidiConvertOptions,
  MidiConvertParams,
  MidiFromStemsParams,
  MidiJob,

  // Audio Reader
  ReaderEstimateParams,
  ReaderGenerateParams,
  ReaderEstimate,
  ReaderJob,

  // Podcast Studio
  PodcastQualityPreset,
  PodcastSpeakerRole,
  PodcastVoiceType,
  PodcastSegmentSize,
  PodcastSourceType,
  PodcastSpeakerCreate,
  PodcastProjectCreateParams,
  PodcastProjectUpdateParams,
  PodcastProject,
  PodcastSegment,
  PodcastDialogue,
  PodcastEpisodeProfileCreateParams,
  PodcastEpisodeProfileUpdateParams,
  PodcastSpeakerProfileCreateParams,
  PodcastSpeakerProfileUpdateParams,
  PodcastSpeakerUpdateParams,
  PodcastOutlineGenerateParams,
  PodcastSourceParams,
  PodcastRegenerateDialogueParams,
  PodcastGenerationProgress,
} from './types';

// Audiobook (project → chapter → paragraph)
export type {
  CreateProjectParams,
  GenerateBookParams,
  NarrateParams,
  ProduceParams,
  NarrateParagraphParams,
  BatchNarrateParams,
  ParseManuscriptParams,
  NarrationSettings,
  AutoDirectParams,
  AutoDirectionJob,
  AutoDirectionStatus,
  AudiobookProject,
  AudiobookProjectWithChapters,
  AudiobookChapter,
  AudiobookParagraph,
  AudiobookParagraphListResponse,
  AudiobookParagraphNarrationJob,
  AudiobookBatchNarrationJob,
  AudiobookNarrationCancellation,
} from './resources/audiobook';

// Streaming transcription
export { TranscriptionStream } from './resources/transcription-stream';

// Errors
export {
  AudioPodError,
  AuthenticationError,
  APIError,
  RateLimitError,
  InsufficientBalanceError,
  ValidationError,
} from './errors';

export const VERSION = '2.10.1';
