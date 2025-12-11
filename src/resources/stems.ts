/**
 * Stem Extraction Service - Audio Stem Separation
 *
 * Simple mode-based API for separating audio into individual stems.
 */

import type AudioPod from "../client";
import type {
  StemExtractionParams,
  StemExtractionJob,
  StemMode,
  SingleStem,
  PaginationParams,
  ModesResponse,
} from "../types";

const POLL_INTERVAL = 3000;
const DEFAULT_TIMEOUT = 600000; // 10 minutes

export class StemExtraction {
  constructor(private client: AudioPod) {}

  /**
   * Extract stems from audio using simple mode selection.
   *
   * @param params.file - Path to local audio file (MP3, WAV, FLAC, M4A, OGG)
   * @param params.url - URL of audio/video (YouTube, SoundCloud, direct link)
   * @param params.mode - Separation mode:
   *   - "single": Extract one stem (specify stem param)
   *   - "two": Vocals + Instrumental
   *   - "four": Vocals, Drums, Bass, Other (default)
   *   - "six": Vocals, Drums, Bass, Guitar, Piano, Other
   *   - "producer": 8 stems with kick, snare, hihat
   *   - "studio": 12 stems for professional mixing
   *   - "mastering": 16 stems maximum detail
   * @param params.stem - For mode="single", which stem to extract
   *
   * @example
   * ```typescript
   * // From URL with 6 stems
   * const job = await client.stems.extract({
   *   url: 'https://youtube.com/watch?v=VIDEO_ID',
   *   mode: 'six'
   * });
   *
   * // From file with 4 stems
   * const job = await client.stems.extract({
   *   file: './song.mp3',
   *   mode: 'four'
   * });
   *
   * // Extract only vocals
   * const job = await client.stems.extract({
   *   url: 'https://youtube.com/watch?v=VIDEO_ID',
   *   mode: 'single',
   *   stem: 'vocals'
   * });
   * ```
   */
  async extract(params: StemExtractionParams): Promise<StemExtractionJob> {
    const mode = params.mode || "four";

    if (!params.file && !params.url) {
      throw new Error("Either file or url must be provided");
    }

    if (mode === "single" && !params.stem) {
      throw new Error(
        "stem parameter required for mode='single'. Options: vocals, drums, bass, guitar, piano, other"
      );
    }

    const additionalFields: Record<string, any> = { mode };
    if (params.stem) {
      additionalFields.stem = params.stem;
    }

    if (params.file) {
      return this.client.upload(
        "/api/v1/stem-extraction/api/extract",
        params.file,
        "file",
        additionalFields
      );
    }

    if (params.url) {
      additionalFields.url = params.url;
      return this.client.postForm(
        "/api/v1/stem-extraction/api/extract",
        additionalFields
      );
    }

    throw new Error("Either file or url must be provided");
  }

  /**
   * Get the status of a stem extraction job.
   *
   * @param jobId - The job ID returned from extract()
   * @returns Job status with download_urls when completed
   *
   * @example
   * ```typescript
   * const status = await client.stems.status(5512);
   * if (status.status === 'COMPLETED') {
   *   console.log(status.download_urls);
   * }
   * ```
   */
  async status(jobId: number): Promise<StemExtractionJob> {
    return this.client.get(`/api/v1/stem-extraction/status/${jobId}`);
  }

  /**
   * Get a stem extraction job by ID
   */
  async get(jobId: number): Promise<StemExtractionJob> {
    return this.client.get(`/api/v1/stem-extraction/jobs/${jobId}`);
  }

  /**
   * List stem extraction jobs
   *
   * @param params.skip - Number of jobs to skip (pagination)
   * @param params.limit - Maximum jobs to return (default: 50)
   * @param params.status - Filter by status
   */
  async list(
    params: PaginationParams & { status?: string } = {}
  ): Promise<StemExtractionJob[]> {
    return this.client.get("/api/v1/stem-extraction/jobs", {
      skip: params.skip ?? 0,
      limit: params.limit ?? 50,
      status: params.status,
    });
  }

  /**
   * Delete a stem extraction job
   */
  async delete(jobId: number): Promise<void> {
    await this.client.delete(`/api/v1/stem-extraction/jobs/${jobId}`);
  }

  /**
   * Wait for stem extraction to complete.
   *
   * @param jobId - The job ID to wait for
   * @param timeout - Maximum wait time in milliseconds (default: 600000)
   * @returns Completed job with download_urls
   *
   * @example
   * ```typescript
   * const job = await client.stems.extract({ url: '...', mode: 'six' });
   * const result = await client.stems.waitForCompletion(job.id);
   *
   * for (const [stem, url] of Object.entries(result.download_urls)) {
   *   console.log(`${stem}: ${url}`);
   * }
   * ```
   */
  async waitForCompletion(
    jobId: number,
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<StemExtractionJob> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const job = await this.status(jobId);

      if (job.status === "COMPLETED") {
        return job;
      }

      if (job.status === "FAILED") {
        throw new Error(
          `Stem extraction failed: ${job.error_message || "Unknown error"}`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    }

    throw new Error(`Stem extraction timed out after ${timeout / 1000}s`);
  }

  /**
   * Extract stems and wait for completion (convenience method).
   *
   * @example
   * ```typescript
   * // One-liner: extract and wait
   * const result = await client.stems.separate({
   *   url: 'https://youtube.com/watch?v=VIDEO_ID',
   *   mode: 'six'
   * });
   * console.log(result.download_urls.vocals);
   * ```
   */
  async separate(
    params: StemExtractionParams,
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<StemExtractionJob> {
    const job = await this.extract(params);
    return this.waitForCompletion(job.id, timeout);
  }

  /**
   * Get available separation modes.
   *
   * @example
   * ```typescript
   * const modes = await client.stems.modes();
   * modes.modes.forEach(m => {
   *   console.log(`${m.mode}: ${m.description}`);
   * });
   * ```
   */
  async modes(): Promise<ModesResponse> {
    return this.client.get("/api/v1/stem-extraction/modes");
  }
}
