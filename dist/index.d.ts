/**
 * AudioPod SDK Type Definitions
 */
type JobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
interface PaginationParams {
    skip?: number;
    limit?: number;
}
interface TranscriptionCreateParams {
    urls?: string[];
    url?: string;
    language?: string;
    speakerDiarization?: boolean;
    minSpeakers?: number;
    maxSpeakers?: number;
    wordTimestamps?: boolean;
}
interface TranscriptionSegment {
    id: number;
    start: number;
    end: number;
    text: string;
    speaker_label?: string;
    confidence?: number;
}
interface TranscriptionJob {
    id: number;
    job_id?: number;
    status: JobStatus;
    source_urls?: string[];
    language?: string;
    detected_language?: string;
    transcript_path?: string;
    total_duration?: number;
    estimated_duration?: number;
    estimated_credits?: number;
    error_message?: string;
    created_at?: string;
    completed_at?: string;
    display_name?: string;
}
interface Voice$1 {
    id: number;
    name: string;
    description?: string;
    preview_url?: string;
    is_public?: boolean;
    created_at?: string;
}
interface VoiceCreateParams {
    name: string;
    audioFile: string;
    description?: string;
}
interface TTSCreateParams {
    text: string;
    voiceId: number;
    speed?: number;
}
interface TTSJob {
    id: number;
    status: JobStatus;
    output_url?: string;
    output_path?: string;
    error_message?: string;
    created_at?: string;
    completed_at?: string;
}
type MusicTask = "text2music" | "prompt2instrumental" | "lyric2vocals" | "text2rap" | "text2samples" | "audio2audio" | "songbloom";
interface MusicCreateParams {
    prompt: string;
    lyrics?: string;
    duration?: number;
    task?: MusicTask;
    genre?: string;
    displayName?: string;
}
interface MusicJob {
    id: number;
    task: MusicTask;
    status: JobStatus;
    output_url?: string;
    output_urls?: Record<string, string>;
    audio_duration?: number;
    display_name?: string;
    thumbnail_url?: string;
    error_message?: string;
    created_at?: string;
    completed_at?: string;
}
type StemType = "vocals" | "drums" | "bass" | "other" | "piano" | "guitar" | "kick" | "snare" | "hihat";
type StemMode = "single" | "two" | "four" | "six" | "producer" | "studio" | "mastering";
type SingleStem = "vocals" | "drums" | "bass" | "guitar" | "piano" | "other";
interface StemExtractionParams {
    /** Path to local audio file */
    file?: string;
    /** URL of audio/video (YouTube, SoundCloud, etc.) */
    url?: string;
    /** Separation mode (default: 'four') */
    mode?: StemMode;
    /** For mode='single', which stem to extract */
    stem?: SingleStem;
}
interface StemExtractionJob {
    id: number;
    status: JobStatus;
    source_type?: "FILE" | "URL";
    input_path?: string;
    stem_paths?: Record<string, string>;
    stem_types?: StemType[];
    task_id?: string;
    quality_scores?: Record<string, number>;
    download_urls?: Record<string, string>;
    error_message?: string;
    created_at?: string;
    updated_at?: string;
    completed_at?: string;
    original_filename?: string;
    display_name?: string;
}
interface StemModeInfo {
    mode: StemMode;
    description: string;
    stem_count: number;
    outputs?: string[];
    note?: string;
}
interface ModesResponse {
    modes: StemModeInfo[];
    pricing: string;
}
interface DenoiseParams {
    file?: string;
    url?: string;
}
interface DenoiseJob {
    id: number;
    status: JobStatus;
    output_url?: string;
    output_path?: string;
    video_output_url?: string;
    is_video?: boolean;
    stats?: Record<string, any>;
    error_message?: string;
    created_at?: string;
    completed_at?: string;
    display_name?: string;
}
type SpeakerJobType = "diarization" | "extraction";
interface SpeakerDiarizeParams {
    file?: string;
    url?: string;
    numSpeakers?: number;
}
interface SpeakerSegment {
    speaker: string;
    start: number;
    end: number;
}
interface SpeakerJob {
    id: number;
    job_type: SpeakerJobType;
    status: JobStatus;
    num_speakers?: number;
    speakers?: string[];
    segments?: SpeakerSegment[];
    output_path?: string;
    output_url?: string;
    error_message?: string;
    created_at?: string;
    completed_at?: string;
    display_name?: string;
}
interface WalletBalance {
    balance_cents: number;
    balance_usd: string;
    total_topup_cents: number;
    total_topup_usd: string;
    total_spent_cents: number;
    total_spent_usd: string;
    low_balance_warning: boolean;
    warning_threshold_cents: number;
}
interface UsageLog {
    id: string;
    service_type: string;
    duration_seconds: number;
    duration_minutes: number;
    amount_cents: number;
    amount_usd: string;
    job_id?: string;
    api_key_id?: string;
    created_at?: string;
}
interface UsageHistory {
    page: number;
    limit: number;
    logs: UsageLog[];
}
interface ServicePricing {
    rate_per_minute: string;
    rate_per_hour: string;
    cents_per_minute: number;
    description: string;
}
interface PricingInfo {
    services: Record<string, ServicePricing>;
    wallet: {
        minimum_topup_cents: number;
        maximum_topup_cents: number;
        currency: string;
    };
}
interface CostEstimate {
    service_type: string;
    duration_seconds: number;
    cost_cents: number;
    cost_usd: string;
}

