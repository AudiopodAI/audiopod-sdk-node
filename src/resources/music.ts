/**
 * Music Service - AudioMusic V2 AI Music Generation, plus score-first music
 * (AudioMusic v3): the song is written as an editable score (ABC notation)
 * first and the audio is rendered from that score.
 */

import type AudioPod from '../client';
import type {
  MusicCreateParams,
  MusicSimpleParams,
  MusicCoverParams,
  MusicReferenceParams,
  MusicAnalyzeParams,
  MusicAnalyzeResponse,
  MusicExtractStemParams,
  MusicJob,
  MusicTask,
  PaginationParams,
  MusicV3Availability,
  MusicV3ComposeParams,
  MusicV3GenerateParams,
  MusicV3Job,
  MusicV3ListParams,
  MusicV3RecordParams,
  MusicV3ReviseParams,
  MusicV3Score,
  MusicV3WaitOptions,
} from '../types';
import { AudioPodError, ValidationError } from '../errors';

const POLL_INTERVAL = 5000;
const DEFAULT_TIMEOUT = 600000; // 10 minutes

const V3 = '/api/v1/music/v3';
const V3_DEFAULT_TIMEOUT = 900000; // 15 minutes
/** Longest `instruction` `reviseScore()` accepts. */
export const MAX_REVISE_INSTRUCTION_CHARS = 500;

/** Drop undefined/null so unset optional fields are never sent. */
function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null) out[k] = v;
  }
  return out;
}

export class Music {
  constructor(private client: AudioPod) {}

  /**
   * Generate music from text using AudioMusic V2
   *
   * @example
   * ```typescript
   * const job = await client.music.create({
   *   prompt: 'Upbeat electronic dance music',
   *   duration: 30,
   *   inferenceSteps: 64,
   *   guidanceScale: 7.0,
   * });
   * ```
   */
  async create(params: MusicCreateParams): Promise<MusicJob> {
    const task = params.task || (params.lyrics ? 'text2music' : 'prompt2instrumental');
    const endpoint = `/api/v1/music/${task}`;

    return this.client.post(endpoint, {
      prompt: params.prompt,
      caption: params.caption,
      lyrics: params.lyrics,
      audio_duration: params.duration ?? -1,
      display_name: params.displayName,
      genre_preset: params.genre,
      instrumental: params.instrumental,
      format: params.format,
      model_version: params.modelVersion,
      inference_steps: params.inferenceSteps,
      guidance_scale: params.guidanceScale,
      shift: params.shift,
      infer_method: params.inferMethod,
      thinking: params.thinking,
      lm_temperature: params.lmTemperature,
      lm_cfg_scale: params.lmCfgScale,
      lm_top_k: params.lmTopK,
      lm_top_p: params.lmTopP,
      use_cot_metas: params.useCotMetas,
      use_cot_caption: params.useCotCaption,
      use_cot_lyrics: params.useCotLyrics,
      use_cot_language: params.useCotLanguage,
      bpm: params.bpm,
      keyscale: params.keyscale,
      timesignature: params.timesignature,
      vocal_language: params.vocalLanguage,
      batch_size: params.batchSize,
      seed: params.seed,
      generate_lrc: params.generateLrc,
      thumbnail_url: params.thumbnailUrl,
      quality: params.quality,
    });
  }

  /**
   * Generate instrumental music (no vocals)
   */
  async instrumental(prompt: string, duration: number = 30): Promise<MusicJob> {
    return this.create({ prompt, duration, task: 'prompt2instrumental' });
  }

  /**
   * Generate a song with vocals
   */
  async song(prompt: string, lyrics: string, duration: number = 60): Promise<MusicJob> {
    return this.create({ prompt, lyrics, duration, task: 'text2music' });
  }

  /**
   * Generate rap music
   */
  async rap(prompt: string, lyrics: string, duration: number = 60): Promise<MusicJob> {
    return this.create({ prompt, lyrics, duration, task: 'text2rap' });
  }

