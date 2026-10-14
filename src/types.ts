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

// Real-time streaming transcription
export interface TranscriptionStreamConfig {
  /** BCP-47 language code (e.g. 'en'), or null/undefined to auto-detect. */
  language?: string | null;
  /** Label speakers in the live transcript. */
  diarize?: boolean;
  /** Audio sample rate in Hz (default 16000). Must match the PCM you send. */
  sampleRate?: number;
  /** Audio channel count (default 1 / mono). */
  channels?: number;
}

export interface TranscriptionStreamWord {
  word: string;
  start: number;
  end: number;
  speaker?: number;
  confidence?: number;
}

/** A server frame from a streaming session. `type` discriminates the payload. */
export interface TranscriptionStreamEvent {
  type: 'ready' | 'partial' | 'final' | 'usage' | 'completed' | 'error';
  /** Transcript text (`partial` = interim, `final` = stable). */
  text?: string;
  words?: TranscriptionStreamWord[];
  is_final?: boolean;
  speech_final?: boolean;
  /** Backing transcription job id (on `ready`/`completed`). */
  job_id?: number;
  session_id?: string;
  /** True when this is a free capped preview (no persistence/billing). */
  taste?: boolean;
  max_duration_seconds?: number;
  /** Credits consumed so far / total (on `usage`/`completed`). */
  credits_used?: number;
  streamed_seconds?: number;
  transcript_path?: string | null;
  /** Error code/message (on `error`), e.g. `PREMIUM_TIER_REQUIRED`. */
  code?: string;
  message?: string;
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

/** Delivery style for a directed take. */
export type TTSDeliveryMode = "stable" | "balanced" | "creative";
/** Granularity of returned timestamp metadata. */
export type TTSTimestampType = "word" | "character";

/**
 * Optional directing controls passed through verbatim as JSON in the
 * `generation_params` form field. Keys are snake_case to match the API — only
 * `delivery_mode`, `timestamp_type`, and `text_normalization` are honored;
 * anything else is ignored server-side.
 */
export interface TTSGenerationParams {
  /** Delivery style: "stable" | "balanced" | "creative". */
  delivery_mode?: TTSDeliveryMode;
  /** Timestamp granularity in the result metadata: "word" | "character". */
  timestamp_type?: TTSTimestampType;
  /** Normalize numbers/abbreviations before speaking. */
  text_normalization?: boolean;
  [key: string]: any;
}

export interface TTSCreateParams {
  text: string;
  /** Voice ID (number) or voice UUID/identifier (string) — the backend accepts either. */
  voiceId: number | string;
  /** Speech speed, 0.25–4.0 (default 1.0). */
  speed?: number;
  /** Output audio format (e.g. "mp3", "wav", "flac", "ogg"). Default: "mp3". */
  audioFormat?: string;
  /** BCP-47 / ISO language of the input text (auto-detected when omitted). */
  language?: string;
  /** Advanced directing controls (delivery mode, timestamps, normalization). */
  generationParams?: TTSGenerationParams;
}

// Voice Design Types
export interface VoiceDesignParams {
  /** Natural-language description of the voice to synthesize. */
  designPrompt: string;
  /** Optional target language for the previews. */
  language?: string;
  /** Text spoken in each preview sample. */
  previewText?: string;
  /** Number of candidate previews to generate (default 3). */
  numSamples?: number;
}

export interface VoiceDesignPreview {
  preview_id: string;
  audio_url: string;
  expires_at?: string | null;
  preview_text?: string | null;
}

export interface VoiceDesignResponse {
  previews: VoiceDesignPreview[];
  credits_charged: number;
}

export interface VoiceDesignPublishParams {
  /** `preview_id` of the candidate to keep (from a design() response). */
  previewId: string;
  /** Name for the published voice. */
  name: string;
  description?: string;
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
/**
 * @deprecated Every plan now gets the highest-quality music model at the
 * standard rate, so there is nothing to choose. Kept so existing code that
 * passes `quality` keeps compiling.
 */
export type MusicQuality = "standard" | "premium";

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
  /** Enable Chain-of-Thought reasoning for richer musical structure. Default: true */
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
  /**
   * @deprecated No longer needed: every plan now gets the highest-quality music
   * model at the standard rate. Still accepted for compatibility; only sent when set.
   */
  quality?: MusicQuality;
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
  /**
   * @deprecated No longer needed: every plan now gets the highest-quality music
   * model at the standard rate. Still accepted for compatibility; only sent when set.
   */
  quality?: MusicQuality;
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
  /**
   * @deprecated No longer needed: every plan now gets the highest-quality music
   * model at the standard rate. Still accepted for compatibility; only sent when set.
   */
  quality?: MusicQuality;
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
  /**
   * @deprecated No longer needed: every plan now gets the highest-quality music
   * model at the standard rate. Still accepted for compatibility; only sent when set.
   */
  quality?: MusicQuality;
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

// Score-first music — AudioMusic v3
//
// Every v3 track starts as an editable score in ABC notation; audio is
// rendered from the score. There is no `duration`: length follows the lyrics
// and the score.

/** How much is written as a score first: "full" (melody + harmony) or "melody" (the tune alone). */
export type MusicV3Cot = "full" | "melody";

/** Which v3 entry point produced a job. */
export type MusicV3Workflow = "generate" | "plan" | "edit" | "revise";

/** A bar range, numbered from 1, both ends included. */
export interface MusicV3Bars {
  start: number;
  end: number;
}

/** Params for `music.compose()` → `POST /api/v1/music/v3/plan` (score only, no audio). */
export interface MusicV3ComposeParams {
  /**
   * Genre, instrumentation, mood, tempo feel, vocal character (max 2000 chars).
   * Required unless `description` is given, in which case it defaults to the description.
   */
  style?: string;
  /** Your lyrics, optionally with [Verse]/[Chorus] tags. Omit for an instrumental. Cannot be combined with `description`. */
  lyrics?: string;
  /**
   * Describe the song (topic, mood, genre; 1-1000 chars) and AudioPod writes
   * the lyrics first, within the same charge. Cannot be combined with `lyrics`.
   */
  description?: string;
  /** "full" (default) or "melody". */
  cot?: MusicV3Cot;
  /** Reuse a seed to get closer to a previous result (0..2^31-1). */
  seed?: number;
  /** How literally to follow `style` (1.0-10.0, server default 3.0). */
  cfgScale?: number;
  /** Your own name for the track (max 200 chars). */
  displayName?: string;
  /**
   * With `description`: roughly how long the song should be, 30-300 seconds.
   * A guide, not a guarantee — the score's real length is `score.duration_seconds`.
   */
  targetSeconds?: number;
  /** With `description`: ISO 639-1 code to write the lyrics in. Defaults to the description's language, else English. */
  language?: string;
}

/** Params for `music.reviseScore()` → `POST /api/v1/music/v3/revise`. */
export interface MusicV3ReviseParams {
  /** The v3 job whose score you want revised. */
  sourceJobId: number;
  /** What to change, in plain English (1-500 chars). */
  instruction: string;
  /** Limit the change to one section by label (max 60 chars): "chorus" for every chorus, "chorus 2" for the second. */
  section?: string;
  /** Limit the change to a bar range (numbered from 1, inclusive, 1-10000). */
  bars?: MusicV3Bars;
  /** Permit the revision to change the tempo (off by default). */
  allowTempoChange?: boolean;
  /** Your own name for the revised score (max 200 chars). */
  displayName?: string;
  /**
   * Sent as the `Idempotency-Key` header (max 200 chars). A retry with the same
   * key within 10 minutes returns the first result and is not charged again.
   */
  idempotencyKey?: string;
}

/** Params for `music.recordScore()` → `POST /api/v1/music/v3/edit` (renders audio). */
export interface MusicV3RecordParams {
  /** The job the score came from. */
  sourceJobId: number;
  /**
   * The COMPLETE score in ABC notation (not a fragment). Omit to record the
   * source job's own score as it is (the SDK fetches it with `getScore()`).
   */
  abc?: string;
  /** Replacement style text; omit to reuse the source's. */
  style?: string;
  /** Replacement lyrics; omit to reuse the source's. */
  lyrics?: string;
  /** "melody" (server default) lets the arrangement follow the tune freely; "full" holds it to the written harmony. */
  cot?: MusicV3Cot;
  seed?: number;
  cfgScale?: number;
  displayName?: string;
  /** Permit the score to change the source's tempo (off by default on the server). */
  allowTempoChange?: boolean;
}

/** Params for `music.generateV3()` → `POST /api/v1/music/v3/generate` (score + audio). */
export interface MusicV3GenerateParams {
  style: string;
  /** Lyrics; omit for an instrumental. Song length follows the lyrics. */
  lyrics?: string;
  /** An existing complete score (ABC) to render instead of writing one. */
  abc?: string;
  cot?: MusicV3Cot;
  seed?: number;
  cfgScale?: number;
  displayName?: string;
}

export interface MusicV3ListParams {
  skip?: number;
  limit?: number;
  /** Only jobs from one entry point. */
  workflow?: MusicV3Workflow;
  /** Only versions derived from this job (one lineage). */
  sourceJobId?: number;
}

export interface MusicV3WaitOptions {
  /** Max time to wait, in ms. Default: 15 minutes. */
  timeout?: number;
  /** Time between polls, in ms. Default: 5000. */
  pollInterval?: number;
}

/** The editable score attached to a v3 job. */
export interface MusicV3Score {
  /** The score itself, in ABC notation. */
  abc?: string | null;
  abc_url?: string | null;
  midi_url?: string | null;
  /** True once a score exists and can be sent back for a recording. */
  editable: boolean;
  /** "plan" (written by AudioMusic) or "user" (you supplied it). */
  source?: string | null;
  /** How long the music in this score runs, in seconds. */
  duration_seconds?: number | null;
}

/** Notation-against-notation comparison with the score a job was derived from. */
export interface MusicV3ScoreComparison {
  comparable: boolean;
  notes_and_timing_preserved: boolean;
  /** Any of "pitches", "rhythm", "chords", "tempo", "structure". */
  changed: string[];
  tempo_change_allowed: boolean;
  /**
   * On a revision: per voice (e.g. "Vocal", "Ins"), the bar ranges of the new
   * score that differ from the source, as [start, end] pairs numbered from 1,
   * inclusive. Absent on an edit.
   */
  changed_bars?: Record<string, Array<[number, number]>> | null;
}

export interface MusicV3Diagnostics {
  warnings: string[];
  score_error?: string | null;
  details: Record<string, unknown>;
  truncated: Record<string, boolean>;
  review_recommended: boolean;
}

/** What a v3 job cost: a small score charge plus the music priced from the score. */
export interface MusicV3Billing {
  plan_credits?: number | null;
  render_credits?: number | null;
  total_credits?: number | null;
  score_seconds?: number | null;
  delivered_seconds?: number | null;
}

/** A v3 job: status, audio, score, diagnostics and billing. */
export interface MusicV3Job {
  job_id: number;
  workflow: MusicV3Workflow;
  status: JobStatus;
  progress?: number | null;
  display_name?: string | null;
  style?: string | null;
  lyrics?: string | null;
  /** Who wrote `lyrics`: "audiopod" (from your description) or "user". Absent for instrumentals. */
  lyrics_source?: "audiopod" | "user" | null;
  /** The length asked for on a described plan, if any. */
  target_seconds?: number | null;
  cot?: MusicV3Cot | null;
  audio_url?: string | null;
  audio_urls: Record<string, string>;
  duration_seconds?: number | null;
  score?: MusicV3Score | null;
  score_comparison?: MusicV3ScoreComparison | null;
  diagnostics: MusicV3Diagnostics;
  billing: MusicV3Billing;
  source_job_id?: number | null;
  error_message?: string | null;
  /** A one-sentence note on the result — on a revision, what changed. */
  note?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
}

export interface MusicV3Availability {
  /** Whether AudioMusic v3 is offered. Hide the v3 surface when false. */
  available: boolean;
  /** Whether plain-English score revision (`reviseScore`) is offered. Hide revise controls when false. */
  revise: boolean;
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

/** Curated stem bundles for the advanced (45-instrument) catalog. */
export type StemPackage = "essential" | "producer" | "studio" | "mastering";

/**
 * Advanced stem extraction over the full instrument catalog.
 *
 * Supply exactly ONE selection mode: `package` (a curated bundle),
 * `singleStem` (isolate one instrument), `multiStemCount` (top-N split),
 * `customStems` (an explicit list), or `excludeStems` (everything except the
 * listed instruments, returned as one combined track). `targetStems` names the
 * instruments to isolate when using a targeted method.
 */
export interface StemExtractionAdvancedParams {
  /** Path to a local audio file. */
  file?: string;
  /** URL of audio/video (mutually exclusive with `file`). */
  url?: string;
  /** Separation method (default: "hierarchical"). */
  method?: string;
  /** Curated bundle: essential (6) / producer (10) / studio (14) / mastering (18+). */
  package?: StemPackage | string;
  /** Instruments to isolate. Array or a JSON-array string. */
  targetStems?: string[] | string;
  /** Instruments to exclude; returns one combined "everything-else" track. */
  excludeStems?: string[] | string;
  /** Two-stem split mode, e.g. "vocals" / "instrumental". */
  twoStemsMode?: string;
  /** Single instrument to target. */
  targetInstrument?: string;
  /** Isolate exactly one named stem. */
  singleStem?: string;
  /** Return the top-N most prominent stems. */
  multiStemCount?: number;
  /** Explicit list of stems to return. Array or a JSON-array string. */
  customStems?: string[] | string;
}

export interface StemCatalogEntry {
  id?: string;
  name?: string;
  required_tier?: string;
  public_tier?: string;
  [key: string]: any;
}

// Denoiser Types
export interface DenoiseParams {
  file?: string;
  url?: string;
  /**
   * Quality mode: "balanced" (fastest), "studio" (broadcast and podcast
   * quality, the server default) or "ultra" (highest fidelity).
   */
  mode?: 'balanced' | 'studio' | 'ultra';
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

// Audio-to-MIDI Types
export type MidiStem = "vocals" | "bass" | "guitar" | "piano" | "other" | "drums";

/** Tunables forwarded to AudioPod's audio-to-MIDI engine. */
export interface MidiConvertOptions {
  onset_threshold?: number;
  frame_threshold?: number;
  min_note_len_ms?: number;
  /** BPM override; omit/null to auto-detect via beat tracking. */
  tempo_bpm?: number | null;
}

export interface MidiConvertParams {
  /** Path to local audio file */
  file?: string;
  /** URL of audio/video to convert (alternative to file) */
  url?: string;
  /** Stems to transcribe. Defaults to ["bass", "vocals", "piano"] — the
   * strongest instruments — when omitted. "guitar" is supported but
   * opt-in/experimental (over-detects on busy mixes); pass it explicitly.
   * "drums" and "other" are accepted but always come back in
   * `skipped_stems` — not transcribed. */
  stems?: MidiStem[];
  options?: MidiConvertOptions;
}

export interface MidiFromStemsParams {
  /** Subset of the source job's stems to transcribe (default: all of them —
   * drums/other still land in `skipped_stems`; guitar is opt-in/experimental). */
  stems?: MidiStem[];
  options?: MidiConvertOptions;
}

export interface MidiJob {
  id: number;
  status: JobStatus;
  progress?: number;
  /** "split" | "transcribe" | "merge" */
  stage?: string;
  /** "standalone" | "from_stem_job" */
  mode?: string;
  source_job_id?: number;
  stems_requested?: string[];
  /** Per-stem MIDI download URLs */
  midi_urls?: Record<string, string>;
  /** Merged multitrack MIDI download URL */
  merged_midi_url?: string;
  /** Separated stem audio download URLs (standalone mode) */
  stem_urls?: Record<string, string>;
  detected_tempo_bpm?: number;
  skipped_stems?: string[];
  failed_stems?: Record<string, string>;
  error_message?: string;
  duration?: number;
  original_filename?: string;
  created_at?: string;
  completed_at?: string;
}

// Audio Reader Types
export interface ReaderEstimateParams {
  /** URL of an article/page to read aloud. */
  url?: string;
  /** Raw text/HTML content to read aloud (alternative to `url`). */
  content?: string;
  /** Narration voice id. */
  voice?: string;
}

export interface ReaderGenerateParams {
  /** URL of an article/page to read aloud. */
  url?: string;
  /** Raw text/HTML content to read aloud (alternative to `url`). */
  content?: string;
  /** Title for the generated audio. */
  title?: string;
  /** Narration voice id. */
  voice?: string;
  /** Callback URL notified when the job completes. */
  webhookUrl?: string;
  /** Show AudioPod branding on the embed player (default true). */
  showBranding?: boolean;
}

export interface ReaderEstimate {
  is_premium: boolean;
  estimated_credits: number;
  word_count: number;
  char_count: number;
  measured: boolean;
  title?: string | null;
  note?: string | null;
}

export interface ReaderJob {
  id: number;
  status: JobStatus | string;
  progress: number;
  title?: string | null;
  word_count?: number | null;
  audio_url?: string | null;
  embed_url?: string | null;
  embed_html?: string | null;
  audio_duration_seconds?: number | null;
  error?: string | null;
  created_at: string;
  completed_at?: string | null;
}

// Podcast Studio Types
export type PodcastQualityPreset = "quick" | "standard" | "premium";
export type PodcastSpeakerRole = "Host" | "Expert" | "Guest" | "Narrator";
export type PodcastVoiceType = "preset" | "cloned" | "standard";
export type PodcastSegmentSize = "short" | "medium" | "long";
/** Grounding source kinds for a podcast project. */
export type PodcastSourceType = "file" | "text" | "url" | "youtube";

export interface PodcastSpeakerCreate {
  name: string;
  role: PodcastSpeakerRole;
  /** "preset" | "cloned" | "standard" (default resolved server-side). */
  voiceType?: PodcastVoiceType;
  /** Provider voice id (string). */
  voiceId?: string;
  /** AudioPod voice-profile id (numeric reference). */
  voiceRefId?: number;
  language?: string;
  useTurbo?: boolean;
  backstory?: string;
  personality?: string;
}

export interface PodcastProjectCreateParams {
  title: string;
  topic: string;
  briefing?: string;
  keyPoints?: string[];
  language?: string;
  qualityPreset?: PodcastQualityPreset;
  targetDurationMinutes?: number;
  speakers: PodcastSpeakerCreate[];
  episodeProfileId?: string;
  briefingSuffix?: string;
}

export interface PodcastProjectUpdateParams {
  title?: string;
  topic?: string;
  briefing?: string;
  keyPoints?: string[];
  language?: string;
  qualityPreset?: PodcastQualityPreset;
  targetDurationMinutes?: number;
}

export interface PodcastSegment {
  title: string;
  description?: string;
  size?: PodcastSegmentSize;
}

export interface PodcastDialogue {
  speaker: string;
  text: string;
  useTurbo?: boolean;
}

export interface PodcastEpisodeProfileCreateParams {
  name: string;
  description?: string;
  defaultBriefing?: string;
  numSegments?: number;
  tone?: string;
  format?: string;
}

export interface PodcastEpisodeProfileUpdateParams {
  name?: string;
  description?: string;
  defaultBriefing?: string;
  numSegments?: number;
  tone?: string;
  format?: string;
}

export interface PodcastSpeakerProfileCreateParams {
  name: string;
  speakerName: string;
  voiceId?: number;
  backstory?: string;
  personality?: string;
  role?: PodcastSpeakerRole;
  language?: string;
}

export interface PodcastSpeakerProfileUpdateParams {
  name?: string;
  speakerName?: string;
  voiceId?: number;
  backstory?: string;
  personality?: string;
  role?: PodcastSpeakerRole;
  language?: string;
}

export interface PodcastSpeakerUpdateParams {
  name?: string;
  role?: PodcastSpeakerRole;
  voiceRefId?: number;
  backstory?: string;
  personality?: string;
  language?: string;
}

export interface PodcastOutlineGenerateParams {
  numSegments?: number;
  focusAreas?: string[];
  targetDurationMinutes?: number;
}

export interface PodcastSourceParams {
  /** "file" | "text" | "url" | "youtube". */
  sourceType: PodcastSourceType;
  /** Raw text (for sourceType "text"). */
  text?: string;
  /** URL (for sourceType "url" / "youtube"). */
  url?: string;
  /** Local file path (for sourceType "file"). */
  file?: string;
}

export interface PodcastRegenerateDialogueParams {
  dialogueId: string;
  newText?: string;
}

export interface PodcastGenerationProgress {
  status: string;
  progress_percentage: number;
  dialogues_completed: number;
  dialogues_total: number;
  current_dialogue?: string | null;
  estimated_time_remaining_seconds?: number | null;
  error_message?: string | null;
}

/** A podcast project. The API returns a rich object; fields vary by lifecycle
 *  stage, so only `id` is guaranteed here. */
export interface PodcastProject {
  id: string;
  [key: string]: any;
}