/**
 * Transcription Service - Speech-to-Text
 */

declare class Transcription {
    private client;
    constructor(client: AudioPod);
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
    create(params: TranscriptionCreateParams): Promise<TranscriptionJob>;
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
    upload(params: {
        file: string;
        language?: string;
        speakerDiarization?: boolean;
    }): Promise<TranscriptionJob>;
    /**
     * Get a transcription job by ID
     */
    get(jobId: number): Promise<TranscriptionJob>;
    /**
     * List transcription jobs
     */
    list(params?: PaginationParams & {
        status?: string;
    }): Promise<TranscriptionJob[]>;
    /**
     * Delete a transcription job
     */
    delete(jobId: number): Promise<void>;
    /**
     * Get transcript content
     *
     * @param format - Output format: 'json', 'txt', 'srt', 'vtt'
     */
    getTranscript(jobId: number, format?: 'json' | 'txt' | 'srt' | 'vtt'): Promise<any>;
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
    waitForCompletion(jobId: number, timeout?: number): Promise<TranscriptionJob>;
    /**
     * Create and wait for completion in one call
     */
    transcribe(params: TranscriptionCreateParams): Promise<TranscriptionJob>;
}

/**
 * Voice Service - Voice Cloning & Text-to-Speech
 */

declare class Voice {
    private client;
    constructor(client: AudioPod);
    /**
     * List all voices
     */
    list(): Promise<Voice$1[]>;
    /**
     * Get a voice by ID
     */
    get(voiceId: number): Promise<Voice$1>;
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
    create(params: VoiceCreateParams): Promise<Voice$1>;
    /**
     * Delete a voice
     */
    delete(voiceId: number): Promise<void>;
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
    speak(params: TTSCreateParams): Promise<TTSJob>;
    /**
     * Get TTS job status
     */
    getJob(jobId: number): Promise<TTSJob>;
    /**
     * Wait for TTS job to complete
     */
    waitForCompletion(jobId: number, timeout?: number): Promise<TTSJob>;
    /**
     * Generate speech and wait for completion
     */
    generate(params: TTSCreateParams): Promise<TTSJob>;
}

/**
 * Music Service - AI Music Generation
 */

