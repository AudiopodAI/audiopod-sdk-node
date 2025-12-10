/**
 * Music Service - Music generation
 */

import { AudioPodClient } from '../client';
import { MusicGenerationRequest, Job } from '../types';

export class MusicService {
  constructor(private client: AudioPodClient) {}

  /**
   * Generate music from text prompt
   */
  async generate(request: MusicGenerationRequest): Promise<Job> {
    const response = await this.client.request('POST', '/api/v1/music/generate', {
      data: {
        prompt: request.prompt,
        duration: request.duration || 30,
        model: request.model || 'musicgen',
      },
    });

    if (request.waitForCompletion) {
      return this.waitForCompletion(response.id, request.timeout || 600);
    }

    return response;
  }

  /**
   * Get music generation job status
   */
  async getJob(jobId: number): Promise<Job> {
    return this.client.request('GET', `/api/v1/music/status/${jobId}`);
  }

  /**
   * List music generation jobs
   */
  async listJobs(skip: number = 0, limit: number = 50): Promise<Job[]> {
    return this.client.request('GET', '/api/v1/music/jobs', {
      params: { skip, limit },
    });
  }

  private async waitForCompletion(jobId: number, timeout: number = 600): Promise<Job> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout * 1000) {
      const job = await this.getJob(jobId);

      if (job.status === 'COMPLETED') {
        return job;
      } else if (job.status === 'FAILED') {
        throw new Error(`Job failed: ${job.error_message || 'Unknown error'}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    throw new Error(`Job ${jobId} timed out after ${timeout}s`);
  }
}

