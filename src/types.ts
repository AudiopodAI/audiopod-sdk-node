/**
 * AudioPod SDK Types
 */

export interface ClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

// Wallet Types
export interface WalletBalance {
  balance_cents: number;
  balance_usd: string;
  total_topup_cents: number;
  total_topup_usd: string;
  total_spent_cents: number;
  total_spent_usd: string;
  low_balance_warning?: boolean;
}

export interface PricingTable {
  services: Record<string, ServicePricing>;
  wallet: WalletConfig;
}

export interface ServicePricing {
  rate_per_minute: string;
  rate_per_hour: string;
  cents_per_minute: number;
  description: string;
  per_dollar_minutes: number;
}

export interface WalletConfig {
  minimum_topup_cents: number;
  minimum_topup_usd: string;
  maximum_topup_cents: number;
  maximum_topup_usd: string;
  currency: string;
}

export interface CostEstimate {
  service_type: string;
  duration_seconds: number;
  duration_minutes: number;
  cost_cents: number;
  cost_usd: string;
}

export interface CheckoutSession {
  session_id: string;
  url: string;
  amount_cents: number;
  amount_usd: string;
}

export interface UsageLog {
  id: string;
  service_type: string;
  duration_seconds: number;
  duration_minutes: number;
  amount_cents: number;
  amount_usd: string;
  job_id?: string;
  api_key_id?: string;
  created_at: string;
}

export interface TopupRecord {
  id: string;
  amount_cents: number;
  amount_usd: string;
  status: string;
  created_at: string;
}

// Job Types
export interface Job {
  id: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  created_at: string;
  completed_at?: string;
  error_message?: string;
  download_urls?: Record<string, string>;
}

// Stem Extraction Types
export interface StemExtractionRequest {
  audioFile?: string;
  url?: string;
  stemTypes?: string[];
  modelName?: 'htdemucs' | 'htdemucs_6s';
  twoStemsMode?: 'vocals' | 'drums' | 'bass';
  waitForCompletion?: boolean;
  timeout?: number;
}

export interface StemExtractionResult extends Job {
  stem_paths?: Record<string, string>;
  download_urls?: Record<string, string>;
}

// Transcription Types
export interface TranscriptionRequest {
  audioFile?: string;
  url?: string;
  language?: string;
  speakerDiarization?: boolean;
  waitForCompletion?: boolean;
  timeout?: number;
}

export interface TranscriptionResult extends Job {
  transcript?: string;
  segments?: TranscriptionSegment[];
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

// Voice Types
export interface Voice {
  id: number;
  name: string;
  description?: string;
  created_at: string;
}

export interface TTSRequest {
  text: string;
  voiceId: number;
  speed?: number;
  waitForCompletion?: boolean;
  timeout?: number;
}

// Music Types
export interface MusicGenerationRequest {
  prompt: string;
  duration?: number;
  model?: string;
  waitForCompletion?: boolean;
  timeout?: number;
}

// Credits Types
export interface CreditInfo {
  credits_balance: number;
  payg_balance: number;
  total_available_credits: number;
  total_credits_used: number;
  next_reset_date?: string;
}

