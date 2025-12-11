"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  APIError: () => APIError,
  AudioPod: () => AudioPod,
  AudioPodError: () => AudioPodError,
  AuthenticationError: () => AuthenticationError,
  InsufficientBalanceError: () => InsufficientBalanceError,
  RateLimitError: () => RateLimitError,
  VERSION: () => VERSION2,
  default: () => AudioPod
});
module.exports = __toCommonJS(index_exports);

// src/client.ts
var import_axios = __toESM(require("axios"));
var import_form_data = __toESM(require("form-data"));
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));

// src/errors.ts
var AudioPodError = class _AudioPodError extends Error {
  constructor(message) {
    super(message);
    this.name = "AudioPodError";
    Object.setPrototypeOf(this, _AudioPodError.prototype);
  }
};
var AuthenticationError = class _AuthenticationError extends AudioPodError {
  constructor(message = "Authentication failed") {
    super(message);
    this.name = "AuthenticationError";
    Object.setPrototypeOf(this, _AuthenticationError.prototype);
  }
};
var APIError = class _APIError extends AudioPodError {
  constructor(message, statusCode) {
    super(message);
    this.name = "APIError";
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, _APIError.prototype);
  }
};
var RateLimitError = class _RateLimitError extends AudioPodError {
  constructor(message = "Rate limit exceeded") {
    super(message);
    this.name = "RateLimitError";
    Object.setPrototypeOf(this, _RateLimitError.prototype);
  }
};
var InsufficientBalanceError = class _InsufficientBalanceError extends AudioPodError {
  constructor(message = "Insufficient wallet balance", requiredCents, availableCents) {
    super(message);
    this.name = "InsufficientBalanceError";
    this.requiredCents = requiredCents;
    this.availableCents = availableCents;
    Object.setPrototypeOf(this, _InsufficientBalanceError.prototype);
  }
};

// src/resources/transcription.ts
var POLL_INTERVAL = 3e3;
var DEFAULT_TIMEOUT = 6e5;
var Transcription = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Create a transcription job from URL(s)
   * 
   * @example
   * ```typescript
   * const job = await client.transcription.create({
   *   url: 'https://youtube.com/watch?v=...',
   *   speakerDiarization: true,
   * });
   * ```
   */
  async create(params) {
    const urls = params.urls || (params.url ? [params.url] : []);
    if (urls.length === 0) {
      throw new Error("At least one URL is required");
    }
    return this.client.post("/api/v1/transcribe/transcribe", {
      source_urls: urls,
      language: params.language,
      enable_speaker_diarization: params.speakerDiarization ?? false,
      min_speakers: params.minSpeakers,
      max_speakers: params.maxSpeakers,
      enable_word_timestamps: params.wordTimestamps ?? true
    });
  }
  /**
   * Upload a file for transcription
   * 
   * @example
   * ```typescript
   * const job = await client.transcription.upload({
   *   file: './audio.mp3',
   *   language: 'en',
   * });
   * ```
   */
  async upload(params) {
    return this.client.upload("/api/v1/transcribe/transcribe-upload", params.file, "files", {
      language: params.language,
      enable_speaker_diarization: params.speakerDiarization ?? false
    });
  }
  /**
   * Get a transcription job by ID
   */
  async get(jobId) {
    return this.client.get(`/api/v1/transcribe/jobs/${jobId}`);
  }
  /**
   * List transcription jobs
   */
  async list(params = {}) {
    return this.client.get("/api/v1/transcribe/jobs", {
      offset: params.skip ?? 0,
      limit: params.limit ?? 50,
      status: params.status
    });
  }
  /**
   * Delete a transcription job
   */
  async delete(jobId) {
    await this.client.delete(`/api/v1/transcribe/jobs/${jobId}`);
  }
  /**
   * Get transcript content
   * 
   * @param format - Output format: 'json', 'txt', 'srt', 'vtt'
   */
  async getTranscript(jobId, format = "json") {
    return this.client.get(`/api/v1/transcribe/jobs/${jobId}/transcript`, { format });
  }
  /**
   * Wait for a transcription job to complete
   * 
   * @example
   * ```typescript
   * const job = await client.transcription.create({ url: '...' });
   * const result = await client.transcription.waitForCompletion(job.id);
   * console.log(result.status); // 'COMPLETED'
   * ```
   */
  async waitForCompletion(jobId, timeout = DEFAULT_TIMEOUT) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const job = await this.get(jobId);
      if (job.status === "COMPLETED") {
        return job;
      }
      if (job.status === "FAILED") {
        throw new Error(`Transcription failed: ${job.error_message || "Unknown error"}`);
      }
      if (job.status === "CANCELLED") {
        throw new Error("Transcription was cancelled");
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    }
    throw new Error(`Transcription timed out after ${timeout / 1e3}s`);
  }
  /**
   * Create and wait for completion in one call
   */
  async transcribe(params) {
    const job = await this.create(params);
    return this.waitForCompletion(job.id || job.job_id);
  }
};

