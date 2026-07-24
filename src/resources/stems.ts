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
  StemExtractionAdvancedParams,
  StemCatalogEntry,
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
   * Advanced stem extraction over the full instrument catalog (45 instruments).
   *
   * Pick exactly one selection mode — `package`, `singleStem`, `multiStemCount`,
   * `customStems`, or `excludeStems`. `targetStems`/`excludeStems`/`customStems`
   * accept either a string array (JSON-encoded for you) or a raw JSON-array
   * string. Requires an eligible plan (Creator+).
   *
   * The endpoint is `multipart/form-data`, so this uses `upload` (file) /
   * `postForm` (url) — never a JSON body.
   *
   * @example
   * ```typescript
   * // Isolate the saxophone from a URL
   * const job = await client.stems.extractAdvanced({
   *   url: 'https://example.com/song.mp3',
   *   singleStem: 'saxophone',
   * });
   *
   * // Everything except the vocals (instrumental), from a curated bundle
   * const job2 = await client.stems.extractAdvanced({
   *   file: './song.wav',
   *   excludeStems: ['vocals'],
   * });
   * ```
   */
  async extractAdvanced(
    params: StemExtractionAdvancedParams
  ): Promise<StemExtractionJob> {
    if (!params.file && !params.url) {
      throw new Error("Either file or url must be provided");
    }
    if (params.file && params.url) {
      throw new Error("Provide either file or url, not both");
    }

    const asJson = (v: string[] | string | undefined): string | undefined =>
      v === undefined ? undefined : Array.isArray(v) ? JSON.stringify(v) : v;

    const fields: Record<string, any> = {
      method: params.method,
      package: params.package,
      target_stems: asJson(params.targetStems),
      exclude_stems: asJson(params.excludeStems),
      two_stems_mode: params.twoStemsMode,
      target_instrument: params.targetInstrument,
      single_stem: params.singleStem,
      multi_stem_count: params.multiStemCount,
      custom_stems: asJson(params.customStems),
    };

    if (params.file) {
      return this.client.upload(
        "/api/v1/stem-extraction/extract/advanced",
        params.file,
        "file",
        fields
      );
    }

    fields.url = params.url;
    return this.client.postForm(
      "/api/v1/stem-extraction/extract/advanced",
      fields
    );
  }

  /**
   * Get the full advanced stem catalog (every isolatable instrument plus the
   * plan tier each one requires).
   */
  async catalog(): Promise<StemCatalogEntry[] | Record<string, any>> {
    return this.client.get("/api/v1/stem-extraction/catalog");
  }

  /**
   * List the curated stem packages available to the current account.
   */
  async availablePackages(): Promise<any> {
    return this.client.get("/api/v1/stem-extraction/packages/available");
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
