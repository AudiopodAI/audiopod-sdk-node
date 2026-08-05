/**
 * Audiobook Service - Turn a manuscript into a finished, ACX-compliant audiobook.
 *
 * The full pipeline, end to end: create a project, add a manuscript (upload a
 * PDF/EPUB, paste text, or generate from a prompt), narrate it, export an
 * ACX-compliant package, and download it. Use {@link Audiobook.produce} for the
 * whole flow in one call, or drive each step yourself.
 */

import type AudioPod from '../client';

const BASE = '/api/v1/audiobook';

export interface CreateProjectParams {
  title: string;
  author?: string;
  description?: string;
  isbn?: string;
  genre?: string;
  [key: string]: any;
}

export interface GenerateBookParams {
  prompt: string;
  title?: string;
  audience?: string;
  tone?: string;
  chapterCount?: number;
  wordsPerChapter?: number;
}

export interface NarrateParams {
  voiceId: number;
  chapterIds?: string[];
  narrationSpeed?: number;
  narrationStyle?: string;
}

export interface ProduceParams {
  title: string;
  voiceId: number;
  file?: string;
  text?: string;
  author?: string;
  narrationSpeed?: number;
  narrationStyle?: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
}

/** Narrate (or re-narrate) one paragraph. Every field is optional — omitted
 *  fields fall back to the paragraph's stored settings. */
export interface NarrateParagraphParams {
  /** Voice override for this take. */
  voiceId?: number;
  /** Narrate this text instead of the stored paragraph text. */
  textOverride?: string;
  /** 0.5–2.0. */
  narrationSpeed?: number;
  narrationStyle?: string;
  emotion?: string;
  characterName?: string;
  /**
   * Performance direction for this take — a short stage note the narrator acts
   * on, e.g. `"urgent, low, barely audible"`.
   *
   * The field accepts up to 500 characters, but only the first ~110 shape the
   * performance; anything beyond that is not voiced. Write one instruction of
   * roughly a dozen words. When a direction is longer than that, the response
   * carries a `warnings` entry saying so.
   */
  direction?: string;
}

/** Optional extras for {@link Audiobook.parseManuscript}. */
export interface ParseManuscriptParams {
  /** Re-parse a project that already has chapters. Destructive: existing
   *  chapters and paragraphs are replaced. */
  force?: boolean;
  /**
   * Direct the book automatically once parsing finishes, so narration is
   * expressive by default. Omit to accept the default for your auth method —
   * which is OFF for API keys. See {@link Audiobook.autoDirect}.
   */
  autoDirection?: boolean;
}

/** Per-run narration settings for {@link Audiobook.batchNarrate}. */
export interface NarrationSettings {
  /**
   * How expressive vs. consistent the read is. Book narration defaults to
   * `"stable"` — it keeps one narrator across hundreds of paragraphs, at the
   * cost of performance range. `"creative"` gives the voice the most range.
   */
  delivery_mode?: 'stable' | 'balanced' | 'creative';
  /** 0.5–2.0. */
  speed?: number;
  /** Bare language subtag, e.g. `"it"`. Omit to use the project's language. */
  language?: string;
  [key: string]: any;
}

/** Optional scope for {@link Audiobook.autoDirect}. */
export interface AutoDirectParams {
  /** Direct only these chapters. Omit to direct the whole book. */
  chapterIds?: string[];
}

/** What {@link Audiobook.autoDirect} queued. */
export interface AutoDirectionJob {
  job_id: string;
  total_chapters: number;
}

/** Progress of an auto-direction run. */
export interface AutoDirectionStatus {
  job_id: string;
  status: string;
  progress: number;
  current_step?: string | null;
  error_message?: string | null;
  result?: {
    directed_count: number;
    skipped_user_edited: number;
    skipped_stale: number;
    chapters_processed: number;
    total_chapters: number;
  } | null;
}

/** Queue one job that narrates many paragraphs sequentially. Omit both
 *  `chapterIds` and `paragraphIds` to narrate the whole project. */
