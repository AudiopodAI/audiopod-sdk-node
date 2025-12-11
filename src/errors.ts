/**
 * AudioPod SDK Error Classes
 */

export class AudioPodError extends Error {
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

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, APIError.prototype);
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
