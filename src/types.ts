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

// Music Generation Types
export type MusicTask =
  | "text2music"
  | "prompt2instrumental"
  | "lyric2vocals"
  | "text2rap"
  | "text2samples"
  | "audio2audio"
  | "songbloom";

export interface MusicCreateParams {
  prompt: string;
  lyrics?: string;
  duration?: number;
  task?: MusicTask;
  genre?: string;
  displayName?: string;
}

export interface MusicJob {
  id: number;
  task: MusicTask;
  status: JobStatus;
  output_url?: string;
  output_urls?: Record<string, string>;
  audio_duration?: number;
  display_name?: string;
  thumbnail_url?: string;
  error_message?: string;
  created_at?: string;
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
