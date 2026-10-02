/**
 * AudioPod API Client
 *
 * Clean, minimal, ergonomic API design.
 */

import axios, { AxiosInstance, AxiosError } from "axios";
import FormData from "form-data";
import * as fs from "fs";
import * as path from "path";
import {
  AuthenticationError,
  APIError,
  RateLimitError,
  InsufficientBalanceError,
  attachDetails,
} from "./errors";

// Services
import { Transcription } from "./resources/transcription";
import { Voice } from "./resources/voice";
import { Music } from "./resources/music";
import { StemExtraction } from "./resources/stems";
import { Denoiser } from "./resources/denoiser";
import { Speaker } from "./resources/speaker";
import { Wallet } from "./resources/wallet";
import { VideoResource } from "./resources/video";
import { Audiobook } from "./resources/audiobook";
import { Midi } from "./resources/midi";
import { Podcast } from "./resources/podcast";
import { Reader } from "./resources/reader";
import { VERSION } from "./version";
import { Dubbing } from './resources/dubbing';
import { Uploads } from './resources/uploads';

const DEFAULT_BASE_URL = "https://api.audiopod.ai";
const DEFAULT_TIMEOUT = 60000;

export interface AudioPodOptions {
  /** Your AudioPod API key (starts with 'ap_') */
  apiKey?: string;
  /** Signed-in JWT for consent and named-recipient review; exclusive with apiKey. */
  accessToken?: string;
  /** Base URL for the API (default: https://api.audiopod.ai) */
  baseUrl?: string;
  /** Request timeout in milliseconds (default: 60000) */
  timeout?: number;
  /** Legacy option; charged requests are never automatically retried. */
  maxRetries?: number;
}

export default class AudioPod {
  private _axios: AxiosInstance;
  private _apiKey: string;
  private _baseUrl: string;
  private _usesAccessToken: boolean;

  /** Speech-to-text transcription */
  readonly transcription: Transcription;
  /** Voice cloning and text-to-speech */
  readonly voice: Voice;
  /** AI music generation */
  readonly music: Music;
  /** Audio stem separation */
  readonly stems: StemExtraction;
  /** Audio noise reduction */
  readonly denoiser: Denoiser;
  /** Speaker diarization and separation */
  readonly speaker: Speaker;
  /** API wallet and billing */
  readonly wallet: Wallet;
  /** Video generation (karaoke, music videos, lyric videos) */
  readonly video: VideoResource;
  /** Automated audiobook production (manuscript → ACX package) */
  readonly audiobook: Audiobook;
  /** Audio-to-MIDI conversion (standalone or from an existing stem job) */
  readonly midi: Midi;
  /** Multi-speaker podcast studio (topic/sources → outline → transcript → audio) */
  readonly podcast: Podcast;
  /** Audio reader (article URL or text → narrated audio + embeddable player) */
  readonly reader: Reader;
  readonly dubbing: Dubbing;
  readonly uploads: Uploads;

  constructor(options: AudioPodOptions = {}) {
    this._usesAccessToken = Boolean(options.accessToken);
    if (options.accessToken && options.apiKey) throw new AuthenticationError('Choose apiKey or accessToken');
    this._apiKey = options.accessToken || options.apiKey || process.env.AUDIOPOD_API_KEY || "";

    if (!this._apiKey) {
      throw new AuthenticationError(
        "API key is required. Pass apiKey option or set AUDIOPOD_API_KEY environment variable."
      );
    }

    if (!options.accessToken && !this._apiKey.startsWith("ap_")) {
      throw new AuthenticationError(
        "Invalid API key format. AudioPod API keys start with 'ap_'"
      );
    }

    this._baseUrl = options.baseUrl || DEFAULT_BASE_URL;

    this._axios = axios.create({
      baseURL: this._baseUrl,
      timeout: options.timeout || DEFAULT_TIMEOUT,
      headers: {
        Authorization: `Bearer ${this._apiKey}`,
        ...(!options.accessToken ? { "X-API-Key": this._apiKey } : {}),
        "Content-Type": "application/json",
        "User-Agent": `audiopod-node/${VERSION}`,
        Accept: "application/json",
      },
    });

    // Error interceptor
    this._axios.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => this._handleError(error)
    );

