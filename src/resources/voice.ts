/**
 * Voice Service - Voice Cloning & Text-to-Speech
 */

import type AudioPod from '../client';
import type * as W from '../workflow-contracts';
import { canonicalUuid, uuidFields, callerScope } from '../workflow-utils';
import type {
  VoiceOperation, VoiceCapabilities, ReferenceDiagnosticsParams, ReferenceDiagnostics,
  PronunciationScope, PronunciationPolicy, PronunciationPolicyWrite, PronunciationResolution,
  ContextualAuditionParams, ContextualAuditionQuote, ConfirmContextualAuditionParams,
} from '../voice-foundations';
import type {
  Voice as VoiceType,
  VoiceCreateParams,
  TTSCreateParams,
  TTSJob,
  VoiceDesignParams,
  VoiceDesignResponse,
  VoiceDesignPublishParams,
} from '../types';

const POLL_INTERVAL = 2000;
const DEFAULT_TIMEOUT = 300000; // 5 minutes

export class Voice {
  constructor(private client: AudioPod) {}

  /**
   * List all voices
   */
  async list(): Promise<VoiceType[]> {
    return this.client.get('/api/v1/voice/voice-profiles');
  }

  /**
   * Get a voice by ID
   */
  async get(voiceId: number | string): Promise<VoiceType> {
    return this.client.get(`/api/v1/voice/voices/${voiceId}/status`);
  }

  /** Effective capabilities for this caller and operation; unknown is not ready. */
  async capabilities(voiceId: number | string, operation: VoiceOperation = 'tts'): Promise<VoiceCapabilities> {
    return this.client.get(`/api/v1/voice/voices/${encodeURIComponent(String(voiceId))}/capabilities`, { operation });
  }

  /** Measure a selected reference window without transcription or clone registration. */
  async referenceDiagnostics(params: ReferenceDiagnosticsParams): Promise<ReferenceDiagnostics> {
    return this.client.upload('/api/v1/voice/reference/diagnostics', params.audioFile, 'file', {
      crop_start_seconds: params.cropStartSeconds,
      crop_end_seconds: params.cropEndSeconds,
    });
  }

  /** Read the caller's policy. Missing overrides inherit without creating a row. */
  async getPronunciation(scope: PronunciationScope): Promise<PronunciationPolicy> {
    return this.client.get('/api/v1/voice/pronunciation', callerScope(scope));
  }

  /** Save using the last observed version; a concurrent edit returns HTTP 409. */
  async setPronunciation(scope: PronunciationScope, policy: PronunciationPolicyWrite): Promise<PronunciationPolicy> {
    return this.client.put(`/api/v1/voice/pronunciation?${scopeQuery(callerScope(scope))}`, policy);
  }

  /** Reset to inheritance. The server preserves the version tombstone. */
  async resetPronunciation(scope: PronunciationScope, expectedVersion: number): Promise<PronunciationPolicy> {
    return this.client.delete(`/api/v1/voice/pronunciation?${scopeQuery(callerScope(scope))}&expected_version=${expectedVersion}`);
  }

  /** Resolve the exact caller/project rules and resulting speech text without spending. */
  async resolvePronunciation(scope: PronunciationScope, text = ''): Promise<PronunciationResolution> {
    return this.client.post('/api/v1/voice/pronunciation/resolve', { ...callerScope(scope), text });
  }

  /** Quote a short excerpt using the existing canonical speech billing lane. */
  async quoteAudition(voiceId: number | string, params: ContextualAuditionParams): Promise<ContextualAuditionQuote> {
    return this.client.post(`/api/v1/voice/auditions/${encodeURIComponent(String(voiceId))}/quote`, callerScope(params));
  }

  /** Explicitly confirm the latest quote. Never confirms or retries stale settings for you. */
  async audition(voiceId: number | string, params: ConfirmContextualAuditionParams): Promise<TTSJob & { audition: Omit<ContextualAuditionQuote, 'spoken_text'> }> {
    if (params.confirm !== true) throw new TypeError('Explicit confirmation is required');
    params = { ...callerScope(params), idempotency_key: canonicalUuid(params.idempotency_key) };
    const job = await this.client.post<TTSJob & { audition: Omit<ContextualAuditionQuote, 'spoken_text'> }>(`/api/v1/voice/auditions/${encodeURIComponent(String(voiceId))}`, params);
    return compatibleJobId(job);
  }

