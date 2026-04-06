/**
 * AudioPod SDK Type Definitions
 */

// Common Types
export type JobStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface PaginationParams {
  skip?: number;
  limit?: number;
}

// Transcription Types
export interface TranscriptionCreateParams {
  urls?: string[];
  url?: string;
  language?: string;
  speakerDiarization?: boolean;
  minSpeakers?: number;
  maxSpeakers?: number;
  wordTimestamps?: boolean;
}

export interface TranscriptionUploadParams {
  file: string;
  language?: string;
  speakerDiarization?: boolean;
  minSpeakers?: number;
  maxSpeakers?: number;
}

export interface TranscriptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  speaker_label?: string;
  confidence?: number;
}

export interface TranscriptionJob {
  id: number;
  job_id?: number;
  status: JobStatus;
  source_urls?: string[];
  language?: string;
  detected_language?: string;
  transcript_path?: string;
  total_duration?: number;
  estimated_duration?: number;
  estimated_credits?: number;
  error_message?: string;
  created_at?: string;
  completed_at?: string;
  display_name?: string;
}

export interface TranscriptionResult extends TranscriptionJob {
  segments?: TranscriptionSegment[];
  full_text?: string;
}

// Voice and TTS Types
export interface Voice {
  id: number;
  name: string;
  description?: string;
  preview_url?: string;
  is_public?: boolean;
  created_at?: string;
}

export interface VoiceCreateParams {
  name: string;
  audioFile: string;
  description?: string;
}

export interface TTSCreateParams {
  text: string;
  voiceId: number;
  speed?: number;
}

export interface TTSJob {
  id: number;
  status: JobStatus;
  output_url?: string;
  output_path?: string;
  error_message?: string;
  created_at?: string;
  completed_at?: string;
}

// Music Generation Types — AudioMusic V2
export type MusicTask =
  | "text2music"
  | "prompt2instrumental"
  | "lyric2vocals"
  | "text2rap"
  | "text2samples"
  | "cover"
  | "repaint"
  | "extract"
  | "complete"
  | "simple"
  | "retake"
  | "extend"
  | "edit";

export type AudioFormat = "wav" | "mp3" | "flac" | "ogg";
export type InferMethod = "ode" | "sde";
export type ModelVersion = "audiomusic-v2" | "audiomusic-v1.5";

export interface MusicCreateParams {
  /** Text description / caption of desired music */
  prompt: string;
  /** Alias for prompt (AudioMusic V2 uses caption internally) */
  caption?: string;
  /** Song lyrics with structure tags: [verse], [chorus], [bridge], etc. */
  lyrics?: string;
  /** Duration in seconds (-1 for auto, max 600). Default: -1 */
  duration?: number;
  /** Generation task type */
  task?: MusicTask;
  /** Genre preset name */
  genre?: string;
  /** Custom name for the generated track */
  displayName?: string;
  /** Generate instrumental only (ignore lyrics) */
  instrumental?: boolean;
  /** Output audio format. Default: "flac" */
  format?: AudioFormat;
  /** Model version. Default: "audiomusic-v2" */
  modelVersion?: ModelVersion;
  /** Number of diffusion inference steps (32-100). Default: 64 */
  inferenceSteps?: number;
  /** Classifier-free guidance scale (1.0-15.0). Default: 7.0 */
  guidanceScale?: number;
  /** Timestep shift factor (1.0-5.0). Default: 3.0 */
  shift?: number;
  /** Inference method: "ode" (Euler, faster) or "sde" (stochastic). Default: "ode" */
  inferMethod?: InferMethod;
  /** Enable 4B LM Chain-of-Thought reasoning. Default: true */
  thinking?: boolean;
  /** LM sampling temperature (0.0-2.0). Default: 0.85 */
  lmTemperature?: number;
  /** LM classifier-free guidance (0.0-10.0). Default: 2.0 */
  lmCfgScale?: number;
  /** LM top-k sampling (0-100, 0 disables). Default: 0 */
  lmTopK?: number;
  /** LM nucleus sampling (0.0-1.0). Default: 0.9 */
  lmTopP?: number;
  /** Generate metadata (BPM, key, time sig) via CoT. Default: true */
  useCotMetas?: boolean;
  /** Refine caption via CoT. Default: true */
  useCotCaption?: boolean;
  /** Generate/refine lyrics via CoT. Default: false */
  useCotLyrics?: boolean;
  /** Detect vocal language via CoT. Default: true */
  useCotLanguage?: boolean;
  /** Beats per minute (30-300, null for auto-detect) */
  bpm?: number;
  /** Musical key, e.g. "C Major", "Am" (null for auto-detect) */
  keyscale?: string;
  /** Time signature: "2/4", "3/4", "4/4", "6/8" (null for auto-detect) */
  timesignature?: string;
  /** Vocal language ISO 639-1 code, e.g. "en", "zh" ("unknown" for auto-detect) */
  vocalLanguage?: string;
  /** Number of variations to generate (1-8). Default: 1 */
  batchSize?: number;
  /** Random seed (-1 for random). Default: -1 */
  seed?: number;
  /** Generate LRC lyric timestamps. Default: false */
  generateLrc?: boolean;
  /** URL for track thumbnail image */
  thumbnailUrl?: string;
}

