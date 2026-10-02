/** Caller-scoped voice workflow contracts. UI locale does not set speech language. */
export type VoiceOperation = 'tts' | 'podcast' | 'audiobook' | 'multi_voice_tts' | 'audition';
export type PronunciationProjectKind = 'account' | 'tts' | 'podcast' | 'dubbing';

export interface VoiceReadiness {
  state: 'ready' | 'unavailable' | 'unknown';
  reason_code: string;
  action: 'continue' | 'recheck' | 'choose_voice' | 'wait' | 'adjust_reference';
}

export interface VoiceCapabilities {
  voice_id: number;
  voice_revision: string;
  operation: VoiceOperation;
  readiness: VoiceReadiness;
  controls: string[];
  languages: string[];
  formats: string[];
  timing: { word_timestamps: VoiceReadiness; fixed_segment_placement: VoiceReadiness };
  resolved_identity: string;
}

export interface PronunciationEntry {
  source: string;
  alias?: string;
  case_sensitive?: boolean;
  mode?: 'override' | 'disable';
}

export interface PronunciationScope {
  language: string;
  project_kind?: PronunciationProjectKind;
  project_id?: string;
}

export interface PronunciationPolicyWrite {
  expected_version: number;
  mode?: 'inherit' | 'override' | 'disable';
  entries?: PronunciationEntry[];
}

export interface PronunciationPolicy extends Omit<PronunciationScope, 'project_id'> {
  project_kind: PronunciationProjectKind;
  project_id: string | null;
  version: number;
  mode: 'inherit' | 'override' | 'disable';
  entries: PronunciationEntry[];
}

export interface ResolvedPronunciation {
  language: string;
  mode: 'inherit' | 'override' | 'disable';
  entries: PronunciationEntry[];
  versions: Record<string, number>;
  identity: string;
}

export interface PronunciationResolution {
  snapshot: ResolvedPronunciation;
  spoken_text: string;
  changed: boolean;
}

export interface ContextualAuditionParams {
  text: string;
  language: string;
  audio_format?: string;
  speed?: number;
  generation_params?: Record<string, unknown>;
  project_kind?: PronunciationProjectKind;
  project_id?: string;
}

export interface ContextualAuditionQuote {
  billing_lane: string;
  required_credits: number | null;
  cost_cents: number | null;
  quote_identity: string;
  text_length: number;
  voice_id: number;
  voice_revision: string;
  pronunciation_identity: string;
  generation_params: Record<string, unknown>;
  spoken_text: string;
}

export interface ConfirmContextualAuditionParams extends ContextualAuditionParams {
  confirm: true;
  quote_identity: string;
  /** Reuse for a transport retry; use a new UUID for a new confirmed audition. */
  idempotency_key: string;
}

export interface ReferenceDiagnosticsParams {
  audioFile: string;
  cropStartSeconds?: number;
  cropEndSeconds?: number;
}

export interface ReferenceDiagnostics {
  duration_seconds: number;
  sample_rate: number;
  silence_fraction: number;
  clipping_fraction: number;
  peak_dbfs: number | null;
  rms_dbfs: number | null;
  usable_windows: Array<{ start_seconds: number; end_seconds: number }>;
  warning_codes: string[];
  raw_sha256: string;
  window_sha256: string;
  prepared_sha256: string | null;
  crop: { start_seconds: number; end_seconds: number };
  transcript_validation: VoiceReadiness;
}