export interface BatchNarrateParams {
  /** Voice override applied to every selected paragraph. */
  voiceId?: number;
  chapterIds?: string[];
  paragraphIds?: string[];
  /** Re-narrate paragraphs that already have audio (default false). */
  includeCompleted?: boolean;
  /** Include locked paragraphs (default false). */
  includeLocked?: boolean;
  /** Include paragraphs flagged `skip_narration` (default false). */
  includeSkipped?: boolean;
  /**
   * Extra narration settings passed through verbatim.
   *
   * `delivery_mode` is the expressiveness lever: `"stable"` holds one steady
   * narrator across a long book, `"creative"` gives the voice the most range,
   * `"balanced"` sits between. Book narration defaults to `"stable"` for voice
   * consistency, so pass `"creative"` when a title wants a performed read.
   * `speed` (0.5–2.0) and `language` (e.g. `"it"`) are also honoured here.
   */
  narrationSettings?: NarrationSettings;
}

/** One paragraph — the narration unit. */
export interface AudiobookParagraph {
  id: string;
  chapter_id: string;
  project_id: string;
  position: number;
  text: string;
  word_count: number;
  character_count: number;
  voice_id?: number | null;
  narration_speed?: number | null;
  narration_style?: string | null;
  emotion?: string | null;
  character_name?: string | null;
  direction?: string | null;
  /** Explicit silence (ms) after this paragraph; null = automatic gap. */
  pause_after_ms?: number | null;
  review_flags?: Record<string, any> | null;
  audio_file_path?: string | null;
  duration_seconds?: number | null;
  status: string;
  locked: boolean;
  skip_narration: boolean;
  error_message?: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

/** `GET .../chapters/{id}/paragraphs`. `total` is always the FULL chapter count;
 *  `page`/`per_page` are null when the caller asked for every paragraph. */
export interface AudiobookParagraphListResponse {
  paragraphs: AudiobookParagraph[];
  total: number;
  page?: number | null;
  per_page?: number | null;
  has_next?: boolean;
  has_prev?: boolean;
}

/** `POST .../paragraphs/{id}/narrate`. */
export interface AudiobookParagraphNarrationJob {
  task_id: string;
  paragraph_id: string;
  status: string;
  billing?: {
    is_free_regen: boolean;
    estimated_credits: number;
    estimated_chars: number;
    estimated_seconds: number;
    take_number_after: number;
  };
  [key: string]: any;
}

/** `POST .../narration/batch`. */
export interface AudiobookBatchNarrationJob {
  job_id: number;
  total_paragraphs: number;
  skipped_paragraphs: number;
  estimated_completion_time?: string | null;
  [key: string]: any;
}

/** `POST .../narration/cancel`. Cancellation is resume-not-restart: paragraphs
 *  that already have audio are kept, un-narrated ones are reset to runnable, and
 *  charges for the undelivered paragraphs are released. */
export interface AudiobookNarrationCancellation {
  job_id: number;
  status: string;
  /** Paragraphs that already had audio — left untouched. */
  paragraphs_kept: number;
  /** Un-narrated paragraphs returned to a runnable state. */
  paragraphs_reset: number;
  /** Credits released for the undelivered paragraphs. */
  billing_released: number;
  project_status: string;
  [key: string]: any;
}

export interface AudiobookChapter {
  id: string;
  project_id: string;
  chapter_number: number;
  title: string;
  content?: string;
  word_count: number;
  character_count: number;
  estimated_duration_minutes?: number | null;
  audio_file_path?: string | null;
  duration_seconds?: number | null;
  status: string;
  error_message?: string | null;
  retry_count: number;
  skip_narration: boolean;
  voice_id?: number | null;
  narration_notes?: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

export interface AudiobookProject {
  id: string;
  user_id: string;
  title: string;
  author?: string | null;
  status: string;
  total_chapters: number;
  estimated_duration_minutes?: number | null;
  manuscript_filename?: string | null;
  manuscript_format?: string | null;
  manuscript_word_count?: number | null;
  source_type?: string;
  selected_voice_id?: number | null;
  narration_speed?: number;
  narration_style?: string;
  parsing_completed_at?: string | null;
  narration_started_at?: string | null;
  narration_completed_at?: string | null;
  production_completed_at?: string | null;
  /** Sanitized failure reason; null unless something failed. */
  error_message?: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

/** `GET /projects/{id}`. `chapters` is `null` unless `includeChapters` was set —
 *  distinct from `[]`, which means "asked for, and there are none". */
export interface AudiobookProjectWithChapters extends AudiobookProject {
  chapters?: AudiobookChapter[] | null;
}

/** Project statuses that mean the manuscript is parsed and chaptered. */
const PARSED_STATUSES = [
  'ready_for_narration',
  'narrating',
  'ready_for_production',
  'mixing',
  'ready_for_export',
  'exporting',
  'completed',
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class Audiobook {
  constructor(private client: AudioPod) {}

  // --------------------------------------------------------------- projects
  /** Create an audiobook project. */
  async createProject(params: CreateProjectParams): Promise<any> {
    return this.client.post(`${BASE}/projects`, params);
  }

  /** List your audiobook projects. `page` is 1-based; `perPage` maxes out at 100. */
  async listProjects(
    params: { page?: number; perPage?: number; statusFilter?: string; search?: string } = {},
  ): Promise<any> {
    return this.client.get(`${BASE}/projects`, {
      page: params.page ?? 1,
      per_page: params.perPage ?? 20,
      status_filter: params.statusFilter,
      search: params.search,
    });
  }

  /**
   * Get a single project.
   *
   * Pass `includeChapters` to get the project's chapters inline and skip a
   * second round-trip; otherwise `chapters` comes back `null`.
   */
  async getProject(projectId: string, params: { includeChapters?: boolean } = {}): Promise<AudiobookProjectWithChapters> {
    return this.client.get(`${BASE}/projects/${projectId}`, {
      include_chapters: params.includeChapters,
    });
  }

  /** Delete a project. */
  async deleteProject(projectId: string): Promise<any> {
    return this.client.delete(`${BASE}/projects/${projectId}`);
  }

  // ------------------------------------------------------------- manuscript
  /** Upload a manuscript file (PDF, EPUB, DOCX, or TXT). Returns a `file_key`. */
  async uploadManuscript(projectId: string, file: string): Promise<any> {
    return this.client.upload(`${BASE}/projects/${projectId}/manuscript/upload`, file, 'file');
  }

  /**
   * Parse an uploaded manuscript into chapters (async; returns a parse `job_id`).
   *
   * `autoDirection` runs {@link Audiobook.autoDirect} automatically once parsing
   * finishes. It defaults to **off for API-key callers** (this SDK) so an
   * integration's narration does not change without asking for it — pass `true`
   * to opt in per parse, or call `autoDirect` later on a book you already have.
   */
  async parseManuscript(
    projectId: string,
    fileKey: string,
    filename: string,
    params: ParseManuscriptParams = {},
  ): Promise<any> {
    const body: Record<string, any> = { file_key: fileKey, filename };
    if (params.force !== undefined) body.force = params.force;
    // Only sent when the caller states one: absent is a real third state that
    // means "use the default for my auth method", and `false` is an explicit
    // "parse but leave the directions alone".
    if (params.autoDirection !== undefined) body.auto_direction = params.autoDirection;
    return this.client.postForm(`${BASE}/projects/${projectId}/manuscript/parse`, body);
  }

  /** Add a manuscript by pasting raw text. */
  async pasteText(projectId: string, text: string): Promise<any> {
    return this.client.post(`${BASE}/projects/${projectId}/manuscript/paste`, { text });
  }

  /** Draft an original manuscript from a prompt, then chapter it. */
  async generateBook(projectId: string, params: GenerateBookParams): Promise<any> {
    return this.client.post(`${BASE}/projects/${projectId}/manuscript/generate`, {
      prompt: params.prompt,
      title: params.title,
      audience: params.audience,
      tone: params.tone ?? 'warm',
      chapter_count: params.chapterCount ?? 3,
      words_per_chapter: params.wordsPerChapter ?? 600,
    });
  }

  // --------------------------------------------------------------- chapters
  /** List chapters in a project. `page` is 1-based; `perPage` maxes out at 500. */
  async listChapters(projectId: string, params: { page?: number; perPage?: number } = {}): Promise<any> {
    return this.client.get(`${BASE}/projects/${projectId}/chapters`, {
      page: params.page ?? 1,
      per_page: params.perPage ?? 50,
    });
  }

  /** Get a single chapter. */
  async getChapter(projectId: string, chapterId: string): Promise<any> {
    return this.client.get(`${BASE}/projects/${projectId}/chapters/${chapterId}`);
  }

  /** Edit a chapter (`title`, `content`, `skip_narration`, `voice_id`, `narration_notes`). */
  async updateChapter(projectId: string, chapterId: string, fields: Record<string, any>): Promise<any> {
    return this.client.put(`${BASE}/projects/${projectId}/chapters/${chapterId}`, fields);
  }

  /** Re-render a single chapter's audio (e.g. after an edit). */
  async regenerateChapter(projectId: string, chapterId: string): Promise<any> {
    return this.client.post(`${BASE}/projects/${projectId}/chapters/${chapterId}/regenerate`);
  }

  // ------------------------------------------------------------- paragraphs
  /**
   * List a chapter's paragraphs, ordered by position.
   *
   * Omit `page`/`perPage` (the default) and you get EVERY paragraph in the
   * chapter. Pass them to page through instead — `total` is always the full
   * chapter count either way.
   */
  async listParagraphs(
    projectId: string,
    chapterId: string,
    params: { page?: number; perPage?: number } = {},
  ): Promise<AudiobookParagraphListResponse> {
    return this.client.get(`${BASE}/projects/${projectId}/chapters/${chapterId}/paragraphs`, {
      page: params.page,
      per_page: params.perPage,
    });
  }

  /** Get a single paragraph (use this to poll narration status). */
  async getParagraph(projectId: string, paragraphId: string): Promise<AudiobookParagraph> {
    return this.client.get(`${BASE}/projects/${projectId}/paragraphs/${paragraphId}`);
  }

  /** Edit a paragraph (`text`, `voice_id`, `narration_speed`, `narration_style`, …). */
  async updateParagraph(projectId: string, paragraphId: string, fields: Record<string, any>): Promise<AudiobookParagraph> {
    return this.client.put(`${BASE}/projects/${projectId}/paragraphs/${paragraphId}`, fields);
  }

  /**
   * Narrate (or re-narrate) a single paragraph. Returns immediately with a
   * `task_id`; poll {@link Audiobook.getParagraph} for the result.
   *
   * Billing: the first take is billed, the first regeneration is free,
   * subsequent regenerations are billed again.
   */
  async narrateParagraph(
    projectId: string,
    paragraphId: string,
    params: NarrateParagraphParams = {},
  ): Promise<AudiobookParagraphNarrationJob> {
    return this.client.post(`${BASE}/projects/${projectId}/paragraphs/${paragraphId}/narrate`, {
      voice_id: params.voiceId,
      text_override: params.textOverride,
      narration_speed: params.narrationSpeed,
      narration_style: params.narrationStyle,
      emotion: params.emotion,
      character_name: params.characterName,
      direction: params.direction,
    });
  }

  /**
   * Queue one job that narrates many paragraphs sequentially. Omit both id
   * lists to narrate the whole project.
   */
  async batchNarrate(projectId: string, params: BatchNarrateParams = {}): Promise<AudiobookBatchNarrationJob> {
    return this.client.post(`${BASE}/projects/${projectId}/narration/batch`, {
      voice_id: params.voiceId,
      chapter_ids: params.chapterIds,
      paragraph_ids: params.paragraphIds,
      include_completed: params.includeCompleted ?? false,
      include_locked: params.includeLocked ?? false,
      include_skipped: params.includeSkipped ?? false,
      narration_settings: params.narrationSettings ?? {},
    });
  }

  /**
   * Abort the project's running narration batch.
   *
   * Resume-not-restart: paragraphs that already have audio are left untouched,
   * only the un-narrated paragraphs are reset to a runnable state so a later
   * {@link Audiobook.batchNarrate} picks up where this left off, and charges
   * for the undelivered paragraphs are released.
   *
   * If nothing is running (e.g. a prior cancel already succeeded) the call is
   * idempotent and rejects with an `APIError` whose `statusCode` is 404 and
   * whose error code is `no_narration_running` — the "nothing left to stop"
   * case, not a failure.
   */
  async cancelNarration(projectId: string): Promise<AudiobookNarrationCancellation> {
    return this.client.post(`${BASE}/projects/${projectId}/narration/cancel`);
  }

  // -------------------------------------------------------------- direction
  /**
   * Write contextual reading direction onto every narratable paragraph, so the
   * book narrates expressively instead of flat.
   *
   * Two passes: one narration brief for the whole book (its reading identity,
   * derived from the metadata and opening pages), then a short performance note
   * plus an emotion per paragraph, anchored to that brief so the tone holds
   * across chapters instead of drifting. Dialogue gets directed as dialogue.
   *
   * Free on every plan. It never re-splits or deletes anything — it only writes
   * `direction`/`emotion` onto rows that already exist — and a direction YOU
   * wrote is never overwritten: those rows are marked user-owned and skipped.
   *
   * Directing does not re-render existing audio. Follow it with
   * {@link Audiobook.batchNarrate} (`includeCompleted: true`) to hear it.
   *
   * @throws 409 when a direction run is already in flight for this project.
   */
  async autoDirect(projectId: string, params: AutoDirectParams = {}): Promise<AutoDirectionJob> {
    const body: Record<string, any> = {};
    if (params.chapterIds) body.chapter_ids = params.chapterIds;
    return this.client.post(`${BASE}/projects/${projectId}/direction/auto`, body);
  }

  /** Progress of a specific auto-direction run. */
  async autoDirectionStatus(projectId: string, jobId: string | number): Promise<AutoDirectionStatus> {
    return this.client.get(`${BASE}/projects/${projectId}/direction/auto/${jobId}/status`);
  }

  /** Progress of this project's most recent auto-direction run. */
  async latestAutoDirection(projectId: string): Promise<AutoDirectionStatus> {
    return this.client.get(`${BASE}/projects/${projectId}/direction/auto/latest`);
  }

  /** Direct the book and block until the run finishes. */
  async autoDirectAndWait(
    projectId: string,
    params: AutoDirectParams = {},
    opts: { timeoutMs?: number; pollIntervalMs?: number } = {},
  ): Promise<AutoDirectionStatus> {
    const job = await this.autoDirect(projectId, params);
    // Server-side a wedged run is treated as dead after 90 minutes; there is no
    // point waiting longer than the service itself would.
    const timeout = opts.timeoutMs ?? 900_000;
    const interval = opts.pollIntervalMs ?? 3000;
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const status = await this.autoDirectionStatus(projectId, job.job_id);
      const state = (status.status || '').toUpperCase();
      if (state === 'COMPLETED' || state === 'FAILED' || state === 'CANCELED') return status;
      await new Promise((r) => setTimeout(r, interval));
    }
    throw new Error(`Auto direction did not finish within ${timeout}ms (job ${job.job_id})`);
  }

  // ----------------------------------------------------------------- voices
  /** List narration voices (`available_voices`, `recommended_voices`, `user_custom_voices`). */
  async listVoices(): Promise<any> {
    return this.client.get(`${BASE}/voices/available`);
  }

  /** List supported narration languages. */
  async listLanguages(): Promise<any> {
    return this.client.get(`${BASE}/voices/languages`);
  }

  /** Per-paragraph cost breakdown for a project before narrating. */
  async costEstimate(projectId: string): Promise<any> {
    return this.client.get(`${BASE}/projects/${projectId}/cost-estimate`);
  }

  // -------------------------------------------------------------- narration
  /**
   * Queue narration for all chapters (or `chapterIds`) without waiting.
   *
   * Posts to `/narration/batch`. The older `/narration/start` route was retired
   * (PLAT-2087) because it bypassed metering, and now returns 410 Gone
   * unconditionally — so every call through this method, including
   * {@link Audiobook.produce}, used to fail outright. `batch` narrates the whole
   * project when no `chapterIds` are given, which is what this has always meant.
   */
  async startNarration(projectId: string, params: NarrateParams): Promise<any> {
    return this.client.post(`${BASE}/projects/${projectId}/narration/batch`, {
      voice_id: params.voiceId,
      chapter_ids: params.chapterIds,
      // The batch worker reads these out of narration_settings under the SHORT
      // keys "speed"/"style" — narration_speed/narration_style would be accepted
      // and then silently dropped.
      narration_settings: {
        speed: params.narrationSpeed ?? 1.0,
        style: params.narrationStyle ?? 'narrative',
      },
    });
  }

  /** Current narration progress. */
  async narrationProgress(projectId: string): Promise<any> {
    return this.client.get(`${BASE}/projects/${projectId}/narration/progress`);
  }

  /** Narrate the project, waiting for all chapters to finish. */
  async narrate(projectId: string, params: NarrateParams, opts: { timeoutMs?: number; pollIntervalMs?: number } = {}): Promise<any> {
    await this.startNarration(projectId, params);
    return this.waitForNarration(projectId, opts);
  }

  /** Block until narration finishes (`completed + failed >= total`). */
  async waitForNarration(projectId: string, opts: { timeoutMs?: number; pollIntervalMs?: number } = {}): Promise<any> {
    const timeout = opts.timeoutMs ?? 1_800_000;
    const interval = opts.pollIntervalMs ?? 5000;
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const p = await this.narrationProgress(projectId);
      const total = p.total_chapters ?? 0;
      if (total && (p.completed_chapters ?? 0) + (p.failed_chapters ?? 0) >= total) return p;
      await sleep(interval);
    }
    throw new Error(`Narration for ${projectId} did not finish in time`);
  }