export interface MusicSimpleParams {
  /** Natural language description of desired music (1-1000 chars) */
  query: string;
  /** Generate instrumental only. Default: false */
  instrumental?: boolean;
  /** Vocal language code ("en", "zh", etc.). Default: "unknown" */
  vocalLanguage?: string;
  /** Custom display name */
  displayName?: string;
  /** Duration in seconds (-1 for auto). Default: -1 */
  duration?: number;
  /** Output format. Default: "flac" */
  format?: AudioFormat;
}

export interface MusicCoverParams {
  /** URL of the source audio to transform (required) */
  srcAudioUrl: string;
  /** Style description for the cover (required) */
  caption: string;
  /** New lyrics for the cover */
  lyrics?: string;
  /** Cover transformation strength (0.0-1.0). Default: 0.7 */
  audioCoverStrength?: number;
  /** Custom display name */
  displayName?: string;
  /** Duration in seconds (-1 for auto). Default: -1 */
  duration?: number;
  /** Output format. Default: "flac" */
  format?: AudioFormat;
}

export interface MusicReferenceParams {
  /** URL of reference audio for style guidance (required) */
  referenceAudioUrl: string;
  /** Text description / caption (required) */
  caption: string;
  /** Song lyrics */
  lyrics?: string;
  /** Generate instrumental only. Default: false */
  instrumental?: boolean;
  /** Custom display name */
  displayName?: string;
  /** Duration in seconds (-1 for auto). Default: -1 */
  duration?: number;
  /** Output format. Default: "flac" */
  format?: AudioFormat;
}

export interface MusicAnalyzeParams {
  /** URL of audio to analyze (required) */
  audioUrl: string;
  /** Pre-extracted semantic codes (optional) */
  audioCodes?: string;
  /** LM temperature for analysis (0.0-2.0). Default: 0.85 */
  temperature?: number;
}

export interface MusicAnalyzeResponse {
  success: boolean;
  caption?: string;
  lyrics?: string;
  bpm?: number;
  keyscale?: string;
  timesignature?: string;
  duration?: number;
  language?: string;
  audio_codes?: string;
  error?: string;
}

export interface MusicExtractStemParams {
  /** URL of audio to extract stem from (required) */
  srcAudioUrl: string;
  /** Track to extract: vocals, drums, bass, guitar, keyboard, strings, synth, percussion, brass, woodwinds, backing_vocals, fx */
  trackName: string;
  /** Custom display name */
  displayName?: string;
}

export interface MusicVariation {
  audio_url: string;
  seed?: number;
}

