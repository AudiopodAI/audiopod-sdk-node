/**
 * Video Service - Video generation
 */

import type AudioPod from "../client";

export type VideoType = "karaoke" | "music_video" | "lyric_video";
export type AspectRatio = "16:9" | "9:16" | "1:1";
export type SceneGeneration = "flux" | "veo3" | "static";
export type AnimationStyle =
  | "typewriter"
  | "fade-word"
  | "slide-up"
  | "bounce"
  | "wave"
  | "zoom";

export interface KaraokeOptions {
  audioUrl?: string;
  aspectRatio?: AspectRatio;
  sceneGeneration?: SceneGeneration;
  keyShift?: number;
  style?: Record<string, unknown>;
  webhookUrl?: string;
}

export interface MusicVideoOptions {
  audioUrl?: string;
  musicJobId?: string;
  aspectRatio?: AspectRatio;
  sceneGeneration?: SceneGeneration;
  sceneCount?: number;
  includeLyrics?: boolean;
  style?: Record<string, unknown>;
  webhookUrl?: string;
}

export interface LyricVideoOptions {
  audioUrl?: string;
  lyrics?: string;
  aspectRatio?: AspectRatio;
  animationStyle?: AnimationStyle;
  backgroundColor?: string;
  accentColor?: string;
  particlesEnabled?: boolean;
  backgroundImageUrl?: string;
  webhookUrl?: string;
}

export interface VideoJob {
  id: string;
  type: VideoType;
  status: string;
  progress: number;
  currentStep: string;
  createdAt: number;
  updatedAt: number;
  etaSeconds?: number;
  error?: string;
}

export interface VideoDownload {
  id: string;
  status: "completed";
  videoUrl: string;
  instrumentalUrl?: string;
  subtitleUrl?: string;
  thumbnailUrl?: string;
  durationSeconds: number;
  fileSizeBytes: number;
  expiresAt: number;
}

const POLL_INTERVAL = 5000;
const DEFAULT_TIMEOUT = 600000;

export class VideoResource {
  constructor(private client: AudioPod) {}

  /**
   * Create a karaoke video from audio
   */
  async createKaraoke(options: KaraokeOptions): Promise<VideoJob> {
    const response = await this.client.post("/api/v2/video/karaoke", {
      audio_url: options.audioUrl,
      aspect_ratio: options.aspectRatio || "16:9",
      scene_generation: options.sceneGeneration || "flux",
      key_shift: options.keyShift || 0,
      style: options.style,
      webhook_url: options.webhookUrl,
    });
    return this.mapJob(response);
  }

  /**
   * Create an AI music video
   */
  async createMusicVideo(options: MusicVideoOptions): Promise<VideoJob> {
    const response = await this.client.post("/api/v2/video/music-video", {
      audio_url: options.audioUrl,
      music_job_id: options.musicJobId,
      aspect_ratio: options.aspectRatio || "16:9",
      scene_generation: options.sceneGeneration || "flux",
      scene_count: options.sceneCount || 10,
      include_lyrics: options.includeLyrics ?? true,
      style: options.style,
      webhook_url: options.webhookUrl,
    });
    return this.mapJob(response);
  }

  /**
   * Create a kinetic typography lyric video
   */
  async createLyricVideo(options: LyricVideoOptions): Promise<VideoJob> {
    const response = await this.client.post("/api/v2/video/lyric-video", {
      audio_url: options.audioUrl,
      lyrics: options.lyrics,
      aspect_ratio: options.aspectRatio || "16:9",
      style: {
        animation_style: options.animationStyle || "fade-word",
        background_color: options.backgroundColor || "#1a1a2e",
        accent_color: options.accentColor || "#e94560",
        particles_enabled: options.particlesEnabled ?? true,
      },
      background_image_url: options.backgroundImageUrl,
      webhook_url: options.webhookUrl,
    });
    return this.mapJob(response);
  }

  /**
   * Get video job status
   */
  async getJob(jobId: string): Promise<VideoJob> {
    const response = await this.client.get(`/api/v2/video/${jobId}`);
    return this.mapJob(response);
  }

  /**
   * Get download URLs for completed video
   */
  async getDownload(jobId: string): Promise<VideoDownload> {
    const response = await this.client.get(`/api/v2/video/${jobId}/download`);
    return {
      id: response.id,
      status: response.status,
      videoUrl: response.video_url,
      instrumentalUrl: response.instrumental_url,
      subtitleUrl: response.subtitle_url,
      thumbnailUrl: response.thumbnail_url,
      durationSeconds: response.duration_seconds,
      fileSizeBytes: response.file_size_bytes,
      expiresAt: response.expires_at,
    };
  }

  /**
   * Delete a video job
   */
  async deleteJob(jobId: string): Promise<{ deleted: boolean }> {
    return this.client.delete(`/api/v2/video/${jobId}`);
  }

  /**
   * List video jobs
   */
  async listJobs(options?: {
    type?: VideoType;
    limit?: number;
    offset?: number;
  }): Promise<{ jobs: VideoJob[]; total: number }> {
    const params: Record<string, string> = {};
    if (options?.type) params.type = options.type;
    if (options?.limit) params.limit = String(options.limit);
    if (options?.offset) params.offset = String(options.offset);

    const response = await this.client.get("/api/v2/video/", params);
    return {
      jobs: (response.jobs || []).map((j: Record<string, unknown>) => this.mapJob(j)),
      total: response.total || 0,
    };
  }

  /**
   * Wait for video job to complete
   */
  async waitForCompletion(
    jobId: string,
    options?: { timeout?: number; pollInterval?: number }
  ): Promise<VideoDownload> {
    const timeout = options?.timeout || DEFAULT_TIMEOUT;
    const pollInterval = options?.pollInterval || POLL_INTERVAL;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const job = await this.getJob(jobId);

      if (job.status === "completed") {
        return this.getDownload(jobId);
      }

      if (job.status === "failed") {
        throw new Error(`Video generation failed: ${job.error || "Unknown error"}`);
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Timeout waiting for video ${jobId}`);
  }

  private mapJob(response: Record<string, unknown>): VideoJob {
    return {
      id: response.id as string,
      type: response.type as VideoType,
      status: response.status as string,
      progress: (response.progress as number) || 0,
      currentStep: (response.current_step as string) || "",
      createdAt: response.created_at as number,
      updatedAt: response.updated_at as number,
      etaSeconds: response.eta_seconds as number | undefined,
      error: response.error as string | undefined,
    };
  }
}