// src/resources/voice.ts
var POLL_INTERVAL2 = 2e3;
var DEFAULT_TIMEOUT2 = 3e5;
var Voice = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * List all voices
   */
  async list() {
    return this.client.get("/api/v1/voice/voices");
  }
  /**
   * Get a voice by ID
   */
  async get(voiceId) {
    return this.client.get(`/api/v1/voice/voices/${voiceId}`);
  }
  /**
   * Create a new voice clone
   * 
   * @example
   * ```typescript
   * const voice = await client.voice.create({
   *   name: 'My Voice',
   *   audioFile: './sample.mp3',
   * });
   * ```
   */
  async create(params) {
    return this.client.upload("/api/v1/voice/voices", params.audioFile, "audio_file", {
      name: params.name,
      description: params.description
    });
  }
  /**
   * Delete a voice
   */
  async delete(voiceId) {
    await this.client.delete(`/api/v1/voice/voices/${voiceId}`);
  }
  /**
   * Generate speech from text
   * 
   * @example
   * ```typescript
   * const job = await client.voice.speak({
   *   text: 'Hello, world!',
   *   voiceId: 123,
   * });
   * ```
   */
  async speak(params) {
    return this.client.post("/api/v1/voice/tts/generate", {
      text: params.text,
      voice_id: params.voiceId,
      speed: params.speed ?? 1
    });
  }
  /**
   * Get TTS job status
   */
  async getJob(jobId) {
    return this.client.get(`/api/v1/voice/tts/status/${jobId}`);
  }
  /**
   * Wait for TTS job to complete
   */
  async waitForCompletion(jobId, timeout = DEFAULT_TIMEOUT2) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const job = await this.getJob(jobId);
      if (job.status === "COMPLETED") {
        return job;
      }
      if (job.status === "FAILED") {
        throw new Error(`TTS generation failed: ${job.error_message || "Unknown error"}`);
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL2));
    }
    throw new Error(`TTS generation timed out after ${timeout / 1e3}s`);
  }
  /**
   * Generate speech and wait for completion
   */
  async generate(params) {
    const job = await this.speak(params);
    return this.waitForCompletion(job.id);
  }
};

// src/resources/music.ts
var POLL_INTERVAL3 = 5e3;
var DEFAULT_TIMEOUT3 = 6e5;
var Music = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Generate music from text
   * 
   * @example
   * ```typescript
   * const job = await client.music.create({
   *   prompt: 'Upbeat electronic dance music',
   *   duration: 30,
   * });
   * ```
   */
  async create(params) {
    const task = params.task || (params.lyrics ? "text2music" : "prompt2instrumental");
    const endpoint = `/api/v1/music/${task}`;
    return this.client.post(endpoint, {
      prompt: params.prompt,
      lyrics: params.lyrics,
      audio_duration: params.duration ?? 30,
      display_name: params.displayName,
      genre_preset: params.genre
    });
  }
  /**
   * Generate instrumental music
   */
  async instrumental(prompt, duration = 30) {
    return this.create({ prompt, duration, task: "prompt2instrumental" });
  }
  /**
   * Generate a song with vocals
   */
  async song(prompt, lyrics, duration = 60) {
    return this.create({ prompt, lyrics, duration, task: "text2music" });
  }
  /**
   * Generate rap music
   */
  async rap(prompt, lyrics, duration = 60) {
    return this.create({ prompt, lyrics, duration, task: "text2rap" });
  }
  /**
   * Get a music job by ID
   */
  async get(jobId) {
    return this.client.get(`/api/v1/music/jobs/${jobId}/status`);
  }
  /**
   * List music jobs
   */
  async list(params = {}) {
    return this.client.get("/api/v1/music/jobs", {
      skip: params.skip ?? 0,
      limit: params.limit ?? 50,
      task: params.task,
      status: params.status
    });
  }
  /**
   * Delete a music job
   */
  async delete(jobId) {
    await this.client.delete(`/api/v1/music/jobs/${jobId}`);
  }
  /**
   * Wait for a music job to complete
   */
  async waitForCompletion(jobId, timeout = DEFAULT_TIMEOUT3) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const job = await this.get(jobId);
      if (job.status === "COMPLETED") {
        return job;
      }
      if (job.status === "FAILED") {
        throw new Error(`Music generation failed: ${job.error_message || "Unknown error"}`);
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL3));
    }
    throw new Error(`Music generation timed out after ${timeout / 1e3}s`);
  }
  /**
   * Generate music and wait for completion
   */
  async generate(params) {
    const job = await this.create(params);
    return this.waitForCompletion(job.id);
  }
  /**
   * Get available genre presets
   */
  async getPresets() {
    return this.client.get("/api/v1/music/presets");
  }
};