export interface MusicJob {
  id: number;
  task: MusicTask;
  status: JobStatus;
  progress?: number;
  output_url?: string;
  output_urls?: Record<string, string>;
  output_paths?: Record<string, string>;
  audio_duration?: number;
  display_name?: string;
  thumbnail_url?: string;
  prompt?: string;
  lyrics?: string;
  lrc_content?: string;
  lrc_url?: string;
  quality_score?: number;
  language?: string;
  genre?: string;
  actual_seeds?: number[];
  variations?: MusicVariation[];
  share_token?: string;
  share_url?: string;
  is_shared?: boolean;
  billing_status?: string;
  estimated_credits?: number;
  error_message?: string;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
}

// Stem Extraction Types
export type StemType =
  | "vocals"
  | "drums"
  | "bass"
  | "other"
  | "piano"
  | "guitar"
  | "kick"
  | "snare"
  | "hihat";
export type StemMode =
  | "single"
  | "two"
  | "four"
  | "six"
  | "producer"
  | "studio"
  | "mastering";
export type SingleStem =
  | "vocals"
  | "drums"
  | "bass"
  | "guitar"
  | "piano"
  | "other";

export interface StemExtractionParams {
  /** Path to local audio file */
  file?: string;
  /** URL of audio/video (YouTube, SoundCloud, etc.) */
  url?: string;
  /** Separation mode (default: 'four') */
  mode?: StemMode;
  /** For mode='single', which stem to extract */
  stem?: SingleStem;
}

export interface StemExtractionJob {
  id: number;
  status: JobStatus;
  source_type?: "FILE" | "URL";
  input_path?: string;
  stem_paths?: Record<string, string>;
  stem_types?: StemType[];
  task_id?: string;
  quality_scores?: Record<string, number>;
  download_urls?: Record<string, string>;
  error_message?: string;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
  original_filename?: string;
  display_name?: string;
}

export interface StemModeInfo {
  mode: StemMode;
  description: string;
  stem_count: number;
  outputs?: string[];
  note?: string;
}

export interface ModesResponse {
  modes: StemModeInfo[];
  pricing: string;
}

// Denoiser Types
export interface DenoiseParams {
  file?: string;
  url?: string;
}

export interface DenoiseJob {
  id: number;
  status: JobStatus;
  output_url?: string;
  output_path?: string;
  video_output_url?: string;
  is_video?: boolean;
  stats?: Record<string, any>;
  error_message?: string;
  created_at?: string;
  completed_at?: string;
  display_name?: string;
}

// Speaker Types
export type SpeakerJobType = "diarization" | "extraction";

export interface SpeakerDiarizeParams {
  file?: string;
  url?: string;
  numSpeakers?: number;
}

export interface SpeakerSegment {
  speaker: string;
  start: number;
  end: number;
}

export interface SpeakerJob {
  id: number;
  job_type: SpeakerJobType;
  status: JobStatus;
  num_speakers?: number;
  speakers?: string[];
  segments?: SpeakerSegment[];
  output_path?: string;
  output_url?: string;
  error_message?: string;
  created_at?: string;
  completed_at?: string;
  display_name?: string;
}

// Wallet Types
export interface WalletBalance {
  balance_cents: number;
  balance_usd: string;
  total_topup_cents: number;
  total_topup_usd: string;
  total_spent_cents: number;
  total_spent_usd: string;
  low_balance_warning: boolean;
  warning_threshold_cents: number;
}

export interface UsageLog {
  id: string;
  service_type: string;
  duration_seconds: number;
  duration_minutes: number;
  amount_cents: number;
  amount_usd: string;
  job_id?: string;
  api_key_id?: string;
  created_at?: string;
}

export interface UsageHistory {
  page: number;
  limit: number;
  logs: UsageLog[];
}

export interface ServicePricing {
  rate_per_minute: string;
  rate_per_hour: string;
  cents_per_minute: number;
  description: string;
}

export interface PricingInfo {
  services: Record<string, ServicePricing>;
  wallet: {
    minimum_topup_cents: number;
    maximum_topup_cents: number;
    currency: string;
  };
}

export interface CostEstimate {
  service_type: string;
  duration_seconds: number;
  cost_cents: number;
  cost_usd: string;
}
