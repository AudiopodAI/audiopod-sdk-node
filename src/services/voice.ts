/**
 * Voice Service - Voice cloning and text-to-speech
 */

import { AudioPodClient } from '../client';
import { Voice, TTSRequest, Job } from '../types';

export class VoiceService {
  constructor(private client: AudioPodClient) {}

  /**
   * List available voices
   */
  async listVoices(): Promise<Voice[]> {
    return this.client.request('GET', '/api/v1/voices');
  }

  /**
   * Get voice details
   */
  async getVoice(voiceId: number): Promise<Voice> {
    return this.client.request('GET', `/api/v1/voices/${voiceId}`);
  }

  /**
   * Create a new voice clone
   */
  async createVoice(
    name: string,
    audioFile: string,
    description?: string
  ): Promise<Voice> {
    const formData = this.client.prepareFileUpload(audioFile, 'audio_file');
    formData.append('name', name);
    if (description) formData.append('description', description);

    return this.client.request('POST', '/api/v1/voices', { formData });
  }

  /**
   * Delete a voice
   */
  async deleteVoice(voiceId: number): Promise<void> {
    await this.client.request('DELETE', `/api/v1/voices/${voiceId}`);
  }

  /**
   * Generate speech from text
   */
  async generateSpeech(request: TTSRequest): Promise<Job> {
    const response = await this.client.request('POST', '/api/v1/tts/generate', {
      data: {
        text: request.text,
        voice_id: request.voiceId,
        speed: request.speed || 1.0,
      },
    });

    if (request.waitForCompletion) {
      return this.waitForCompletion(response.id, request.timeout || 300);
    }

    return response;
  }

  /**
   * Get TTS job status
   */
  async getJob(jobId: number): Promise<Job> {
    return this.client.request('GET', `/api/v1/tts/status/${jobId}`);
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