// src/resources/stems.ts
var POLL_INTERVAL4 = 3e3;
var DEFAULT_TIMEOUT4 = 6e5;
var StemExtraction = class {
  constructor(client) {
    this.client = client;
  }
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
  async extract(params) {
    const mode = params.mode || "four";
    if (!params.file && !params.url) {
      throw new Error("Either file or url must be provided");
    }
    if (mode === "single" && !params.stem) {
      throw new Error(
        "stem parameter required for mode='single'. Options: vocals, drums, bass, guitar, piano, other"
      );
    }
    const additionalFields = { mode };
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
  async status(jobId) {
    return this.client.get(`/api/v1/stem-extraction/status/${jobId}`);
  }
  /**
   * Get a stem extraction job by ID
   */
  async get(jobId) {
    return this.client.get(`/api/v1/stem-extraction/jobs/${jobId}`);
  }
  /**
   * List stem extraction jobs
   *
   * @param params.skip - Number of jobs to skip (pagination)
   * @param params.limit - Maximum jobs to return (default: 50)
   * @param params.status - Filter by status
   */
  async list(params = {}) {
    return this.client.get("/api/v1/stem-extraction/jobs", {
      skip: params.skip ?? 0,
      limit: params.limit ?? 50,
      status: params.status
    });
  }
  /**
   * Delete a stem extraction job
   */
  async delete(jobId) {
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
  async waitForCompletion(jobId, timeout = DEFAULT_TIMEOUT4) {
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
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL4));
    }
    throw new Error(`Stem extraction timed out after ${timeout / 1e3}s`);
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
  async separate(params, timeout = DEFAULT_TIMEOUT4) {
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
  async modes() {
    return this.client.get("/api/v1/stem-extraction/modes");
  }
};

// src/resources/denoiser.ts
var POLL_INTERVAL5 = 3e3;
var DEFAULT_TIMEOUT5 = 6e5;
var Denoiser = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Denoise audio/video
   * 
   * @example
   * ```typescript
   * // Denoise from file
   * const job = await client.denoiser.create({
   *   file: './noisy-audio.mp3',
   * });
   * 
   * // Denoise from URL
   * const job = await client.denoiser.create({
   *   url: 'https://example.com/audio.mp3',
   * });
   * ```
   */
  async create(params) {
    if (params.file) {
      return this.client.upload("/api/v1/denoiser/denoise", params.file, "file");
    }
    if (params.url) {
      return this.client.post("/api/v1/denoiser/denoise", {
        url: params.url
      });
    }
    throw new Error("Either file or url must be provided");
  }
  /**
   * Get a denoise job by ID
   */
  async get(jobId) {
    return this.client.get(`/api/v1/denoiser/jobs/${jobId}`);
  }
  /**
   * List denoise jobs
   */
  async list(params = {}) {
    return this.client.get("/api/v1/denoiser/jobs", {
      skip: params.skip ?? 0,
      limit: params.limit ?? 50,
      status: params.status
    });
  }
  /**
   * Delete a denoise job
   */
  async delete(jobId) {
    await this.client.delete(`/api/v1/denoiser/jobs/${jobId}`);
  }
  /**
   * Wait for denoising to complete
   */
  async waitForCompletion(jobId, timeout = DEFAULT_TIMEOUT5) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const job = await this.get(jobId);
      if (job.status === "COMPLETED") {
        return job;
      }
      if (job.status === "FAILED") {
        throw new Error(`Denoising failed: ${job.error_message || "Unknown error"}`);
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL5));
    }
    throw new Error(`Denoising timed out after ${timeout / 1e3}s`);
  }
  /**
   * Denoise and wait for completion
   */
  async denoise(params) {
    const job = await this.create(params);
    return this.waitForCompletion(job.id);
  }
};

