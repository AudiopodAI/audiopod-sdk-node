/**
 * AudioPod API Client
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';
import { ClientConfig } from './types';
import {
  AuthenticationError,
  APIError,
  RateLimitError,
  InsufficientBalanceError,
} from './errors';
import { WalletService } from './services/wallet';
import { StemExtractionService } from './services/stemExtraction';
import { TranscriptionService } from './services/transcription';
import { VoiceService } from './services/voice';
import { MusicService } from './services/music';
import { SpeakerService } from './services/speaker';
import { DenoiserService } from './services/denoiser';
import { CreditService } from './services/credits';

const VERSION = '1.3.0';

export class AudioPodClient {
  private axios: AxiosInstance;
  private apiKey: string;

  // Services
  public wallet: WalletService;
  public stemExtraction: StemExtractionService;
  public transcription: TranscriptionService;
  public voice: VoiceService;
  public music: MusicService;
  public speaker: SpeakerService;
  public denoiser: DenoiserService;
  public credits: CreditService;

  constructor(config?: Partial<ClientConfig>) {
    this.apiKey = config?.apiKey || process.env.AUDIOPOD_API_KEY || '';

    if (!this.apiKey) {
      throw new AuthenticationError(
        'API key required. Pass apiKey or set AUDIOPOD_API_KEY environment variable.'
      );
    }

    if (!this.apiKey.startsWith('ap_')) {
      throw new AuthenticationError("Invalid API key format. Keys start with 'ap_'");
    }

    this.axios = axios.create({
      baseURL: config?.baseUrl || 'https://api.audiopod.ai',
      timeout: config?.timeout || 30000,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': `audiopod-sdk/${VERSION}`,
        Accept: 'application/json',
      },
    });

    // Response interceptor for error handling
    this.axios.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          const status = error.response.status;
          const data = error.response.data as any;

          if (status === 401) {
            throw new AuthenticationError('Invalid API key');
          } else if (status === 402) {
            throw new InsufficientBalanceError(
              data?.message || 'Insufficient balance',
              data?.required_cents,
              data?.available_cents
            );
          } else if (status === 429) {
            throw new RateLimitError('Rate limit exceeded');
          } else {
            throw new APIError(data?.detail || error.message, status);
          }
        }
        throw new APIError(error.message);
      }
    );

    // Initialize services
    this.wallet = new WalletService(this);
    this.stemExtraction = new StemExtractionService(this);
    this.transcription = new TranscriptionService(this);
    this.voice = new VoiceService(this);
    this.music = new MusicService(this);
    this.speaker = new SpeakerService(this);
    this.denoiser = new DenoiserService(this);
    this.credits = new CreditService(this);
  }

  async request<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    options?: {
      data?: any;
      params?: Record<string, any>;
      formData?: FormData;
    }
  ): Promise<T> {
    const config: any = {
      method,
      url: endpoint,
      params: options?.params,
    };

    if (options?.formData) {
      config.data = options.formData;
      config.headers = {
        ...options.formData.getHeaders(),
      };
    } else if (options?.data) {
      config.data = options.data;
    }

    const response = await this.axios.request(config);
    return response.data;
  }

  prepareFileUpload(filePath: string, fieldName: string = 'file'): FormData {
    const formData = new FormData();
    const filename = path.basename(filePath);
    formData.append(fieldName, fs.createReadStream(filePath), filename);
    return formData;
  }

  async getUserInfo(): Promise<any> {
    return this.request('GET', '/api/v1/auth/me');
  }
}

