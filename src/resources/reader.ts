/**
 * Audio Reader Service — turn an article URL or raw text into narrated audio
 * with an embeddable player.
 */

import type AudioPod from "../client";
import type {
  ReaderEstimateParams,
  ReaderGenerateParams,
  ReaderEstimate,
  ReaderJob,
} from "../types";

const BASE = "/api/v1/reader";
const POLL_INTERVAL = 3000;
const DEFAULT_TIMEOUT = 600000; // 10 minutes

export class Reader {
  constructor(private client: AudioPod) {}

  /**
   * List your audio-reader jobs (paginated).
   *
   * @param params.page - 1-based page number (default 1)
   * @param params.pageSize - Items per page (default 20)
   */
  async list(
    params: { page?: number; pageSize?: number } = {}
  ): Promise<any> {
    return this.client.get(`${BASE}/`, {
      page: params.page ?? 1,
      page_size: params.pageSize ?? 20,
    });
  }

  /**
   * Estimate the credit cost of reading a URL or text aloud, without
   * generating anything.
   */
  async estimate(params: ReaderEstimateParams): Promise<ReaderEstimate> {
    if (!params.url && !params.content) {
      throw new Error("Either url or content must be provided");
    }
    return this.client.post(`${BASE}/estimate`, {
      url: params.url,
      content: params.content,
      voice: params.voice,
    });
  }

  /**
   * Start an audio-reader job. Returns immediately with a job in `PENDING` /
   * `PROCESSING`; poll {@link Reader.get} or use {@link Reader.waitForCompletion}.
   *
   * @example
   * ```typescript
   * const job = await client.reader.generate({
   *   url: 'https://example.com/blog/my-post',
   *   title: 'My Post',
   * });
   * const done = await client.reader.waitForCompletion(job.id);
   * console.log(done.audio_url, done.embed_url);
   * ```
   */
  async generate(params: ReaderGenerateParams): Promise<ReaderJob> {
    if (!params.url && !params.content) {
      throw new Error("Either url or content must be provided");
    }
    return this.client.post(`${BASE}/generate`, {
      url: params.url,
      content: params.content,
      title: params.title,
      voice: params.voice,
      webhook_url: params.webhookUrl,
      show_branding: params.showBranding,
    });
  }

  /**
   * Get an audio-reader job by ID.
   */
  async get(jobId: number): Promise<ReaderJob> {
    return this.client.get(`${BASE}/${jobId}`);
  }

  /**
   * Get a public (shared) audio-reader job by ID — no authentication scope
   * beyond the API key.
   */
  async getPublic(jobId: number): Promise<ReaderJob> {
    return this.client.get(`${BASE}/public/${jobId}`);
  }

  /**
   * Delete an audio-reader job.
   */
  async delete(jobId: number): Promise<void> {
    await this.client.delete(`${BASE}/${jobId}`);
  }

  /**
   * Wait for an audio-reader job to complete.
   */
  async waitForCompletion(
    jobId: number,
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<ReaderJob> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const job = await this.get(jobId);
      const status = String(job.status ?? "").toUpperCase();

      if (status === "COMPLETED") {
        return job;
      }

      if (status === "FAILED" || status === "CANCELLED") {
        throw new Error(
          `Audio reader job failed: ${job.error || "Unknown error"}`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    }

    throw new Error(`Audio reader job timed out after ${timeout / 1000}s`);
  }

  /**
   * Generate narrated audio and wait for completion (convenience method).
   */
  async read(
    params: ReaderGenerateParams,
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<ReaderJob> {
    const job = await this.generate(params);
    return this.waitForCompletion(job.id, timeout);
  }
}