// src/resources/speaker.ts
var POLL_INTERVAL6 = 3e3;
var DEFAULT_TIMEOUT6 = 6e5;
var Speaker = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Create a speaker diarization job
   * 
   * @example
   * ```typescript
   * // Diarize from file
   * const job = await client.speaker.diarize({
   *   file: './meeting.mp3',
   *   numSpeakers: 3,
   * });
   * 
   * // Diarize from URL
   * const job = await client.speaker.diarize({
   *   url: 'https://youtube.com/watch?v=...',
   * });
   * ```
   */
  async diarize(params) {
    if (params.file) {
      return this.client.upload("/api/v1/speaker/diarize", params.file, "file", {
        num_speakers: params.numSpeakers
      });
    }
    if (params.url) {
      return this.client.post("/api/v1/speaker/diarize", {
        url: params.url,
        num_speakers: params.numSpeakers
      });
    }
    throw new Error("Either file or url must be provided");
  }
  /**
   * Get a speaker job by ID
   */
  async get(jobId) {
    return this.client.get(`/api/v1/speaker/jobs/${jobId}`);
  }
  /**
   * List speaker jobs
   */
  async list(params = {}) {
    return this.client.get("/api/v1/speaker/jobs", {
      skip: params.skip ?? 0,
      limit: params.limit ?? 50,
      status: params.status,
      job_type: params.jobType
    });
  }
  /**
   * Delete a speaker job
   */
  async delete(jobId) {
    await this.client.delete(`/api/v1/speaker/jobs/${jobId}`);
  }
  /**
   * Wait for speaker job to complete
   */
  async waitForCompletion(jobId, timeout = DEFAULT_TIMEOUT6) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const job = await this.get(jobId);
      if (job.status === "COMPLETED") {
        return job;
      }
      if (job.status === "FAILED") {
        throw new Error(`Speaker processing failed: ${job.error_message || "Unknown error"}`);
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL6));
    }
    throw new Error(`Speaker processing timed out after ${timeout / 1e3}s`);
  }
  /**
   * Diarize and wait for completion
   */
  async identify(params) {
    const job = await this.diarize(params);
    return this.waitForCompletion(job.id);
  }
};

// src/resources/wallet.ts
var Wallet = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Get current wallet balance
   * 
   * @example
   * ```typescript
   * const balance = await client.wallet.getBalance();
   * console.log(`Balance: ${balance.balance_usd}`);
   * ```
   */
  async getBalance() {
    return this.client.get("/api/v1/api-wallet/balance");
  }
  /**
   * Get usage history
   */
  async getUsage(params = {}) {
    return this.client.get("/api/v1/api-wallet/usage", {
      page: params.page ?? 1,
      limit: params.limit ?? 50,
      api_key_id: params.apiKeyId
    });
  }
  /**
   * Get pricing information for all services
   */
  async getPricing() {
    return this.client.get("/api/v1/api-wallet/pricing");
  }
  /**
   * Estimate cost for an operation
   * 
   * @example
   * ```typescript
   * const estimate = await client.wallet.estimateCost({
   *   serviceType: 'stem_extraction',
   *   durationSeconds: 300,
   * });
   * console.log(`Estimated cost: ${estimate.cost_usd}`);
   * ```
   */
  async estimateCost(params) {
    return this.client.post("/api/v1/api-wallet/estimate", {
      service_type: params.serviceType,
      duration_seconds: params.durationSeconds
    });
  }
  /**
   * Check if balance is sufficient for an operation
   */
  async checkBalance(params) {
    return this.client.post("/api/v1/api-wallet/check-balance", {
      service_type: params.serviceType,
      duration_seconds: params.durationSeconds
    });
  }
};