  /**
   * Generate music from a simple natural language query using AudioMusic V2's Simple Mode.
   * AudioMusic auto-generates caption, lyrics, BPM, key, time signature, and duration.
   *
   * @example
   * ```typescript
   * const job = await client.music.simple({
   *   query: 'a soft Bengali love song for a quiet evening',
   * });
   * ```
   */
  async simple(params: MusicSimpleParams): Promise<MusicJob> {
    return this.client.post('/api/v1/music/simple', {
      query: params.query,
      instrumental: params.instrumental,
      vocal_language: params.vocalLanguage,
      display_name: params.displayName,
      audio_duration: params.duration,
      format: params.format,
      quality: params.quality,
    });
  }

  /**
   * Generate a cover/style transfer of existing audio using AudioMusic V2.
   * Transforms audio while maintaining structure but changing style/timbre.
   *
   * @example
   * ```typescript
   * const job = await client.music.cover({
   *   srcAudioUrl: 'https://example.com/song.mp3',
   *   caption: 'jazz piano version with upright bass',
   *   audioCoverStrength: 0.7,
   * });
   * ```
   */
  async cover(params: MusicCoverParams): Promise<MusicJob> {
    return this.client.post('/api/v1/music/cover', {
      src_audio_url: params.srcAudioUrl,
      caption: params.caption,
      lyrics: params.lyrics,
      audio_cover_strength: params.audioCoverStrength,
      display_name: params.displayName,
      audio_duration: params.duration,
      format: params.format,
      quality: params.quality,
    });
  }

  /**
   * Generate music with reference audio for style guidance.
   * Reference audio provides global acoustic feature control (timbre, mixing style, atmosphere).
   *
   * @example
   * ```typescript
   * const job = await client.music.reference({
   *   referenceAudioUrl: 'https://example.com/reference.mp3',
   *   caption: 'upbeat pop with similar vocal style',
   *   lyrics: '[verse]\nHello world\n[chorus]\nLa la la',
   * });
   * ```
   */
  async reference(params: MusicReferenceParams): Promise<MusicJob> {
    return this.client.post('/api/v1/music/reference', {
      reference_audio_url: params.referenceAudioUrl,
      caption: params.caption,
      lyrics: params.lyrics,
      instrumental: params.instrumental,
      display_name: params.displayName,
      audio_duration: params.duration,
      format: params.format,
      quality: params.quality,
    });
  }

  /**
   * Analyze audio to extract metadata (caption, lyrics, BPM, key, time signature, language).
   *
   * @example
   * ```typescript
   * const analysis = await client.music.analyze({
   *   audioUrl: 'https://example.com/song.mp3',
   * });
   * console.log(`BPM: ${analysis.bpm}, Key: ${analysis.keyscale}`);
   * ```
   */
  async analyze(params: MusicAnalyzeParams): Promise<MusicAnalyzeResponse> {
    return this.client.post('/api/v1/music/analyze', {
      audio_url: params.audioUrl,
      audio_codes: params.audioCodes,
      temperature: params.temperature,
    });
  }

  /**
   * Extract a specific stem/track from audio.
   * Available tracks: vocals, drums, bass, guitar, keyboard, strings, synth,
   * percussion, brass, woodwinds, backing_vocals, fx.
   *
   * @example
   * ```typescript
   * const job = await client.music.extractStem({
   *   srcAudioUrl: 'https://example.com/song.mp3',
   *   trackName: 'vocals',
   * });
   * ```
   */
  async extractStem(params: MusicExtractStemParams): Promise<MusicJob> {
    return this.client.post('/api/v1/music/extract-stem', {
      src_audio_url: params.srcAudioUrl,
      track_name: params.trackName,
      display_name: params.displayName,
    });
  }

  /**
   * Get a music job by ID
   */
  async get(jobId: number): Promise<MusicJob> {
    return this.client.get(`/api/v1/music/jobs/${jobId}/status`);
  }

