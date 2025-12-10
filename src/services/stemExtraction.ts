/**
 * Stem Extraction Service - Audio stem separation
 */

import { AudioPodClient } from '../client';
import { StemExtractionRequest, StemExtractionResult } from '../types';
import { ValidationError } from '../errors';

export class StemExtractionService {
  constructor(private client: AudioPodClient) {}

  /**
   * Extract stems from audio
   */
  async extractStems(request: StemExtractionRequest): Promise<StemExtractionResult> {
    if (!request.audioFile && !request.url) {
      throw new ValidationError('Provide audioFile or url');
    }

    if (request.audioFile && request.url) {
      throw new ValidationError('Provide audioFile or url, not both');
    }

    const stemTypes =
      request.stemTypes ||
      (request.modelName === 'htdemucs_6s'
        ? ['vocals', 'drums', 'bass', 'other', 'piano', 'guitar']
        : ['vocals', 'drums', 'bass', 'other']);

    let response: StemExtractionResult;

    if (request.audioFile) {
      const formData = this.client.prepareFileUpload(request.audioFile, 'file');
      formData.append('stem_types', JSON.stringify(stemTypes));
      formData.append('model_name', request.modelName || 'htdemucs');
      if (request.twoStemsMode) {
        formData.append('two_stems_mode', request.twoStemsMode);
      }

      response = await this.client.request('POST', '/api/v1/stem-extraction/extract', {
        formData,
      });
    } else {
      response = await this.client.request('POST', '/api/v1/stem-extraction/extract', {
        data: {
          url: request.url,
          stem_types: stemTypes,
          model_name: request.modelName || 'htdemucs',
          two_stems_mode: request.twoStemsMode,
        },
      });
    }

    if (request.waitForCompletion) {
      return this.waitForCompletion(response.id, request.timeout || 900);
    }

    return response;
  }

  /**
   * Get stem extraction job status
   */
  async getJob(jobId: number): Promise<StemExtractionResult> {
    return this.client.request('GET', `/api/v1/stem-extraction/status/${jobId}`);
  }

  /**
   * List stem extraction jobs
   */
  async listJobs(skip: number = 0, limit: number = 50): Promise<StemExtractionResult[]> {
    return this.client.request('GET', '/api/v1/stem-extraction/jobs', {
      params: { skip, limit },
    });
  }

  /**
   * Delete stem extraction job
   */
  async deleteJob(jobId: number): Promise<void> {
    await this.client.request('DELETE', `/api/v1/stem-extraction/jobs/${jobId}`);
  }

  private async waitForCompletion(
    jobId: number,
    timeout: number = 900
  ): Promise<StemExtractionResult> {
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

