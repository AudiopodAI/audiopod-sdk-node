/**
 * Denoiser Service - Audio noise reduction
 */

import { AudioPodClient } from '../client';
import { Job } from '../types';

export class DenoiserService {
  constructor(private client: AudioPodClient) {}

  /**
   * Remove noise from audio
   */
  async denoise(options: {
    audioFile?: string;
    url?: string;
    mode?: 'balanced' | 'studio' | 'ultra';
    waitForCompletion?: boolean;
    timeout?: number;
  }): Promise<Job> {
    let response: Job;

    if (options.audioFile) {
      const formData = this.client.prepareFileUpload(options.audioFile, 'file');
      formData.append('mode', options.mode || 'balanced');

      response = await this.client.request('POST', '/api/v1/denoise', { formData });
    } else {
      response = await this.client.request('POST', '/api/v1/denoise', {
        data: {
          url: options.url,
          mode: options.mode || 'balanced',
        },
      });
    }

    if (options.waitForCompletion) {
      return this.waitForCompletion(response.id, options.timeout || 300);
    }

    return response;
  }

  /**
   * Get denoise job status
   */
  async getJob(jobId: number): Promise<Job> {
    return this.client.request('GET', `/api/v1/denoise/status/${jobId}`);
  }

  private async waitForCompletion(jobId: number, timeout: number = 300): Promise<Job> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout * 1000) {
      const job = await this.getJob(jobId);

      if (job.status === 'COMPLETED') {
        return job;
      } else if (job.status === 'FAILED') {
        throw new Error(`Job failed: ${job.error_message || 'Unknown error'}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    throw new Error(`Job ${jobId} timed out after ${timeout}s`);
  }
}