declare class Music {
    private client;
    constructor(client: AudioPod);
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
    create(params: MusicCreateParams): Promise<MusicJob>;
    /**
     * Generate instrumental music
     */
    instrumental(prompt: string, duration?: number): Promise<MusicJob>;
    /**
     * Generate a song with vocals
     */
    song(prompt: string, lyrics: string, duration?: number): Promise<MusicJob>;
    /**
     * Generate rap music
     */
    rap(prompt: string, lyrics: string, duration?: number): Promise<MusicJob>;
    /**
     * Get a music job by ID
     */
    get(jobId: number): Promise<MusicJob>;
    /**
     * List music jobs
     */
    list(params?: PaginationParams & {
        task?: MusicTask;
        status?: string;
    }): Promise<MusicJob[]>;
    /**
     * Delete a music job
     */
    delete(jobId: number): Promise<void>;
    /**
     * Wait for a music job to complete
     */
    waitForCompletion(jobId: number, timeout?: number): Promise<MusicJob>;
    /**
     * Generate music and wait for completion
     */
    generate(params: MusicCreateParams): Promise<MusicJob>;
    /**
     * Get available genre presets
     */
    getPresets(): Promise<any>;
}

/**
 * Stem Extraction Service - Audio Stem Separation
 *
 * Simple mode-based API for separating audio into individual stems.
 */

declare class StemExtraction {
    private client;
    constructor(client: AudioPod);
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
    extract(params: StemExtractionParams): Promise<StemExtractionJob>;
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
    status(jobId: number): Promise<StemExtractionJob>;
    /**
     * Get a stem extraction job by ID
     */
    get(jobId: number): Promise<StemExtractionJob>;
    /**
     * List stem extraction jobs
     *
     * @param params.skip - Number of jobs to skip (pagination)
     * @param params.limit - Maximum jobs to return (default: 50)
     * @param params.status - Filter by status
     */
    list(params?: PaginationParams & {
        status?: string;
    }): Promise<StemExtractionJob[]>;
    /**
     * Delete a stem extraction job
     */
    delete(jobId: number): Promise<void>;
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
    waitForCompletion(jobId: number, timeout?: number): Promise<StemExtractionJob>;
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
    separate(params: StemExtractionParams, timeout?: number): Promise<StemExtractionJob>;
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
    modes(): Promise<ModesResponse>;
}

/**
 * Denoiser Service - Audio Noise Reduction
 */

declare class Denoiser {
    private client;
    constructor(client: AudioPod);
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
    create(params: DenoiseParams): Promise<DenoiseJob>;
    /**
     * Get a denoise job by ID
     */
    get(jobId: number): Promise<DenoiseJob>;
    /**
     * List denoise jobs
     */
    list(params?: PaginationParams & {
        status?: string;
    }): Promise<DenoiseJob[]>;
    /**
     * Delete a denoise job
     */
    delete(jobId: number): Promise<void>;
    /**
     * Wait for denoising to complete
     */
    waitForCompletion(jobId: number, timeout?: number): Promise<DenoiseJob>;
    /**
     * Denoise and wait for completion
     */
    denoise(params: DenoiseParams): Promise<DenoiseJob>;
}

/**
 * Speaker Service - Speaker Diarization & Separation
 */

declare class Speaker {
    private client;
    constructor(client: AudioPod);
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
    diarize(params: SpeakerDiarizeParams): Promise<SpeakerJob>;
    /**
     * Get a speaker job by ID
     */
    get(jobId: number): Promise<SpeakerJob>;
    /**
     * List speaker jobs
     */
    list(params?: PaginationParams & {
        status?: string;
        jobType?: string;
    }): Promise<SpeakerJob[]>;
    /**
     * Delete a speaker job
     */
    delete(jobId: number): Promise<void>;
    /**
     * Wait for speaker job to complete
     */
    waitForCompletion(jobId: number, timeout?: number): Promise<SpeakerJob>;
    /**
     * Diarize and wait for completion
     */
    identify(params: SpeakerDiarizeParams): Promise<SpeakerJob>;
}

/**
 * Wallet Service - API Wallet & Billing
 */

