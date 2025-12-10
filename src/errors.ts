/**
 * AudioPod SDK Errors
 */

export class AudioPodError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AudioPodError';
  }
}

export class AuthenticationError extends AudioPodError {
  constructor(message: string = 'Invalid API key') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class APIError extends AudioPodError {
  statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
  }
}

export class RateLimitError extends AudioPodError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class ValidationError extends AudioPodError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class InsufficientBalanceError extends AudioPodError {
  requiredCents?: number;
  availableCents?: number;

  constructor(message: string, requiredCents?: number, availableCents?: number) {
    super(message);
    this.name = 'InsufficientBalanceError';
    this.requiredCents = requiredCents;
    this.availableCents = availableCents;
  }
}

