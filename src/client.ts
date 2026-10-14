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

const VERSION = "2.11.0";
const DEFAULT_BASE_URL = "https://api.audiopod.ai";
const DEFAULT_TIMEOUT = 60000;

const API_KEYS_URL = "https://audiopod.ai/dashboard/account/api-keys";
const AUTH_HINT = `Set AUDIOPOD_API_KEY (or pass { apiKey }) — create a key at ${API_KEYS_URL}`;
const BALANCE_HINT =
  "API-key requests are paid from your prepaid API wallet (USD) first, then from " +
  "your account's plan or pay-as-you-go credits; neither can cover this job. " +
  `Top up the API wallet at ${API_KEYS_URL}, or add credits or upgrade at https://audiopod.ai/pricing.`;

const trimEnd = (text: string) => text.replace(/[\s.]+$/, "");

/** The server's human-readable reason; FastAPI nests it under `detail`. */
function serverMessage(data: any): string | undefined {
  const detail = data?.detail;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail.message === "string") return detail.message;
  if (Array.isArray(detail)) return JSON.stringify(detail);
  if (typeof data?.message === "string") return data.message;
  return undefined;
}

/** The structured part of an error body (`detail` when it is an object). */
function detailObject(data: any): Record<string, any> {
  const detail = data?.detail;
  if (detail && typeof detail === "object" && !Array.isArray(detail)) return detail;
  return data && typeof data === "object" ? data : {};
}

export interface AudioPodOptions {
  /** Your AudioPod API key (starts with 'ap_') */
  apiKey?: string;
  /** Base URL for the API (default: https://api.audiopod.ai) */
  baseUrl?: string;
  /** Request timeout in milliseconds (default: 60000) */
  timeout?: number;
  /** Maximum retries for failed requests (default: 2) */
  maxRetries?: number;
}

export default class AudioPod {
  private _axios: AxiosInstance;
  private _apiKey: string;
  private _baseUrl: string;

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

  constructor(options: AudioPodOptions = {}) {
    this._apiKey = options.apiKey || process.env.AUDIOPOD_API_KEY || "";

    if (!this._apiKey) {
      throw new AuthenticationError(`API key is required. ${AUTH_HINT}`);
    }

    if (!this._apiKey.startsWith("ap_")) {
      throw new AuthenticationError(
        `Invalid API key format: AudioPod API keys start with 'ap_'. ${AUTH_HINT}`
      );
    }

    this._baseUrl = options.baseUrl || DEFAULT_BASE_URL;

    this._axios = axios.create({
      baseURL: this._baseUrl,
      timeout: options.timeout || DEFAULT_TIMEOUT,
      headers: {
        Authorization: `Bearer ${this._apiKey}`,
        "X-API-Key": this._apiKey,
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
  }

  /** @internal Map an HTTP error to an SDK error with an actionable message. */
  _handleError(error: AxiosError): never {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;
      const rawServer = serverMessage(data);
      const server = rawServer ? trimEnd(rawServer) : undefined;
      const message = server || error.message;

      switch (status) {
        case 401:
          throw new AuthenticationError(
            `${server ? `Invalid or missing API key (${server})` : "Invalid or missing API key"}. ${AUTH_HINT}`
          );
        case 402: {
          const info = detailObject(data);
          throw new InsufficientBalanceError(
            `${server || "Insufficient balance"}. ${BALANCE_HINT}`,
            info.required_cents,
            info.available_cents
          );
        }
        case 429:
          throw new RateLimitError(message || "Rate limit exceeded");
        default:
          throw new APIError(message, status);
      }
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
  async post<T = any>(
    endpoint: string,
    data?: any,
    options?: { headers?: Record<string, string> }
  ): Promise<T> {
    const response = options?.headers
      ? await this._axios.post(endpoint, data, { headers: options.headers })
      : await this._axios.post(endpoint, data);
    return response.data;
  }

  /** @internal Make a PUT request */
  async put<T = any>(endpoint: string, data?: any): Promise<T> {
    const response = await this._axios.put(endpoint, data);
    return response.data;
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
    formData.append(fieldName, fs.createReadStream(filePath), filename);

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
    const base = this._baseUrl.replace(/^http/, "ws");
    const url = new URL(path, base.endsWith("/") ? base : base + "/");
    url.searchParams.set("api_key", this._apiKey);
    return url.toString();
  }
}
