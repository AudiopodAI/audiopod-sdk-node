/**
 * Transcription Service - Speech-to-Text
 */

import type AudioPod from '../client';
import type {
  TranscriptionCreateParams,
  TranscriptionJob,
  TranscriptionResult,
  PaginationParams,
} from '../types';

const POLL_INTERVAL = 3000;
const DEFAULT_TIMEOUT = 600000; // 10 minutes

export class Transcription {
  constructor(private client: AudioPod) {}

  /**
   * Create a transcription job from URL(s)
   * 
   * @example
   * ```typescript
   * const job = await client.transcription.create({
   *   url: 'https://youtube.com/watch?v=...',
   *   speakerDiarization: true,
   * });
   * ```
   */
  async create(params: TranscriptionCreateParams): Promise<TranscriptionJob> {
    const urls = params.urls || (params.url ? [params.url] : []);
    
    if (urls.length === 0) {
      throw new Error('At least one URL is required');
    }

    return this.client.post('/api/v1/transcription/transcribe', {
      source_urls: urls,
      language: params.language,
      enable_speaker_diarization: params.speakerDiarization ?? false,
      min_speakers: params.minSpeakers,
      max_speakers: params.maxSpeakers,
      enable_word_timestamps: params.wordTimestamps ?? true,
    });
  }

  /**
   * Upload a file for transcription
   * 
   * @example
   * ```typescript
   * const job = await client.transcription.upload({
   *   file: './audio.mp3',
   *   language: 'en',
   * });
   * ```
   */
  async upload(params: { file: string; language?: string; speakerDiarization?: boolean }): Promise<TranscriptionJob> {
    return this.client.upload('/api/v1/transcription/transcribe-upload', params.file, 'files', {
      language: params.language,
      enable_speaker_diarization: params.speakerDiarization ?? false,
    });
  }

  /**
   * Get a transcription job by ID
   */
  async get(jobId: number): Promise<TranscriptionJob> {
    return this.client.get(`/api/v1/transcription/jobs/${jobId}`);
  }

  /**
   * List transcription jobs
   */
  async list(params: PaginationParams & { status?: string } = {}): Promise<TranscriptionJob[]> {
    return this.client.get('/api/v1/transcription/jobs', {
      offset: params.skip ?? 0,
      limit: params.limit ?? 50,
      status: params.status,
    });
  }

  /**
   * Delete a transcription job
   */
  async delete(jobId: number): Promise<void> {
    await this.client.delete(`/api/v1/transcription/jobs/${jobId}`);
  }

  /**
   * Get transcript content
   * 
   * @param format - Output format: 'json', 'txt', 'srt', 'vtt'
   */
  async getTranscript(jobId: number, format: 'json' | 'txt' | 'srt' | 'vtt' = 'json'): Promise<any> {
    return this.client.get(`/api/v1/transcription/jobs/${jobId}/transcript`, { format });
  }

  /**
   * Wait for a transcription job to complete
   * 
   * @example
   * ```typescript
   * const job = await client.transcription.create({ url: '...' });
   * const result = await client.transcription.waitForCompletion(job.id);
   * console.log(result.status); // 'COMPLETED'
   * ```
   */
  async waitForCompletion(jobId: number, timeout: number = DEFAULT_TIMEOUT): Promise<TranscriptionJob> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const job = await this.get(jobId);

      if (job.status === 'COMPLETED') {
        return job;
      }

      if (job.status === 'FAILED') {
        throw new Error(`Transcription failed: ${job.error_message || 'Unknown error'}`);
      }

      if (job.status === 'CANCELLED') {
        throw new Error('Transcription was cancelled');
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    }

    throw new Error(`Transcription timed out after ${timeout / 1000}s`);
  }

  /**
   * Create and wait for completion in one call
   */
  async transcribe(params: TranscriptionCreateParams): Promise<TranscriptionJob> {
    const job = await this.create(params);
    return this.waitForCompletion(job.id || job.job_id!);
  }
}