declare class Wallet {
    private client;
    constructor(client: AudioPod);
    /**
     * Get current wallet balance
     *
     * @example
     * ```typescript
     * const balance = await client.wallet.getBalance();
     * console.log(`Balance: ${balance.balance_usd}`);
     * ```
     */
    getBalance(): Promise<WalletBalance>;
    /**
     * Get usage history
     */
    getUsage(params?: {
        page?: number;
        limit?: number;
        apiKeyId?: string;
    }): Promise<UsageHistory>;
    /**
     * Get pricing information for all services
     */
    getPricing(): Promise<PricingInfo>;
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
    estimateCost(params: {
        serviceType: string;
        durationSeconds: number;
    }): Promise<CostEstimate>;
    /**
     * Check if balance is sufficient for an operation
     */
    checkBalance(params: {
        serviceType: string;
        durationSeconds: number;
    }): Promise<{
        sufficient: boolean;
        cost: CostEstimate;
    }>;
}

/**
 * AudioPod API Client
 *
 * Clean, minimal API inspired by OpenAI's SDK design.
 */

interface AudioPodOptions {
    /** Your AudioPod API key (starts with 'ap_') */
    apiKey?: string;
    /** Base URL for the API (default: https://api.audiopod.ai) */
    baseUrl?: string;
    /** Request timeout in milliseconds (default: 60000) */
    timeout?: number;
    /** Maximum retries for failed requests (default: 2) */
    maxRetries?: number;
}
declare class AudioPod {
    private _axios;
    private _apiKey;
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
    constructor(options?: AudioPodOptions);
    private _handleError;
    /** @internal Make a GET request */
    get<T = any>(endpoint: string, params?: Record<string, any>): Promise<T>;
    /** @internal Make a POST request */
    post<T = any>(endpoint: string, data?: any): Promise<T>;
    /** @internal Make a POST request with form data (non-file) */
    postForm<T = any>(endpoint: string, data: Record<string, any>): Promise<T>;
    /** @internal Make a DELETE request */
    delete<T = any>(endpoint: string): Promise<T>;
    /** @internal Upload a file */
    upload<T = any>(endpoint: string, filePath: string, fieldName?: string, additionalFields?: Record<string, any>): Promise<T>;
    /** @internal Upload with buffer */
    uploadBuffer<T = any>(endpoint: string, buffer: Buffer, filename: string, fieldName?: string, additionalFields?: Record<string, any>): Promise<T>;
}

/**
 * AudioPod SDK Error Classes
 */
declare class AudioPodError extends Error {
    constructor(message: string);
}
declare class AuthenticationError extends AudioPodError {
    constructor(message?: string);
}
declare class APIError extends AudioPodError {
    statusCode?: number;
    constructor(message: string, statusCode?: number);
}
declare class RateLimitError extends AudioPodError {
    constructor(message?: string);
}
declare class InsufficientBalanceError extends AudioPodError {
    requiredCents?: number;
    availableCents?: number;
    constructor(message?: string, requiredCents?: number, availableCents?: number);
}

/**
 * AudioPod SDK for Node.js
 * Professional Audio Processing powered by AI
 *
 * @example
 * ```typescript
 * import AudioPod from 'audiopod';
 *
 * const client = new AudioPod({ apiKey: 'ap_...' });
 *
 * // Transcribe audio
 * const job = await client.transcription.create({ url: 'https://...' });
 * const result = await client.transcription.waitForCompletion(job.id);
 * ```
 */

declare const VERSION = "2.1.0";

export { APIError, AudioPod, AudioPodError, type AudioPodOptions, AuthenticationError, type DenoiseJob, type DenoiseParams, InsufficientBalanceError, type ModesResponse, type MusicCreateParams, type MusicJob, RateLimitError, type SingleStem, type SpeakerDiarizeParams, type SpeakerJob, type StemExtractionJob, type StemExtractionParams, type StemMode, type StemModeInfo, type StemType, type TTSCreateParams, type TTSJob, type TranscriptionCreateParams, type TranscriptionJob, type TranscriptionSegment, type UsageLog, VERSION, type Voice$1 as Voice, type VoiceCreateParams, type WalletBalance, AudioPod as default };
