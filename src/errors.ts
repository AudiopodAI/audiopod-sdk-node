/**
 * AudioPod SDK Error Classes
 */

export class AudioPodError extends Error {
  detail?: unknown;
  code?: string;
  action?: string;
  retryAfter?: string;
  statusCode?: number;
  constructor(message: string) {
    super(message);
    this.name = 'AudioPodError';
    Object.setPrototypeOf(this, AudioPodError.prototype);
  }
}

export class AuthenticationError extends AudioPodError {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class APIError extends AudioPodError {
  statusCode?: number;

  constructor(message: string, statusCode?: number, detail?: unknown, retryAfter?: string) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    attachDetails(this, detail, retryAfter);
    Object.setPrototypeOf(this, APIError.prototype);
  }
}

export function attachDetails(error: AudioPodError, detail?: unknown, retryAfter?: string): void {
  error.detail = detail;
  error.retryAfter = retryAfter;
  if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
    const values = detail as Record<string, unknown>;
    error.code = typeof values.code === 'string' ? values.code : undefined;
    error.action = typeof values.action === 'string' ? values.action : undefined;
  }
}

export class RateLimitError extends AudioPodError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

export class InsufficientBalanceError extends AudioPodError {
  requiredCents?: number;
  availableCents?: number;

  constructor(
    message: string = 'Insufficient wallet balance',
    requiredCents?: number,
    availableCents?: number
  ) {
    super(message);
    this.name = 'InsufficientBalanceError';
    this.requiredCents = requiredCents;
    this.availableCents = availableCents;
    Object.setPrototypeOf(this, InsufficientBalanceError.prototype);
  }
}
