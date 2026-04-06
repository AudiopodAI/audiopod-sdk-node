/**
 * Music Service - AudioMusic V2 AI Music Generation
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
} from '../types';

const POLL_INTERVAL = 5000;
const DEFAULT_TIMEOUT = 600000; // 10 minutes

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
   * The 4B Language Model auto-generates caption, lyrics, BPM, key, time signature, and duration.
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
}