  /**
   * List music jobs
   */
  async list(params: PaginationParams & { task?: MusicTask; status?: string } = {}): Promise<MusicJob[]> {
    return this.client.get('/api/v1/music/jobs', {
      skip: params.skip ?? 0,
      limit: params.limit ?? 50,
      task: params.task,
      status: params.status,
    });
  }

  /**
   * Delete a music job
   */
  async delete(jobId: number): Promise<void> {
    await this.client.delete(`/api/v1/music/jobs/${jobId}`);
  }

  /**
   * Wait for a music job to complete
   */
  async waitForCompletion(jobId: number, timeout: number = DEFAULT_TIMEOUT): Promise<MusicJob> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const job = await this.get(jobId);

      if (job.status === 'COMPLETED') {
        return job;
      }

      if (job.status === 'FAILED') {
        throw new Error(`Music generation failed: ${job.error_message || 'Unknown error'}`);
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    }

    throw new Error(`Music generation timed out after ${timeout / 1000}s`);
  }

  /**
   * Generate music and wait for completion
   */
  async generate(params: MusicCreateParams): Promise<MusicJob> {
    const job = await this.create(params);
    return this.waitForCompletion(job.id);
  }

  /**
   * Get available genre presets
   */
  async getPresets(): Promise<any> {
    return this.client.get('/api/v1/music/presets');
  }

  // ---------------------------------------------------------------------------
  // Score-first music (AudioMusic v3)
  //
  // The usual loop: compose (score only) -> reviseScore / hand-edit ->
  // recordScore (render audio). generateV3 does score + audio in one call.
  // There is no `duration`: length follows the lyrics and the score.
  // ---------------------------------------------------------------------------

  /**
   * Whether score-first music (AudioMusic v3) is offered. Always answers, even
   * where v3 is switched off — hide your v3 surface when `available` is false.
   */
  async v3Availability(): Promise<MusicV3Availability> {
    return this.client.get(`${V3}/availability`);
  }

  /**
   * Write a score only — no audio (`POST /api/v1/music/v3/plan`). Review or
   * revise it, then render it with `recordScore()`.
   *
   * `description`, `targetSeconds` and `language` are COMING SOON and are
   * rejected (422) until the server supports them.
   *
   * @example
   * ```typescript
   * const plan = await client.music.compose({ style: 'warm indie folk', lyrics: '[Verse]\n...' });
   * const ready = await client.music.waitForV3Job(plan.job_id);
   * ```
   */
  async compose(params: MusicV3ComposeParams): Promise<MusicV3Job> {
    if (params.lyrics && params.description) {
      throw new ValidationError('Pass either lyrics or description, not both.');
    }
    return this.client.post(
      `${V3}/plan`,
      compact({
        style: params.style,
        // An empty lyrics string must not ride along with a description.
        lyrics: params.description !== undefined && !params.lyrics ? undefined : params.lyrics,
        description: params.description,
        cot: params.cot,
        seed: params.seed,
        cfg_scale: params.cfgScale,
        display_name: params.displayName,
        target_seconds: params.targetSeconds,
        language: params.language,
      }),
    );
  }

  /**
   * Revise a job's score from a plain-language instruction
   * (`POST /api/v1/music/v3/revise`). Produces a new score-only job whose
   * `score_comparison` says what changed, including `changed_bars`.
   *
   * COMING SOON: the server side is still rolling out; until it does, this
   * call answers 404.
   */
  async reviseScore(params: MusicV3ReviseParams): Promise<MusicV3Job> {
    const instruction = params.instruction ?? '';
    if (!instruction.trim()) {
      throw new ValidationError('instruction must not be empty.');
    }
    if (instruction.length > MAX_REVISE_INSTRUCTION_CHARS) {
      throw new ValidationError(
        `instruction must be at most ${MAX_REVISE_INSTRUCTION_CHARS} characters (got ${instruction.length}).`,
      );
    }
    let bars: { start: number; end: number } | undefined;
    if (params.bars !== undefined) {
      const { start, end } = params.bars;
      if (!Number.isInteger(start) || !Number.isInteger(end) || start > end) {
        throw new ValidationError('bars must be { start: integer, end: integer } with start <= end.');
      }
      bars = { start, end };
    }
    return this.client.post(
      `${V3}/revise`,
      compact({
        source_job_id: params.sourceJobId,
        instruction,
        section: params.section,
        bars,
        allow_tempo_change: params.allowTempoChange,
      }),
    );
  }

  /**
   * Render audio from a complete score (`POST /api/v1/music/v3/edit`).
   *
   * Records a new take: sections you did not change are still performed
   * afresh. An identical request for the same source still in progress is
   * refused with 409 (`SCORE_ALREADY_RECORDING`) — poll that job instead.
   */
  async recordScore(params: MusicV3RecordParams): Promise<MusicV3Job> {
    if (!params.abc || !params.abc.trim()) {
      throw new ValidationError('abc must be a complete, non-empty score.');
    }
    return this.client.post(
      `${V3}/edit`,
      compact({
        source_job_id: params.sourceJobId,
        abc: params.abc,
        style: params.style,
        lyrics: params.lyrics,
        cot: params.cot,
        seed: params.seed,
        cfg_scale: params.cfgScale,
        display_name: params.displayName,
        allow_tempo_change: params.allowTempoChange,
      }),
    );
  }

  /**
   * Write a score AND render the song in one call
   * (`POST /api/v1/music/v3/generate`). Billed as a small score charge plus
   * the music priced from the score (see `billing` on the job).
   */
  async generateV3(params: MusicV3GenerateParams): Promise<MusicV3Job> {
    return this.client.post(
      `${V3}/generate`,
      compact({
        style: params.style,
        lyrics: params.lyrics,
        abc: params.abc,
        cot: params.cot,
        seed: params.seed,
        cfg_scale: params.cfgScale,
        display_name: params.displayName,
      }),
    );
  }

  /** One v3 job: status, audio, score, diagnostics and billing. */
  async getV3Job(jobId: number): Promise<MusicV3Job> {
    return this.client.get(`${V3}/jobs/${jobId}`);
  }

  /**
   * Just a job's score. Throws an `APIError` (404, `NO_SCORE`) when the job
   * has no score yet.
   */
  async getScore(jobId: number): Promise<MusicV3Score> {
    return this.client.get(`${V3}/jobs/${jobId}/score`);
  }

  /** Your v3 jobs, newest first. */
  async listV3Jobs(params: MusicV3ListParams = {}): Promise<MusicV3Job[]> {
    return this.client.get(
      `${V3}/jobs`,
      compact({
        skip: params.skip ?? 0,
        limit: params.limit ?? 50,
        workflow: params.workflow,
        source_job_id: params.sourceJobId,
      }),
    );
  }

  /**
   * Poll a v3 job until it completes. Rejects with `AudioPodError` if it
   * fails or is cancelled, or after `timeout` ms.
   */
  async waitForV3Job(jobId: number, options: MusicV3WaitOptions = {}): Promise<MusicV3Job> {
    const timeout = options.timeout ?? V3_DEFAULT_TIMEOUT;
    const pollInterval = options.pollInterval ?? POLL_INTERVAL;
    const deadline = Date.now() + timeout;

    for (;;) {
      const job = await this.getV3Job(jobId);
      const status = String(job.status ?? '').toUpperCase();
      if (status === 'COMPLETED') return job;
      if (status === 'FAILED' || status === 'ERROR' || status === 'CANCELLED' || status === 'CANCELED') {
        throw new AudioPodError(`Music job ${jobId} ${status.toLowerCase()}: ${job.error_message || 'Unknown error'}`);
      }
      if (Date.now() >= deadline) {
        throw new AudioPodError(`Music job ${jobId} did not complete within ${timeout / 1000}s`);
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }
}