// src/client.ts
var VERSION = "2.1.0";
var DEFAULT_BASE_URL = "https://api.audiopod.ai";
var DEFAULT_TIMEOUT7 = 6e4;
var AudioPod = class {
  constructor(options = {}) {
    this._apiKey = options.apiKey || process.env.AUDIOPOD_API_KEY || "";
    if (!this._apiKey) {
      throw new AuthenticationError(
        "API key is required. Pass apiKey option or set AUDIOPOD_API_KEY environment variable."
      );
    }
    if (!this._apiKey.startsWith("ap_")) {
      throw new AuthenticationError(
        "Invalid API key format. AudioPod API keys start with 'ap_'"
      );
    }
    this._axios = import_axios.default.create({
      baseURL: options.baseUrl || DEFAULT_BASE_URL,
      timeout: options.timeout || DEFAULT_TIMEOUT7,
      headers: {
        Authorization: `Bearer ${this._apiKey}`,
        "X-API-Key": this._apiKey,
        "Content-Type": "application/json",
        "User-Agent": `audiopod-node/${VERSION}`,
        Accept: "application/json"
      }
    });
    this._axios.interceptors.response.use(
      (response) => response,
      (error) => this._handleError(error)
    );
    this.transcription = new Transcription(this);
    this.voice = new Voice(this);
    this.music = new Music(this);
    this.stems = new StemExtraction(this);
    this.denoiser = new Denoiser(this);
    this.speaker = new Speaker(this);
    this.wallet = new Wallet(this);
  }
  _handleError(error) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      const message = data?.detail || data?.message || error.message;
      switch (status) {
        case 401:
          throw new AuthenticationError(message || "Invalid API key");
        case 402:
          throw new InsufficientBalanceError(
            message || "Insufficient wallet balance",
            data?.required_cents,
            data?.available_cents
          );
        case 429:
          throw new RateLimitError(message || "Rate limit exceeded");
        default:
          throw new APIError(message, status);
      }
    }
    throw new APIError(error.message);
  }
  /** @internal Make a GET request */
  async get(endpoint, params) {
    const response = await this._axios.get(endpoint, { params });
    return response.data;
  }
  /** @internal Make a POST request */
  async post(endpoint, data) {
    const response = await this._axios.post(endpoint, data);
    return response.data;
  }
  /** @internal Make a POST request with form data (non-file) */
  async postForm(endpoint, data) {
    const formData = new import_form_data.default();
    for (const [key, value] of Object.entries(data)) {
      if (value !== void 0 && value !== null) {
        formData.append(key, String(value));
      }
    }
    const response = await this._axios.post(endpoint, formData, {
      headers: formData.getHeaders()
    });
    return response.data;
  }
  /** @internal Make a DELETE request */
  async delete(endpoint) {
    const response = await this._axios.delete(endpoint);
    return response.data;
  }
  /** @internal Upload a file */
  async upload(endpoint, filePath, fieldName = "file", additionalFields) {
    const formData = new import_form_data.default();
    const filename = path.basename(filePath);
    formData.append(fieldName, fs.createReadStream(filePath), filename);
    if (additionalFields) {
      for (const [key, value] of Object.entries(additionalFields)) {
        if (value !== void 0 && value !== null) {
          formData.append(
            key,
            typeof value === "object" ? JSON.stringify(value) : String(value)
          );
        }
      }
    }
    const response = await this._axios.post(endpoint, formData, {
      headers: formData.getHeaders()
    });
    return response.data;
  }
  /** @internal Upload with buffer */
  async uploadBuffer(endpoint, buffer, filename, fieldName = "file", additionalFields) {
    const formData = new import_form_data.default();
    formData.append(fieldName, buffer, { filename });
    if (additionalFields) {
      for (const [key, value] of Object.entries(additionalFields)) {
        if (value !== void 0 && value !== null) {
          formData.append(
            key,
            typeof value === "object" ? JSON.stringify(value) : String(value)
          );
        }
      }
    }
    const response = await this._axios.post(endpoint, formData, {
      headers: formData.getHeaders()
    });
    return response.data;
  }
};

// src/index.ts
var VERSION2 = "2.1.0";
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  APIError,
  AudioPod,
  AudioPodError,
  AuthenticationError,
  InsufficientBalanceError,
  RateLimitError,
  VERSION
});