  // ----------------------------------------------------------------- export
  /** Start an ACX export (runs a compliance check). Returns a `job_id` + `compliance_check`. */
  async startExport(projectId: string, includeChapters?: string[]): Promise<any> {
    return this.client.post(`${BASE}/projects/${projectId}/export`, includeChapters ? { include_chapters: includeChapters } : {});
  }

  /** Status of an export job. */
  async exportStatus(projectId: string, jobId: number): Promise<any> {
    return this.client.get(`${BASE}/projects/${projectId}/export/${jobId}/status`);
  }

  /** Start an ACX export and wait for it to complete; returns the export job (with `job_id`). */
  async exportAndWait(projectId: string, opts: { includeChapters?: string[]; timeoutMs?: number; pollIntervalMs?: number } = {}): Promise<any> {
    const started = await this.startExport(projectId, opts.includeChapters);
    if (started.job_id != null) await this.waitForExport(projectId, started.job_id, opts);
    return started;
  }

  /** Block until an export job reaches `COMPLETED` (throws on failure). */
  async waitForExport(projectId: string, jobId: number, opts: { timeoutMs?: number; pollIntervalMs?: number } = {}): Promise<any> {
    const timeout = opts.timeoutMs ?? 600_000;
    const interval = opts.pollIntervalMs ?? 5000;
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const s = await this.exportStatus(projectId, jobId);
      const status = String(s.status ?? '').toUpperCase();
      if (['COMPLETED', 'SUCCESS', 'DONE'].includes(status)) return s;
      if (['FAILED', 'ERROR'].includes(status)) throw new Error(`Export ${jobId} failed: ${JSON.stringify(s)}`);
      await sleep(interval);
    }
    throw new Error(`Export ${jobId} did not finish in time`);
  }

