/**
 * Voice Service - Voice Cloning & Text-to-Speech
 */

import type AudioPod from '../client';
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
  async get(voiceId: number): Promise<VoiceType> {
    return this.client.get(`/api/v1/voice/voices/${voiceId}/status`);
  }

  /**
   * Create a new voice clone
   * 
   * @example
   * ```typescript
   * const voice = await client.voice.create({
   *   name: 'My Voice',
   *   audioFile: './sample.mp3',
   * });
   * ```
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
    return this.client.postForm(`/api/v1/voice/voices/${params.voiceId}/generate`, {
      input_text: params.text,
      speed: params.speed ?? 1.0,
      audio_format: params.audioFormat,
      language: params.language,
      generation_params: params.generationParams
        ? JSON.stringify(params.generationParams)
        : undefined,
    });
  }

  /**
   * Get TTS job status
   */
  async getJob(jobId: number): Promise<TTSJob> {
    return this.client.get(`/api/v1/voice/tts-jobs/${jobId}/status`);
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
    // The generate endpoint answers with `job_id`, not `id` (PLAT-3976).
    const job = (await this.speak(params)) as TTSJob & { job_id?: number };
    return this.waitForCompletion(job.id ?? job.job_id!);
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




