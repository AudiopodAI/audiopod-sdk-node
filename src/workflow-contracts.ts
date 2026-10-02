import type { VoiceReadiness, ReferenceDiagnostics } from './voice-foundations';

export type DubbingOutput = 'audio' | 'srt' | 'vtt' | 'video';
export type DubbingStatus = 'analyzing' | 'review_required' | 'generating' | 'export_partial' | 'settle_pending' | 'release_pending' | 'completed' | 'failed' | 'cancelled' | 'expired';
export type DubbingDelivery = 'stable' | 'balanced' | 'creative';
export interface RationalDuration { numerator: number; denominator: number }
export interface WorkflowReadiness { state: 'ready' | 'unavailable' | 'unknown'; reason_code: string | null; action: string | null }
export interface DubbingCapabilities { source_languages: string[]; target_languages: string[]; outputs: DubbingOutput[]; audio_formats: string[]; credits_per_source_second: number; billing_unit: 'account_credits'; readiness: WorkflowReadiness }
export interface DubbingSource { id: string; filename: string; source_duration: RationalDuration | null; has_video: boolean; expires_at: string | null; status: string; media_url: string | null; error_code: string | null }
export interface DubbingSettings { catalog_voice_id: number; audio_format?: 'mp3' | 'wav'; speed?: number; delivery_mode?: DubbingDelivery; background?: 'none' | 'preserve'; background_gain_db?: number }
export interface DubbingSegment { id: string; source_text: string; target_text: string; start_us: number; end_us: number; voice_id: number; speed?: number; delivery_mode?: DubbingDelivery }
export interface CreateDubbingProject { source_id: string; title: string; source_language: string; folder_id?: string | null }
export interface CreateDubbingEdition { target_language: string; settings: DubbingSettings; required_outputs?: DubbingOutput[] }
export interface SaveDubbingEdition { expected_revision: number; segments: DubbingSegment[]; settings: DubbingSettings; required_outputs: DubbingOutput[] }
export interface DubbingArtifact { kind: string; available: boolean; url: string | null; expires_at: string | null; classification: 'generated_original' | 'processed' }
export interface DubbingJob { id: string; edition_id: string; revision: number; status: DubbingStatus; stage: string; financial_disposition: 'held' | 'captured' | 'released'; required_credits: number; required_outputs: DubbingOutput[]; artifacts: DubbingArtifact[]; blockers: string[]; warnings: Record<string, unknown>[]; output_status: Array<{ kind: string; status: string; error_code: string | null }>; error_code: string | null; review_deadline: string | null; export_deadline: string | null; event_sequence: number }
export interface DubbingEdition { id: string; project_id: string; target_language: string; revision: number; settings: DubbingSettings; segments: DubbingSegment[]; required_outputs: DubbingOutput[]; owner_review_complete: boolean; latest_job?: DubbingJob | null; snapshot_stale?: { pronunciation: boolean; glossary: boolean } }
export interface DubbingProject { id: string; title: string; source_id: string; source: DubbingSource; source_language: string; folder_id: string | null; created_at: string; editions: DubbingEdition[] }
export interface DubbingQuote { edition_id: string; revision: number; action: 'analyze' | 'generate' | 'regenerate'; quote_identity: string; required_credits: number; additional_credits: number; billing_unit: 'account_credits'; credits_per_source_second: number; source_duration: RationalDuration; required_outputs: DubbingOutput[]; held_job_id: string | null; review_deadline: string | null; retranslate: boolean }
export interface DubbingConfirmation { edition_id: string; expected_revision: number; quote_identity: string; idempotency_key: string; retranslate?: boolean }
export interface AnalyzeDubbing { confirmations: DubbingConfirmation[]; confirm: true }
export interface GenerateDubbing { expected_revision: number; quote_identity: string; confirm: true }
export interface DubbingEvent { sequence: number; state: string; data: Record<string, unknown>; created_at: string }
export interface DubbingFolder { id: string; label: string; kind: 'client' | 'series' }
export interface GlossaryEntry { source: string; mode: 'preferred' | 'keep_unchanged'; preferred_target?: string | null; case_sensitive?: boolean }
export interface GlossaryScope { language: string; project_id?: string }
export interface GlossaryWrite { expected_version: number; mode: 'inherit' | 'override' | 'disable'; entries?: GlossaryEntry[] }
export interface DubbingGlossary { language: string; project_id: string | null; version: number; mode: 'inherit' | 'override' | 'disable'; entries: GlossaryEntry[] }
export interface DubbingTemplate { id: string; label: string; target_language: string; settings: Omit<DubbingSettings, 'catalog_voice_id'>; required_outputs: DubbingOutput[]; voice_selection_required: boolean }
export interface ProjectFromTemplate extends Omit<CreateDubbingProject, 'folder_id'>, CreateDubbingEdition { template_id: string; required_outputs: DubbingOutput[] }
export interface DubbingReviewGrant { id: string; edition_id: string; recipient_email: string; expires_at: string; revoked: boolean; approved: boolean; approved_revision: number | null; invitation_token?: string; review_path?: string }
export interface DubbingComment { id: string; revision: number; segment_id: string; position_us: number; body: string; created_at: string; recipient_email?: string }
export interface WriteDubbingComment { expected_revision: number; segment_id: string; position_us: number; body: string }
export interface DubbingReview { grant_id: string; expires_at: string; project_title: string; target_language: string; revision: number; state: 'ready' | 'waiting_for_revision'; approved: boolean; segments: Array<Pick<DubbingSegment, 'id' | 'target_text' | 'start_us' | 'end_us'>>; artifacts: Array<{ kind: string; url: string }>; comments: DubbingComment[] }
export interface UploadLimits { service: string; plan: string; max_upload_bytes: number; max_duration_s: number | null; multipart_threshold_bytes: number }
export interface PresignUpload { service: string; filename: string; content_type: string; size_bytes: number }
export interface PresignedUpload { upload_id: string; url: string; method: 'PUT'; headers: Record<string, string>; key_expires_in: number }
export type ConsentProjectKind = 'account' | 'tts' | 'podcast' | 'dubbing';
export const VOICE_CONSENT_VERSION = '2026-10-02.voice-consent.v1';
export interface CreateVoiceConsent { project_kind?: ConsentProjectKind; project_id?: string | null; source_id?: string | null; recording_sha256: string; window_sha256: string; prepared_sha256: string; reference_filename?: string | null; crop: { start_seconds: number; end_seconds: number }; consent_version: string; recipient_email?: string | null; confirm: boolean; allow_public_sharing?: boolean }
export interface VoiceConsent extends Omit<CreateVoiceConsent, 'confirm'> { id: string; state: 'awaiting_consent' | 'accepted' | 'revoked'; project_kind: ConsentProjectKind; project_id: string | null; source_id: string | null; consent_revision: number; reference_media: VoiceReadiness; invitation_expires_at: string; invitation_token: string | null; allow_public_sharing: boolean }
export interface AdmitVoiceReference { audioFile: string; consent_id: string; consent_revision: number; consent_version: string; transcription: string; confirm_transcription: boolean; replace_voice_id?: number; reference_revision?: number }
export interface VoiceReferenceAdmission { admission_token: string; expires_at: string; consent_id: string; consent_version: string; consent_revision: number; reference_revision: number; recording_sha256: string; reference: ReferenceDiagnostics; transcript_validation: VoiceReadiness }
export interface RegisterVoiceReference { audioFile: string; admission_token: string; idempotency_key: string; name: string; language_code?: string }
export interface VoiceRegistration { state: 'processing' | 'completed' | 'failed' | 'registration_uncertain' | 'cleanup_pending'; voice_id: number | null; voice_uuid: string | null; display_name: string | null; reference_revision: number | null; readiness: VoiceReadiness; error_code: string | null }
export interface VoiceMetadata { name?: string; description?: string; is_public?: boolean; gender?: string; age_group?: string; use_case?: string }