  /** Get the ACX package manifest, including a presigned `download_url` to the ZIP. */
  async download(projectId: string, jobId: number): Promise<any> {
    return this.client.get(`${BASE}/projects/${projectId}/export/${jobId}/download`);
  }

  // --------------------------------------------------------------- one-call
  /**
   * Run the whole pipeline and return the ACX package manifest.
   *
   * Provide a manuscript via `file` (PDF/EPUB/DOCX/TXT) or `text`. Creates a
   * project, ingests + parses the manuscript, narrates with `voiceId`, exports
   * an ACX package, and returns its `download_url`.
   */
  async produce(params: ProduceParams): Promise<any> {
    if (!params.file && !params.text) throw new Error('Provide either file or text');
    const opts = { timeoutMs: params.timeoutMs, pollIntervalMs: params.pollIntervalMs };

    const project = await this.createProject({ title: params.title, author: params.author });
    const pid = project.id;

    if (params.file) {
      const up = await this.uploadManuscript(pid, params.file);
      const filename = params.file.split('/').pop() as string;
      await this.parseManuscript(pid, up.file_key, filename);
    } else {
      await this.pasteText(pid, params.text as string);
    }
    await this.waitForChapters(pid, opts);

    await this.narrate(pid, {
      voiceId: params.voiceId,
      narrationSpeed: params.narrationSpeed,
      narrationStyle: params.narrationStyle,
    }, opts);
    const exp = await this.exportAndWait(pid, opts);
    const manifest = await this.download(pid, exp.job_id);
    return { project_id: pid, export_job_id: exp.job_id, compliance_check: exp.compliance_check, ...manifest };
  }

