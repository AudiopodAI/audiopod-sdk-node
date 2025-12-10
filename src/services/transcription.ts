/**
 * Transcription Service - Speech-to-text
 */

import { AudioPodClient } from '../client';
import { TranscriptionRequest, TranscriptionResult } from '../types';

export class TranscriptionService {
  constructor(private client: AudioPodClient) {}

  /**
   * Transcribe audio to text
   */
  async transcribe(request: TranscriptionRequest): Promise<TranscriptionResult> {
    let response: TranscriptionResult;

    if (request.audioFile) {
      const formData = this.client.prepareFileUpload(request.audioFile, 'file');
      if (request.language) formData.append('language', request.language);
      formData.append('speaker_diarization', String(request.speakerDiarization || false));

      response = await this.client.request('POST', '/api/v1/transcribe', { formData });
    } else {
      response = await this.client.request('POST', '/api/v1/transcribe', {
        data: {
          url: request.url,
          language: request.language,
          speaker_diarization: request.speakerDiarization || false,
        },
      });
    }

    if (request.waitForCompletion) {
      return this.waitForCompletion(response.id, request.timeout || 600);
    }

    return response;
  }

  /**
   * Get transcription job status
   */
  async getJob(jobId: number): Promise<TranscriptionResult> {
    return this.client.request('GET', `/api/v1/transcribe/status/${jobId}`);
  }

  /**
   * List transcription jobs
   */
  async listJobs(skip: number = 0, limit: number = 50): Promise<TranscriptionResult[]> {
    return this.client.request('GET', '/api/v1/transcribe/jobs', {
      params: { skip, limit },
    });
  }

  private async waitForCompletion(
    jobId: number,
    timeout: number = 600
  ): Promise<TranscriptionResult> {
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

