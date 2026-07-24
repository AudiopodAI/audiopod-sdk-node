/**
 * Audio-to-MIDI Service
 *
 * Convert audio — or stems you already separated — into MIDI using
 * AudioPod's audio-to-MIDI engine. Transcribes bass, vocals, and piano by
 * default (bass is the strongest instrument); guitar is supported too but
 * is opt-in/experimental (over-detects on busy mixes). It's a starting-point
 * transcription: expect to tidy timing/note lengths by ear in your DAW,
 * dynamics are approximate, and it works best on clean recordings. Drums
 * and "other" are accepted as a requested stem but aren't transcribed —
 * they come back in `skipped_stems`. Detected tempo is surfaced as
 * `detected_tempo_bpm`.
 */

import type AudioPod from "../client";
import type {
  MidiConvertParams,
  MidiFromStemsParams,
  MidiJob,
  PaginationParams,
} from "../types";

const POLL_INTERVAL = 3000;
const DEFAULT_TIMEOUT = 900000; // 15 minutes

export class Midi {
  constructor(private client: AudioPod) {}

  /**
   * Standalone audio-to-MIDI: split an audio file/URL into stems and
   * transcribe each pitched stem into MIDI.
   *
   * @param params.file - Path to local audio file
   * @param params.url - URL of audio/video to convert (alternative to file)
   * @param params.stems - Stems to transcribe. Defaults to
   *   ["bass", "vocals", "piano"] server-side when omitted. "guitar" is
   *   supported but opt-in/experimental — pass it explicitly.
   * @param params.options - Tunables forwarded to the audio-to-MIDI engine.
   *
   * @example
   * ```typescript
   * // Default stems: bass, vocals, piano
   * const job = await client.midi.convert({ file: './song.mp3' });
   * console.log(job.merged_midi_url);
   * ```
   */
  async convert(params: MidiConvertParams = {}): Promise<MidiJob> {
    if (!params.file && !params.url) {
      throw new Error("Either file or url must be provided");
    }
    if (params.file && params.url) {
      throw new Error("Provide file or url, not both");
    }

    const fields: Record<string, any> = {};
    if (params.stems) fields.stems = JSON.stringify(params.stems);
    if (params.options) fields.options = JSON.stringify(params.options);

    if (params.file) {
      return this.client.upload(
        "/api/v1/midi/convert",
        params.file,
        "file",
        fields
      );
    }

    fields.url = params.url;
    return this.client.postForm("/api/v1/midi/convert", fields);
  }

  /**
   * Add-on: transcribe the stems of an already-completed stem-extraction job
   * into MIDI (no re-split — bills the add-on rate only).
   *
   * @param stemJobId - ID of a completed `client.stems` job
   * @param params.stems - Subset of the source job's stems to transcribe
   *   (default: all of them — drums/other still land in `skipped_stems`;
   *   "guitar" is opt-in/experimental)
   * @param params.options - Tunables forwarded to the audio-to-MIDI engine.
   *
   * @example
   * ```typescript
   * const stemJob = await client.stems.separate({ file: './song.mp3', mode: 'six' });
   * const midiJob = await client.midi.convertFromStemJob(stemJob.id);
   * for (const [stem, url] of Object.entries(midiJob.midi_urls ?? {})) {
   *   console.log(`${stem}: ${url}`);
   * }
   * ```
   */
  async convertFromStemJob(
    stemJobId: number,
    params: MidiFromStemsParams = {}
  ): Promise<MidiJob> {
    return this.client.post(
      `/api/v1/midi/convert/from-stems/${stemJobId}`,
      {
        stems: params.stems,
        options: params.options,
      }
    );
  }

  /**
   * Get the status of an audio-to-MIDI job.
   *
   * @param jobId - The job ID returned from convert() / convertFromStemJob()
   */
  async status(jobId: number): Promise<MidiJob> {
    return this.client.get(`/api/v1/midi/status/${jobId}`);
  }

  /**
   * Get an audio-to-MIDI job by ID (alias for status()).
   */
  async get(jobId: number): Promise<MidiJob> {
    return this.status(jobId);
  }

  /**
   * List audio-to-MIDI jobs.
   *
   * @param params.skip - Number of jobs to skip (pagination)
   * @param params.limit - Maximum jobs to return (default: 50)
   */
  async list(params: PaginationParams = {}): Promise<MidiJob[]> {
    return this.client.get("/api/v1/midi/jobs", {
      skip: params.skip ?? 0,
      limit: params.limit ?? 50,
    });
  }

  /**
   * Delete an audio-to-MIDI job.
   */
  async delete(jobId: number): Promise<void> {
    await this.client.delete(`/api/v1/midi/jobs/${jobId}`);
  }

  /**
   * Wait for an audio-to-MIDI job to complete.
   *
   * @param jobId - The job ID to wait for
   * @param timeout - Maximum wait time in milliseconds (default: 900000)
   * @returns Completed job with midi_urls / merged_midi_url
   */
  async waitForCompletion(
    jobId: number,
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<MidiJob> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const job = await this.status(jobId);

      if (job.status === "COMPLETED") {
        return job;
      }

      if (job.status === "FAILED") {
        throw new Error(
          `Audio-to-MIDI conversion failed: ${job.error_message || "Unknown error"}`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    }

    throw new Error(
      `Audio-to-MIDI conversion timed out after ${timeout / 1000}s`
    );
  }

  /**
   * Convert and wait for completion (convenience method).
   *
   * @example
   * ```typescript
   * const result = await client.midi.transcribe({ file: './song.mp3' });
   * console.log(result.merged_midi_url);
   * ```
   */
  async transcribe(
    params: MidiConvertParams = {},
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<MidiJob> {
    const job = await this.convert(params);
    return this.waitForCompletion(job.id, timeout);
  }
}
