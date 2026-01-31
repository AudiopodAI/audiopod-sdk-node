/**
 * Voice Service - Voice Cloning & Text-to-Speech
 */

import type AudioPod from '../client';
import type { Voice as VoiceType, VoiceCreateParams, TTSCreateParams, TTSJob } from '../types';

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
    return this.client.post(`/api/v1/voice/voices/${params.voiceId}/generate`, {
      input_text: params.text,
      speed: params.speed ?? 1.0,
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
    const job = await this.speak(params);
    return this.waitForCompletion(job.id);
  }
}




