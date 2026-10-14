/**
 * Denoiser Service - Audio Noise Reduction
 */

import type AudioPod from '../client';
import type { DenoiseParams, DenoiseJob, PaginationParams } from '../types';

const POLL_INTERVAL = 3000;
const DEFAULT_TIMEOUT = 600000; // 10 minutes

export class Denoiser {
  constructor(private client: AudioPod) {}

  /**
   * Denoise audio/video
   * 
   * @example
   * ```typescript
   * // Denoise from file
   * const job = await client.denoiser.create({
   *   file: './noisy-audio.mp3',
   * });
   * 
   * // Denoise from URL
   * const job = await client.denoiser.create({
   *   url: 'https://example.com/audio.mp3',
   * });
   * ```
   */
  async create(params: DenoiseParams): Promise<DenoiseJob> {
    // `POST /denoiser/denoise` takes form fields (file | url, quality_mode),
    // so a URL job must go as a form too: a JSON body arrives with no URL
    // and is rejected (PLAT-3976, same class as PLAT-2597).
    const fields = params.mode ? { quality_mode: params.mode } : undefined;

    if (params.file) {
      return this.client.upload('/api/v1/denoiser/denoise', params.file, 'file', fields);
    }

    if (params.url) {
      return this.client.postForm('/api/v1/denoiser/denoise', {
        url: params.url,
        ...fields,
      });
    }

    throw new Error('Either file or url must be provided');
  }

  /**
   * Get a denoise job by ID
   */
  async get(jobId: number): Promise<DenoiseJob> {
    return this.client.get(`/api/v1/denoiser/jobs/${jobId}`);
  }

  /**
   * List denoise jobs
   */
  async list(params: PaginationParams & { status?: string } = {}): Promise<DenoiseJob[]> {
    return this.client.get('/api/v1/denoiser/jobs', {
      skip: params.skip ?? 0,
      limit: params.limit ?? 50,
      status: params.status,
    });
  }

  /**
   * Delete a denoise job
   */
  async delete(jobId: number): Promise<void> {
    await this.client.delete(`/api/v1/denoiser/jobs/${jobId}`);
  }

  /**
   * Wait for denoising to complete
   */
  async waitForCompletion(jobId: number, timeout: number = DEFAULT_TIMEOUT): Promise<DenoiseJob> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const job = await this.get(jobId);

      if (job.status === 'COMPLETED') {
        return job;
      }

      if (job.status === 'FAILED') {
        throw new Error(`Denoising failed: ${job.error_message || 'Unknown error'}`);
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    }

    throw new Error(`Denoising timed out after ${timeout / 1000}s`);
  }

  /**
   * Denoise and wait for completion
   */
  async denoise(params: DenoiseParams): Promise<DenoiseJob> {
    const job = await this.create(params);
    return this.waitForCompletion(job.id);
  }
}




