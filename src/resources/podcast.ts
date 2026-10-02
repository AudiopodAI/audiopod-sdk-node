/**
 * Podcast Studio Service — script a multi-speaker podcast from a topic or
 * grounding sources, then render it to audio.
 *
 * The pipeline: create a project (with speakers) → optionally add grounding
 * sources → generate/edit an outline → generate/edit the transcript → generate
 * the audio → poll progress. Speaker and episode "profiles" are reusable
 * presets you can attach to future projects.
 */

import type AudioPod from "../client";
import type {
  PodcastProjectCreateParams,
  PodcastProjectUpdateParams,
  PodcastProject,
  PodcastSegment,
  PodcastDialogue,
  PodcastSourceParams,
  PodcastOutlineGenerateParams,
  PodcastRegenerateDialogueParams,
  PodcastSpeakerUpdateParams,
  PodcastSpeakerProfileCreateParams,
  PodcastSpeakerProfileUpdateParams,
  PodcastEpisodeProfileCreateParams,
  PodcastEpisodeProfileUpdateParams,
  PodcastGenerationProgress,
} from "../types";

const BASE = "/api/v1/podcast";
const POLL_INTERVAL = 5000;
const DEFAULT_TIMEOUT = 1_800_000; // 30 minutes

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class Podcast {
  constructor(private client: AudioPod) {}

  // --------------------------------------------------------------- projects
  /**
   * Create a podcast project.
   *
   * @example
   * ```typescript
   * const project = await client.podcast.createProject({
   *   title: 'Tigers of the Sundarbans',
   *   topic: 'Conservation of the Bengal tiger',
   *   qualityPreset: 'standard',
   *   speakers: [
   *     { name: 'Ava', role: 'Host' },
   *     { name: 'Dr. Bose', role: 'Expert' },
   *   ],
   * });
   * ```
   */
  async createProject(
    params: PodcastProjectCreateParams
  ): Promise<PodcastProject> {
    return this.client.post(`${BASE}/projects`, {
      title: params.title,
      topic: params.topic,
      briefing: params.briefing,
      key_points: params.keyPoints,
      language: params.language,
      quality_preset: params.qualityPreset,
      target_duration_minutes: params.targetDurationMinutes,
      speakers: params.speakers.map((s) => ({
        name: s.name,
        role: s.role,
        voice_type: s.voiceType,
        voice_id: s.voiceId,
        voice_ref_id: s.voiceRefId,
        language: s.language,
        use_turbo: s.useTurbo,
        backstory: s.backstory,
        personality: s.personality,
      })),
      episode_profile_id: params.episodeProfileId,
      briefing_suffix: params.briefingSuffix,
    });
  }

  /** List your podcast projects. */
  async listProjects(
    params: { page?: number; pageSize?: number; statusFilter?: string } = {}
  ): Promise<any> {
    return this.client.get(`${BASE}/projects`, {
      page: params.page,
      page_size: params.pageSize,
      status_filter: params.statusFilter,
    });
  }

  /** Get a single podcast project. */
  async getProject(projectId: string): Promise<PodcastProject> {
    return this.client.get(`${BASE}/projects/${projectId}`);
  }

  /** Update a project's metadata (title, topic, briefing, quality, …). */
  async updateProject(
    projectId: string,
    params: PodcastProjectUpdateParams
  ): Promise<PodcastProject> {
    return this.client.put(`${BASE}/projects/${projectId}`, {
      title: params.title,
      topic: params.topic,
      briefing: params.briefing,
      key_points: params.keyPoints,
      language: params.language,
      quality_preset: params.qualityPreset,
      target_duration_minutes: params.targetDurationMinutes,
    });
  }

  /** Delete a project. */
  async deleteProject(projectId: string): Promise<any> {
    return this.client.delete(`${BASE}/projects/${projectId}`);
  }

  // ---------------------------------------------------------------- sources
  /**
   * Add a grounding source to a project (text, a URL, a YouTube video, or an
   * uploaded file). The endpoint is `multipart/form-data`.
   */
  async addSource(
    projectId: string,
    params: PodcastSourceParams
  ): Promise<any> {
    const fields: Record<string, any> = {
      source_type: params.sourceType,
      text: params.text,
      url: params.url,
    };
    if (params.file) {
      return this.client.upload(
        `${BASE}/projects/${projectId}/sources`,
        params.file,
        "file",
        fields
      );
    }
    return this.client.postForm(
      `${BASE}/projects/${projectId}/sources`,
      fields
    );
  }

  /** List a project's grounding sources. */
  async listSources(projectId: string): Promise<any> {
    return this.client.get(`${BASE}/projects/${projectId}/sources`);
  }

  /** Remove a grounding source from a project. */
  async deleteSource(projectId: string, sourceId: string): Promise<any> {
    return this.client.delete(
      `${BASE}/projects/${projectId}/sources/${sourceId}`
    );
  }

  // ---------------------------------------------------------------- outline
  /** Generate an outline for the project. */
  async generateOutline(
    projectId: string,
    params: PodcastOutlineGenerateParams = {}
  ): Promise<any> {
    return this.client.post(`${BASE}/projects/${projectId}/outline/generate`, {
      num_segments: params.numSegments,
      focus_areas: params.focusAreas,
      target_duration_minutes: params.targetDurationMinutes,
    });
  }

  /** Replace the project's outline with your own segments. */
  async updateOutline(
    projectId: string,
    segments: PodcastSegment[]
  ): Promise<any> {
    return this.client.put(`${BASE}/projects/${projectId}/outline`, {
      segments: segments.map((s) => ({
        title: s.title,
        description: s.description,
        size: s.size,
      })),
    });
  }

  // ------------------------------------------------------------- transcript
  /** Generate the dialogue transcript from the outline. */
  async generateTranscript(projectId: string): Promise<any> {
    return this.client.post(
      `${BASE}/projects/${projectId}/transcript/generate`,
      {}
    );
  }

  /** Replace the project's transcript with your own dialogues. */
  async updateTranscript(
    projectId: string,
    dialogues: PodcastDialogue[]
  ): Promise<any> {
    return this.client.put(`${BASE}/projects/${projectId}/transcript`, {
      dialogues: dialogues.map((d) => ({
        ...(d.id === undefined ? {} : { id: d.id }),
        speaker: d.speaker,
        text: d.text,
        use_turbo: d.useTurbo,
      })),
    });
  }

  // ------------------------------------------------------------------ audio
  /** Per-dialogue cost + duration estimate for the project's audio. */
  async estimateAudio(projectId: string): Promise<any> {
    return this.client.get(`${BASE}/projects/${projectId}/audio/estimate`);
  }

  /**
   * Kick off audio generation for the project. Returns a `job_id`; poll
   * {@link Podcast.getProgress} or use {@link Podcast.waitForCompletion}.
   *
   * @param params.regenerateAll - Re-render every dialogue, not just pending ones.
   */
  async generateAudio(
    projectId: string,
    params: { regenerateAll?: boolean } = {}
  ): Promise<any> {
    return this.client.post(`${BASE}/projects/${projectId}/audio/generate`, {
      regenerate_all: params.regenerateAll ?? false,
    });
  }

  /** Regenerate the audio for a single dialogue line (optionally with new text). */
  async regenerateDialogue(
    projectId: string,
    params: PodcastRegenerateDialogueParams
  ): Promise<any> {
    return this.client.post(
      `${BASE}/projects/${projectId}/dialogue/regenerate`,
      {
        dialogue_id: params.dialogueId,
        new_text: params.newText,
      }
    );
  }

  /** Current generation progress for the project. */
  async getProgress(projectId: string): Promise<PodcastGenerationProgress> {
    return this.client.get(`${BASE}/projects/${projectId}/progress`);
  }

  /**
   * Poll {@link Podcast.getProgress} until the project's audio reaches
   * `completed` (throws on `failed`).
   */
  async waitForCompletion(
    projectId: string,
    opts: { timeoutMs?: number; pollIntervalMs?: number } = {}
  ): Promise<PodcastGenerationProgress> {
    const timeout = opts.timeoutMs ?? DEFAULT_TIMEOUT;
    const interval = opts.pollIntervalMs ?? POLL_INTERVAL;
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const progress = await this.getProgress(projectId);
      const status = String(progress.status ?? "").toLowerCase();
      if (status === "completed") return progress;
      if (status === "failed") {
        throw new Error(
          `Podcast audio generation failed: ${progress.error_message || "Unknown error"}`
        );
      }
      await sleep(interval);
    }
    throw new Error(
      `Podcast audio generation for ${projectId} did not finish in time`
    );
  }

  // --------------------------------------------------------------- speakers
  /** Update a speaker on an existing project. */
  async updateSpeaker(
    projectId: string,
    speakerId: string,
    params: PodcastSpeakerUpdateParams
  ): Promise<any> {
    return this.client.put(
      `${BASE}/projects/${projectId}/speakers/${speakerId}`,
      {
        name: params.name,
        role: params.role,
        voice_ref_id: params.voiceRefId,
        backstory: params.backstory,
        personality: params.personality,
        language: params.language,
      }
    );
  }

  // -------------------------------------------------------- speaker profiles
  /** List your reusable speaker profiles. */
  async listSpeakerProfiles(): Promise<any> {
    return this.client.get(`${BASE}/speaker-profiles`);
  }

  /** Create a reusable speaker profile. */
  async createSpeakerProfile(
    params: PodcastSpeakerProfileCreateParams
  ): Promise<any> {
    return this.client.post(`${BASE}/speaker-profiles`, {
      name: params.name,
      speaker_name: params.speakerName,
      voice_id: params.voiceId,
      backstory: params.backstory,
      personality: params.personality,
      role: params.role,
      language: params.language,
    });
  }

  /** Update a reusable speaker profile. */
  async updateSpeakerProfile(
    profileId: string,
    params: PodcastSpeakerProfileUpdateParams
  ): Promise<any> {
    return this.client.put(`${BASE}/speaker-profiles/${profileId}`, {
      name: params.name,
      speaker_name: params.speakerName,
      voice_id: params.voiceId,
      backstory: params.backstory,
      personality: params.personality,
      role: params.role,
      language: params.language,
    });
  }

  /** Delete a reusable speaker profile. */
  async deleteSpeakerProfile(profileId: string): Promise<any> {
    return this.client.delete(`${BASE}/speaker-profiles/${profileId}`);
  }

  // -------------------------------------------------------- episode profiles
  /** List your reusable episode profiles. */
  async listEpisodeProfiles(): Promise<any> {
    return this.client.get(`${BASE}/episode-profiles`);
  }

  /** Create a reusable episode profile. */
  async createEpisodeProfile(
    params: PodcastEpisodeProfileCreateParams
  ): Promise<any> {
    return this.client.post(`${BASE}/episode-profiles`, {
      name: params.name,
      description: params.description,
      default_briefing: params.defaultBriefing,
      num_segments: params.numSegments,
      tone: params.tone,
      format: params.format,
    });
  }

  /** Update a reusable episode profile. */
  async updateEpisodeProfile(
    profileId: string,
    params: PodcastEpisodeProfileUpdateParams
  ): Promise<any> {
    return this.client.put(`${BASE}/episode-profiles/${profileId}`, {
      name: params.name,
      description: params.description,
      default_briefing: params.defaultBriefing,
      num_segments: params.numSegments,
      tone: params.tone,
      format: params.format,
    });
  }

  /** Delete a reusable episode profile. */
  async deleteEpisodeProfile(profileId: string): Promise<any> {
    return this.client.delete(`${BASE}/episode-profiles/${profileId}`);
  }

  // --------------------------------------------------------------- misc
  /** Enable the account's public podcast feed. */
  async feed(): Promise<any> {
    return this.client.post(`${BASE}/feed`, {});
  }

  /** Podcast studio dashboard (project counts, recent episodes, …). */
  async dashboard(): Promise<any> {
    return this.client.get(`${BASE}/dashboard`);
  }

  /** Built-in narration voice presets available to podcast speakers. */
  async voicePresets(): Promise<any> {
    return this.client.get(`${BASE}/voices/presets`);
  }
}