    // Initialize services
    this.transcription = new Transcription(this);
    this.voice = new Voice(this);
    this.music = new Music(this);
    this.stems = new StemExtraction(this);
    this.denoiser = new Denoiser(this);
    this.speaker = new Speaker(this);
    this.wallet = new Wallet(this);
    this.video = new VideoResource(this);
    this.audiobook = new Audiobook(this);
    this.midi = new Midi(this);
    this.podcast = new Podcast(this);
    this.reader = new Reader(this);
    this.dubbing = new Dubbing(this);
    this.uploads = new Uploads(this);
  }

  private _handleError(error: AxiosError): never {
    if (error.response) {
      const status = error.response.status;
      let data = error.response.data as any;
      if (Buffer.isBuffer(data)) {
        try { data = JSON.parse(data.toString('utf8')); } catch { data = {detail:data.toString('utf8')}; }
      }
      const detail = data?.detail ?? data;
      const message = typeof detail === 'string' ? detail : detail?.message || detail?.code || data?.message || error.message;
      let failure;
      if (status === 401) failure = new AuthenticationError(message);
      else if (status === 402) failure = new InsufficientBalanceError(message,
        detail?.required_cents ?? data?.required_cents, detail?.available_cents ?? data?.available_cents);
      else if (status === 429) failure = new RateLimitError(message);
      else failure = new APIError(message, status);
      failure.statusCode = status;
      attachDetails(failure, detail, error.response.headers['retry-after']?.toString());
      throw failure;
    }
    throw new APIError(error.message);
  }

  /** @internal Make a GET request */
  async get<T = any>(
    endpoint: string,
    params?: Record<string, any>
  ): Promise<T> {
    const response = await this._axios.get(endpoint, { params });
    return response.data;
  }

  /** @internal Make a POST request */
  async post<T = any>(endpoint: string, data?: any): Promise<T> {
    const response = await this._axios.post(endpoint, data);
    return response.data;
  }

  /** @internal Make a PUT request */
  async put<T = any>(endpoint: string, data?: any): Promise<T> {
    const response = await this._axios.put(endpoint, data);
    return response.data;
  }

  async patch<T = any>(endpoint: string, data?: any): Promise<T> {
    return (await this._axios.patch(endpoint, data)).data;
  }
  /** Owner/reviewer media uses the same authenticated transport. */
  async getBytes(endpoint: string): Promise<Buffer> {
    return Buffer.from((await this._axios.get(endpoint, { responseType: 'arraybuffer' })).data);
  }

  /** @internal Make a POST request with form data (non-file) */
  async postForm<T = any>(
    endpoint: string,
    data: Record<string, any>
  ): Promise<T> {
    const formData = new FormData();
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    }
    const response = await this._axios.post(endpoint, formData, {
      headers: formData.getHeaders(),
    });
    return response.data;
  }

  /** @internal Make a DELETE request */
  async delete<T = any>(endpoint: string): Promise<T> {
    const response = await this._axios.delete(endpoint);
    return response.data;
  }

  /** @internal Upload a file */
  async upload<T = any>(
    endpoint: string,
    filePath: string,
    fieldName: string = "file",
    additionalFields?: Record<string, any>
  ): Promise<T> {
    const formData = new FormData();
    const filename = path.basename(filePath);
    const stream = fs.createReadStream(filePath);
    formData.append(fieldName, stream, filename);

    if (additionalFields) {
      for (const [key, value] of Object.entries(additionalFields)) {
        if (value !== undefined && value !== null) {
          formData.append(
            key,
            typeof value === "object" ? JSON.stringify(value) : String(value)
          );
        }
      }
    }

    try {
      const response = await this._axios.post(endpoint, formData, {
        headers: formData.getHeaders(),
      });
      return response.data;
    } finally { stream.destroy(); }
  }

  /** @internal Upload with buffer */
  async uploadBuffer<T = any>(
    endpoint: string,
    buffer: Buffer,
    filename: string,
    fieldName: string = "file",
    additionalFields?: Record<string, any>
  ): Promise<T> {
    const formData = new FormData();
    formData.append(fieldName, buffer, { filename });

    if (additionalFields) {
      for (const [key, value] of Object.entries(additionalFields)) {
        if (value !== undefined && value !== null) {
          formData.append(
            key,
            typeof value === "object" ? JSON.stringify(value) : String(value)
          );
        }
      }
    }

    const response = await this._axios.post(endpoint, formData, {
      headers: formData.getHeaders(),
    });
    return response.data;
  }

  /**
   * @internal Build an authenticated `wss://` URL for a streaming endpoint.
   * The API key travels as a query param because WebSocket handshakes can't
   * carry custom auth headers from every client.
   */
  streamUrl(path: string): string {
    if (this._usesAccessToken) throw new AuthenticationError('Streaming requires an API key');
    const base = this._baseUrl.replace(/^http/, "ws");
    const url = new URL(path, base.endsWith("/") ? base : base + "/");
    url.searchParams.set("api_key", this._apiKey);
    return url.toString();
  }
}