  /**
   * Block until the manuscript has finished parsing into chapters.
   *
   * Manuscript parsing is asynchronous and there is no parse-status endpoint,
   * so this polls the project itself. It resolves with the project as soon as
   * parsing has completed, and rejects **immediately** if the parse failed —
   * unlike polling the chapter list for a non-empty result, which never
   * terminates on failure.
   */
  async waitForParse(projectId: string, opts: { timeoutMs?: number; pollIntervalMs?: number } = {}): Promise<AudiobookProject> {
    const timeout = opts.timeoutMs ?? 600_000;
    const interval = opts.pollIntervalMs ?? 3000;
    const start = Date.now();
    let last: AudiobookProject | undefined;
    while (Date.now() - start < timeout) {
      const project = await this.getProject(projectId);
      last = project;
      const status = String(project.status ?? '').toLowerCase();
      if (project.error_message) {
        throw new Error(`Manuscript for ${projectId} failed to parse: ${project.error_message}`);
      }
      if (status === 'failed') {
        throw new Error(`Manuscript for ${projectId} failed to parse (project status: failed)`);
      }
      if (project.parsing_completed_at || PARSED_STATUSES.includes(status)) return project;
      await sleep(interval);
    }
    throw new Error(
      `Manuscript for ${projectId} did not parse in time ` +
        `(last status: ${last?.status ?? 'unknown'}, parsing_completed_at: ${last?.parsing_completed_at ?? 'null'})`,
    );
  }

  /** @internal Wait for the manuscript to parse, then return its chapters. */
  private async waitForChapters(projectId: string, opts: { timeoutMs?: number; pollIntervalMs?: number } = {}): Promise<any[]> {
    await this.waitForParse(projectId, opts);
    const data = await this.listChapters(projectId, { perPage: 500 });
    const chapters = data.chapters ?? data.items ?? (Array.isArray(data) ? data : []);
    if (!chapters.length) throw new Error(`Manuscript for ${projectId} parsed but produced no chapters`);
    return chapters;
  }
}