  /** Signed-in grants are explicit; API keys can consume a prior owner grant. */
  createConsent(body: W.CreateVoiceConsent): Promise<W.VoiceConsent> {
    return this.client.post('/api/v1/voice/voice-consents', body.project_kind === 'dubbing' ? uuidFields(body) : body);
  }
  getConsent(id: string): Promise<W.VoiceConsent> { return this.client.get(`/api/v1/voice/voice-consents/${canonicalUuid(id)}`); }
  previewConsentInvitation(token: string): Promise<W.VoiceConsent> { return this.client.get(`/api/v1/voice/voice-consents/invitations/${encodeURIComponent(token)}`); }
  acceptConsentInvitation(body: { invitation_token: string; consent_version: string; confirm: boolean }): Promise<W.VoiceConsent> { return this.client.post('/api/v1/voice/voice-consents/invitations/accept', body); }
  revokeConsent(id: string, expectedRevision: number): Promise<W.VoiceConsent> { return this.client.post(`/api/v1/voice/voice-consents/${canonicalUuid(id)}/revoke`, { expected_revision: expectedRevision }); }
  admitReference({ audioFile, ...body }: W.AdmitVoiceReference): Promise<W.VoiceReferenceAdmission> {
    return this.client.upload('/api/v1/voice/reference/admissions', audioFile, 'file', { ...body, consent_id: canonicalUuid(body.consent_id) });
  }
  registerReference({ audioFile, ...body }: W.RegisterVoiceReference): Promise<W.VoiceRegistration> {
    return this.client.upload('/api/v1/voice/voice-profiles/register', audioFile, 'file', { ...body, idempotency_key: canonicalUuid(body.idempotency_key) });
  }
  registrationStatus(idempotencyKey: string): Promise<W.VoiceRegistration> { return this.client.get(`/api/v1/voice/voice-profiles/registrations/${canonicalUuid(idempotencyKey)}`); }
  updateMetadata(id: number | string, body: W.VoiceMetadata): Promise<VoiceType> { return this.client.patch(`/api/v1/voice/voices/${encodeURIComponent(String(id))}`, body); }

  /**
   * @deprecated New clones require createConsent, admitReference and registerReference.
   * Current servers reject this legacy request with consent_admission_required.
   */
  async create(params: VoiceCreateParams): Promise<VoiceType> {
    return this.client.upload('/api/v1/voice/voice-profiles', params.audioFile, 'file', {
      name: params.name,
      description: params.description,
    });
  }

  /**
   * Delete a voice
   */
  async delete(voiceId: number): Promise<void> {
    await this.client.delete(`/api/v1/voice/voices/${voiceId}`);
  }

  /**
   * Generate speech from text
   * 
   * @example
   * ```typescript
   * const job = await client.voice.speak({
   *   text: 'Hello, world!',
   *   voiceId: 123,
   * });
   * ```
   */
  async speak(params: TTSCreateParams): Promise<TTSJob> {
    // The backend `POST /voice/voices/{id}/generate` declares its params as
    // FastAPI `Form(...)` fields (input_text, speed, ...), so it expects
    // multipart/form-data — a JSON body is rejected with 422. Use postForm,
    // not post (PLAT-2597).
    //
    // `generation_params` is a JSON-encoded string of directing controls
    // (delivery mode, timestamp granularity, text normalization); the API
    // whitelists the honored keys.
    const job = await this.client.postForm<TTSJob>(`/api/v1/voice/voices/${params.voiceId}/generate`, {
      input_text: params.text,
      speed: params.speed ?? 1.0,
      audio_format: params.audioFormat,
      language: params.language,
      generation_params: params.generationParams
        ? JSON.stringify(params.generationParams)
        : undefined,
      pronunciation_project_kind: params.pronunciationProjectKind,
      pronunciation_project_id: params.pronunciationProjectId,
      pronunciation_identity: params.pronunciationIdentity,
    });
    return compatibleJobId(job);
  }

  /**
   * Get TTS job status
   */
  async getJob(jobId: number): Promise<TTSJob> {
    return compatibleJobId(await this.client.get<TTSJob>(`/api/v1/voice/tts-jobs/${jobId}/status`));
  }

  /**
   * Wait for TTS job to complete
   */
  async waitForCompletion(jobId: number, timeout: number = DEFAULT_TIMEOUT): Promise<TTSJob> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const job = await this.getJob(jobId);
      const status = job.status?.toLowerCase();

      if (status === 'completed') {
        return job;
      }

      if (status === 'failed' || status === 'error') {
        throw new Error(`TTS generation failed: ${job.error_message || 'Unknown error'}`);
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    }

    throw new Error(`TTS generation timed out after ${timeout / 1000}s`);
  }

  /**
   * Generate speech and wait for completion
   */
  async generate(params: TTSCreateParams): Promise<TTSJob> {
    const job = await this.speak(params);
    return this.waitForCompletion(job.id);
  }

  /**
   * Design a brand-new voice from a text description. Returns candidate
   * previews — publish one with {@link Voice.publishDesign} to keep it.
   *
   * @example
   * ```typescript
   * const { previews } = await client.voice.design({
   *   designPrompt: 'a warm, gravelly late-night radio host in his 50s',
   *   numSamples: 3,
   * });
   * const voice = await client.voice.publishDesign({
   *   previewId: previews[0].preview_id,
   *   name: 'Midnight Host',
   * });
   * ```
   */
  async design(params: VoiceDesignParams): Promise<VoiceDesignResponse> {
    return this.client.post('/api/v1/voice/design', {
      design_prompt: params.designPrompt,
      language: params.language,
      preview_text: params.previewText,
      num_samples: params.numSamples,
    });
  }

  /**
   * Publish a designed-voice preview into a reusable voice profile.
   */
  async publishDesign(params: VoiceDesignPublishParams): Promise<VoiceType> {
    return this.client.post('/api/v1/voice/design/publish', {
      preview_id: params.previewId,
      name: params.name,
      description: params.description,
    });
  }
}

function scopeQuery(scope: PronunciationScope): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(scope)) {
    if (value !== undefined) query.set(key, value);
  }
  return query.toString();
}

function compatibleJobId<T extends TTSJob>(job: T): T {
  return job.id == null && typeof job.job_id === 'number' ? { ...job, id: job.job_id } : job;
}
