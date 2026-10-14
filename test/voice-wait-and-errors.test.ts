/**
 * PLAT-3976: a new voice clone is PENDING until processed, and speech with it
 * fails until it is COMPLETED. `voice.create({ ..., waitForReady: true })`
 * polls `GET /api/v1/voice/voices/{id}/status` until it is usable.
 *
 * Also pins the actionable 401 / 402 messages. HTTP is mocked at the
 * resource's client boundary (voice) and by feeding `_handleError` an
 * axios-shaped error (errors).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import AudioPod from '../src/client';
import { Voice } from '../src/resources/voice';
import { AudioPodError, AuthenticationError, InsufficientBalanceError } from '../src/errors';

const STATUS = '/api/v1/voice/voices/7/status';
const PENDING = { id: 7, name: 'Me', status: 'PENDING' };
const PROCESSING = { id: 7, name: 'Me', status: 'PROCESSING' };
const DONE = { id: 7, name: 'Me', status: 'COMPLETED' };

function makeVoice(created: any, ...statuses: any[]) {
  const calls: string[] = [];
  const client = {
    upload: async (endpoint: string) => {
      calls.push(`POST ${endpoint}`);
      return created;
    },
    get: async (endpoint: string) => {
      calls.push(`GET ${endpoint}`);
      return statuses.length > 1 ? statuses.shift() : statuses[0];
    },
  };
  return { voice: new Voice(client as any), calls };
}

const FAST = { pollInterval: 0 };

test('create without waitForReady returns the pending voice', async () => {
  const { voice, calls } = makeVoice(PENDING);
  assert.deepEqual(await voice.create({ name: 'Me', audioFile: './a.wav' }), PENDING);
  assert.deepEqual(calls, ['POST /api/v1/voice/voice-profiles']);
});

test('create with waitForReady polls status until COMPLETED', async () => {
  const { voice, calls } = makeVoice(PENDING, PROCESSING, DONE);
  const result = await voice.create({ name: 'Me', audioFile: './a.wav', waitForReady: true, ...FAST });
  assert.deepEqual(result, DONE);
  assert.deepEqual(calls, ['POST /api/v1/voice/voice-profiles', `GET ${STATUS}`, `GET ${STATUS}`]);
});

test('an already COMPLETED voice is returned without polling', async () => {
  const { voice, calls } = makeVoice(DONE);
  await voice.create({ name: 'Me', audioFile: './a.wav', waitForReady: true, ...FAST });
  assert.equal(calls.length, 1);
});

test('a failed clone throws with the reason', async () => {
  const { voice } = makeVoice(PENDING, { id: 7, status: 'FAILED', error_message: 'too short' });
  await assert.rejects(
    voice.create({ name: 'Me', audioFile: './a.wav', waitForReady: true, ...FAST }),
    (err: any) => err instanceof AudioPodError && /Voice 7 cloning failed: too short/.test(err.message)
  );
});

test('a timeout throws with the last status', async () => {
  const { voice } = makeVoice(PENDING, PENDING);
  await assert.rejects(
    voice.create({ name: 'Me', audioFile: './a.wav', waitForReady: true, timeout: 0, ...FAST }),
    (err: any) => err instanceof AudioPodError && /last status: PENDING/.test(err.message)
  );
});

test('waitForReady accepts a bare id', async () => {
  const { voice, calls } = makeVoice(undefined, PROCESSING, DONE);
  assert.deepEqual(await voice.waitForReady(7, FAST), DONE);
  assert.deepEqual(calls, [`GET ${STATUS}`, `GET ${STATUS}`]);
});

// ---------------------------------------------------------------- errors

function httpError(status: number, data: any): any {
  return { message: `Request failed with status code ${status}`, response: { status, data } };
}

test('missing key says how to fix it', () => {
  const saved = process.env.AUDIOPOD_API_KEY;
  delete process.env.AUDIOPOD_API_KEY;
  try {
    assert.throws(
      () => new AudioPod(),
      (err: any) =>
        err instanceof AuthenticationError &&
        /AUDIOPOD_API_KEY/.test(err.message) &&
        /dashboard\/account\/api-keys/.test(err.message)
    );
  } finally {
    if (saved !== undefined) process.env.AUDIOPOD_API_KEY = saved;
  }
});

test('401 keeps the server reason and says how to fix it', () => {
  const client = new AudioPod({ apiKey: 'ap_test' });
  assert.throws(
    () => client._handleError(httpError(401, { detail: 'Invalid API key' })),
    (err: any) =>
      err instanceof AuthenticationError &&
      err.message.includes('Invalid API key') &&
      err.message.includes('Set AUDIOPOD_API_KEY') &&
      err.message.includes('https://audiopod.ai/dashboard/account/api-keys')
  );
});

test('402 reads the nested detail and explains the API wallet', () => {
  const client = new AudioPod({ apiKey: 'ap_test' });
  const body = {
    detail: {
      error: 'insufficient_api_balance',
      message: 'Insufficient API wallet balance. Required: $0.50, Available: $0.10',
      required_cents: 50,
      available_cents: 10,
    },
  };
  assert.throws(
    () => client._handleError(httpError(402, body)),
    (err: any) =>
      err instanceof InsufficientBalanceError &&
      err.requiredCents === 50 &&
      err.availableCents === 10 &&
      err.message.includes('Required: $0.50') &&
      err.message.includes('prepaid API wallet') &&
      err.message.includes('plan or pay-as-you-go credits') &&
      err.message.includes('https://audiopod.ai/pricing') &&
      !err.message.includes('..') &&
      !err.message.includes('[object Object]')
  );
});

test('402 with a plain string detail', () => {
  const client = new AudioPod({ apiKey: 'ap_test' });
  assert.throws(
    () => client._handleError(httpError(402, { detail: 'Not enough credits.' })),
    (err: any) =>
      err instanceof InsufficientBalanceError && err.message.startsWith('Not enough credits. API-key requests')
  );
});
