/**
 * Music Service - AI Music Generation
 */

import type AudioPod from '../client';
import type { MusicCreateParams, MusicJob, MusicTask, PaginationParams } from '../types';

const POLL_INTERVAL = 5000;
const DEFAULT_TIMEOUT = 600000; // 10 minutes

export class Music {
  constructor(private client: AudioPod) {}

  /**
   * Generate music from text
   * 
   * @example
   * ```typescript
   * const job = await client.music.create({
   *   prompt: 'Upbeat electronic dance music',
   *   duration: 30,
   * });
   * ```
   */
  async create(params: MusicCreateParams): Promise<MusicJob> {
    const task = params.task || (params.lyrics ? 'text2music' : 'prompt2instrumental');
    const endpoint = `/api/v1/music/${task}`;

    return this.client.post(endpoint, {
      prompt: params.prompt,
      lyrics: params.lyrics,
      audio_duration: params.duration ?? 30,
      display_name: params.displayName,
      genre_preset: params.genre,
    });
  }

  /**
   * Generate instrumental music
   */
  async instrumental(prompt: string, duration: number = 30): Promise<MusicJob> {
    return this.create({ prompt, duration, task: 'prompt2instrumental' });
  }

  /**
   * Generate a song with vocals
   */
  async song(prompt: string, lyrics: string, duration: number = 60): Promise<MusicJob> {
    return this.create({ prompt, lyrics, duration, task: 'text2music' });
  }

  /**
   * Generate rap music
   */
  async rap(prompt: string, lyrics: string, duration: number = 60): Promise<MusicJob> {
    return this.create({ prompt, lyrics, duration, task: 'text2rap' });
  }

  /**
   * Get a music job by ID
   */
  async get(jobId: number): Promise<MusicJob> {
    return this.client.get(`/api/v1/music/jobs/${jobId}/status`);
  }

  /**
   * List music jobs
   */
  async list(params: PaginationParams & { task?: MusicTask; status?: string } = {}): Promise<MusicJob[]> {
    return this.client.get('/api/v1/music/jobs', {
      skip: params.skip ?? 0,
      limit: params.limit ?? 50,
      task: params.task,
      status: params.status,
    });
  }

  /**
   * Delete a music job
   */
  async delete(jobId: number): Promise<void> {
    await this.client.delete(`/api/v1/music/jobs/${jobId}`);
  }

  /**
   * Wait for a music job to complete
   */
  async waitForCompletion(jobId: number, timeout: number = DEFAULT_TIMEOUT): Promise<MusicJob> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const job = await this.get(jobId);

      if (job.status === 'COMPLETED') {
        return job;
      }

      if (job.status === 'FAILED') {
        throw new Error(`Music generation failed: ${job.error_message || 'Unknown error'}`);
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    }

    throw new Error(`Music generation timed out after ${timeout / 1000}s`);
  }

  /**
   * Generate music and wait for completion
   */
  async generate(params: MusicCreateParams): Promise<MusicJob> {
    const job = await this.create(params);
    return this.waitForCompletion(job.id);
  }

  /**
   * Get available genre presets
   */
  async getPresets(): Promise<any> {
    return this.client.get('/api/v1/music/presets');
  }
}




