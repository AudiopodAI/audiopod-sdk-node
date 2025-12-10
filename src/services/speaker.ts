/**
 * Speaker Service - Speaker diarization and extraction
 */

import { AudioPodClient } from '../client';
import { Job } from '../types';

export class SpeakerService {
  constructor(private client: AudioPodClient) {}

  /**
   * Identify and separate speakers in audio
   */
  async diarize(options: {
    audioFile?: string;
    url?: string;
    numSpeakers?: number;
    waitForCompletion?: boolean;
    timeout?: number;
  }): Promise<Job> {
    let response: Job;

    if (options.audioFile) {
      const formData = this.client.prepareFileUpload(options.audioFile, 'file');
      if (options.numSpeakers) formData.append('num_speakers', String(options.numSpeakers));

      response = await this.client.request('POST', '/api/v1/speaker/diarize', { formData });
    } else {
      response = await this.client.request('POST', '/api/v1/speaker/diarize', {
        data: {
          url: options.url,
          num_speakers: options.numSpeakers,
        },
      });
    }

    if (options.waitForCompletion) {
      return this.waitForCompletion(response.id, options.timeout || 600);
    }

    return response;
  }

  /**
   * Extract individual speaker audio tracks
   */
  async extract(options: {
    audioFile?: string;
    url?: string;
    waitForCompletion?: boolean;
    timeout?: number;
  }): Promise<Job> {
    let response: Job;

    if (options.audioFile) {
      const formData = this.client.prepareFileUpload(options.audioFile, 'file');
      response = await this.client.request('POST', '/api/v1/speaker/extract', { formData });
    } else {
      response = await this.client.request('POST', '/api/v1/speaker/extract', {
        data: { url: options.url },
      });
    }

    if (options.waitForCompletion) {
      return this.waitForCompletion(response.id, options.timeout || 600);
    }

    return response;
  }

  /**
   * Get speaker job status
   */
  async getJob(jobId: number): Promise<Job> {
    return this.client.request('GET', `/api/v1/speaker/status/${jobId}`);
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

