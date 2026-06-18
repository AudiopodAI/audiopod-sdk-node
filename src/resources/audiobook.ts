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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class Audiobook {
  constructor(private client: AudioPod) {}

  // --------------------------------------------------------------- projects
  /** Create an audiobook project. */
  async createProject(params: CreateProjectParams): Promise<any> {
    return this.client.post(`${BASE}/projects`, params);
  }

  /** List your audiobook projects (paginated). */
  async listProjects(params: { skip?: number; limit?: number } = {}): Promise<any> {
    return this.client.get(`${BASE}/projects`, { skip: params.skip ?? 0, limit: params.limit ?? 20 });
  }

  /** Get a single project. */
  async getProject(projectId: string): Promise<any> {
    return this.client.get(`${BASE}/projects/${projectId}`);
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

  /** Parse an uploaded manuscript into chapters (async; returns a parse `job_id`). */
  async parseManuscript(projectId: string, fileKey: string, filename: string): Promise<any> {
    return this.client.postForm(`${BASE}/projects/${projectId}/manuscript/parse`, {
      file_key: fileKey,
      filename,
    });
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
  /** List chapters in a project. */
  async listChapters(projectId: string, params: { skip?: number; limit?: number } = {}): Promise<any> {
    return this.client.get(`${BASE}/projects/${projectId}/chapters`, {
      skip: params.skip ?? 0,
      limit: params.limit ?? 50,
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
  /** Queue narration for all chapters (or `chapterIds`) without waiting. */
  async startNarration(projectId: string, params: NarrateParams): Promise<any> {
    return this.client.post(`${BASE}/projects/${projectId}/narration/start`, {
      voice_id: params.voiceId,
      chapter_ids: params.chapterIds,
      narration_speed: params.narrationSpeed ?? 1.0,
      narration_style: params.narrationStyle ?? 'narrative',
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

  /** @internal Wait for the manuscript to parse into chapters. */
  private async waitForChapters(projectId: string, opts: { timeoutMs?: number; pollIntervalMs?: number } = {}): Promise<any[]> {
    const timeout = opts.timeoutMs ?? 600_000;
    const interval = opts.pollIntervalMs ?? 3000;
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const data = await this.listChapters(projectId, { limit: 50 });
      const chapters = data.chapters ?? data.items ?? (Array.isArray(data) ? data : []);
      if (chapters.length) return chapters;
      await sleep(interval);
    }
    throw new Error(`Manuscript for ${projectId} did not parse in time`);
  }
}
