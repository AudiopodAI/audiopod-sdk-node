/**
 * Speaker Service - Speaker Diarization & Separation
 */

import type AudioPod from '../client';
import type { SpeakerDiarizeParams, SpeakerJob, PaginationParams } from '../types';

const POLL_INTERVAL = 3000;
const DEFAULT_TIMEOUT = 600000; // 10 minutes

export class Speaker {
  constructor(private client: AudioPod) {}

  /**
   * Create a speaker diarization job
   * 
   * @example
   * ```typescript
   * // Diarize from file
   * const job = await client.speaker.diarize({
   *   file: './meeting.mp3',
   *   numSpeakers: 3,
   * });
   * 
   * // Diarize from URL
   * const job = await client.speaker.diarize({
   *   url: 'https://youtube.com/watch?v=...',
   * });
   * ```
   */
  async diarize(params: SpeakerDiarizeParams): Promise<SpeakerJob> {
    if (params.file) {
      return this.client.upload('/api/v1/speaker/diarize', params.file, 'file', {
        num_speakers: params.numSpeakers,
      });
    }

    if (params.url) {
      return this.client.post('/api/v1/speaker/diarize', {
        url: params.url,
        num_speakers: params.numSpeakers,
      });
    }

    throw new Error('Either file or url must be provided');
  }

  /**
   * Get a speaker job by ID
   */
  async get(jobId: number): Promise<SpeakerJob> {
    return this.client.get(`/api/v1/speaker/jobs/${jobId}`);
  }

  /**
   * List speaker jobs
   */
  async list(params: PaginationParams & { status?: string; jobType?: string } = {}): Promise<SpeakerJob[]> {
    return this.client.get('/api/v1/speaker/jobs', {
      skip: params.skip ?? 0,
      limit: params.limit ?? 50,
      status: params.status,
      job_type: params.jobType,
    });
  }

  /**
   * Delete a speaker job
   */
  async delete(jobId: number): Promise<void> {
    await this.client.delete(`/api/v1/speaker/jobs/${jobId}`);
  }

  /**
   * Wait for speaker job to complete
   */
  async waitForCompletion(jobId: number, timeout: number = DEFAULT_TIMEOUT): Promise<SpeakerJob> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const job = await this.get(jobId);

      if (job.status === 'COMPLETED') {
        return job;
      }

      if (job.status === 'FAILED') {
        throw new Error(`Speaker processing failed: ${job.error_message || 'Unknown error'}`);
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    }

    throw new Error(`Speaker processing timed out after ${timeout / 1000}s`);
  }

  /**
   * Diarize and wait for completion
   */
  async identify(params: SpeakerDiarizeParams): Promise<SpeakerJob> {
    const job = await this.diarize(params);
    return this.waitForCompletion(job.id);
  }
}




