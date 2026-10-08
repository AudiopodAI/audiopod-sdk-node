/**
 * Unit tests for score-first music (AudioMusic v3) on the Music resource (PLAT-3823).
 *
 * The transport is mocked at the resource's `client` boundary — a fake client
 * records each GET/POST and returns queued responses, so no network or axios
 * is involved.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Music } from '../src/resources/music';
import { AudioPodError, ValidationError } from '../src/errors';

const V3 = '/api/v1/music/v3';

interface Call {
  method: 'GET' | 'POST';
  endpoint: string;
  data?: unknown;
  options?: unknown;
}

function makeResource(...responses: unknown[]) {
  const calls: Call[] = [];
  const queue = responses.length ? [...responses] : [{}];
  const next = () => (queue.length > 1 ? queue.shift() : queue[0]);
  const fakeClient = {
    async get(endpoint: string, params?: unknown) {
      calls.push({ method: 'GET', endpoint, data: params });
      return next();
    },
    async post(endpoint: string, data?: unknown, options?: unknown) {
      calls.push(options === undefined ? { method: 'POST', endpoint, data } : { method: 'POST', endpoint, data, options });
      return next();
    },
  };
  return { music: new Music(fakeClient as any), calls };
}

// --- request paths and bodies ------------------------------------------------

test('v3Availability GETs /availability', async () => {
  const { music, calls } = makeResource({ available: true });
  assert.deepEqual(await music.v3Availability(), { available: true });
  assert.deepEqual(calls, [{ method: 'GET', endpoint: `${V3}/availability`, data: undefined }]);
});

test('compose POSTs /plan with snake_case and only the fields given', async () => {
  const { music, calls } = makeResource({ job_id: 7, status: 'PENDING' });
  await music.compose({ style: 'lofi piano', lyrics: '[Verse]\nhi', cot: 'melody', cfgScale: 4, displayName: 'A' });
  assert.equal(calls[0].endpoint, `${V3}/plan`);
  assert.deepEqual(calls[0].data, {
    style: 'lofi piano',
    lyrics: '[Verse]\nhi',
    cot: 'melody',
    cfg_scale: 4,
    display_name: 'A',
  });
});

test('compose from a description sends the brief fields, dropping empty lyrics', async () => {
  const { music, calls } = makeResource({ job_id: 1, status: 'PENDING' });
  await music.compose({ style: 'folk', lyrics: '', description: 'rain', targetSeconds: 90, language: 'en' });
  assert.deepEqual(calls[0].data, { style: 'folk', description: 'rain', target_seconds: 90, language: 'en' });
});

test('compose with only a description needs no style', async () => {
  const { music, calls } = makeResource({ job_id: 1, status: 'PENDING' });
  await music.compose({ description: 'a lullaby about the sea', targetSeconds: 30 });
  await music.compose({ description: 'a lullaby about the sea', targetSeconds: 300 });
  assert.deepEqual(calls[0].data, { description: 'a lullaby about the sea', target_seconds: 30 });
  assert.equal(calls.length, 2);
});

test('compose validation rejects bad input without a request', async () => {
  const { music, calls } = makeResource();
  const bad = [
    { style: 'x', lyrics: 'la', description: 'rain' },
    { description: '   ' },
    { description: 'x'.repeat(1001) },
    {},
    { style: '  ' },
    { description: 'rain', targetSeconds: 29 },
    { description: 'rain', targetSeconds: 301 },
    { description: 'rain', targetSeconds: 90.5 },
  ];
  for (const params of bad) {
    await assert.rejects(() => music.compose(params as any), ValidationError, JSON.stringify(params));
  }
  assert.equal(calls.length, 0);
});

test('reviseScore POSTs /revise with the full body', async () => {
  const { music, calls } = makeResource({ job_id: 9, status: 'PENDING' });
  await music.reviseScore({
    sourceJobId: 5,
    instruction: 'make the chorus soar',
    section: 'Chorus',
    bars: { start: 9, end: 16 },
    allowTempoChange: false,
    displayName: 'Rev A',
    idempotencyKey: ' key-123 ',
  });
  assert.equal(calls[0].endpoint, `${V3}/revise`);
  assert.deepEqual(calls[0].data, {
    source_job_id: 5,
    instruction: 'make the chorus soar',
    section: 'Chorus',
    bars: { start: 9, end: 16 },
    allow_tempo_change: false,
    display_name: 'Rev A',
  });
  assert.deepEqual(calls[0].options, { headers: { 'Idempotency-Key': 'key-123' } });
});

test('reviseScore without a key sends no options', async () => {
  const { music, calls } = makeResource({ job_id: 9, status: 'PENDING' });
  await music.reviseScore({ sourceJobId: 5, instruction: 'brighter' });
  assert.deepEqual(calls[0], {
    method: 'POST',
    endpoint: `${V3}/revise`,
    data: { source_job_id: 5, instruction: 'brighter' },
  });
});

test('reviseScore rejects a long section or a bad idempotency key', async () => {
  const { music, calls } = makeResource();
  await assert.rejects(() => music.reviseScore({ sourceJobId: 5, instruction: 'x', section: 's'.repeat(61) }), ValidationError);
  await assert.rejects(() => music.reviseScore({ sourceJobId: 5, instruction: 'x', idempotencyKey: 'k'.repeat(201) }), ValidationError);
  await assert.rejects(() => music.reviseScore({ sourceJobId: 5, instruction: 'x', idempotencyKey: '  ' }), ValidationError);
  assert.equal(calls.length, 0);
});

test('reviseScore enforces the 500-char instruction limit', async () => {
  const { music, calls } = makeResource({ job_id: 9, status: 'PENDING' });
  await music.reviseScore({ sourceJobId: 5, instruction: 'x'.repeat(500) });
  await assert.rejects(() => music.reviseScore({ sourceJobId: 5, instruction: 'x'.repeat(501) }), ValidationError);
  await assert.rejects(() => music.reviseScore({ sourceJobId: 5, instruction: '   ' }), ValidationError);
  assert.equal(calls.length, 1);
});

test('reviseScore rejects a bad bar range', async () => {
  const { music, calls } = makeResource();
  await assert.rejects(
    () => music.reviseScore({ sourceJobId: 5, instruction: 'x', bars: { start: 8, end: 2 } }),
    ValidationError,
  );
  await assert.rejects(
    () => music.reviseScore({ sourceJobId: 5, instruction: 'x', bars: { start: 1.5, end: 2 } }),
    ValidationError,
  );
  await assert.rejects(
    () => music.reviseScore({ sourceJobId: 5, instruction: 'x', bars: { start: 0, end: 2 } }),
    ValidationError,
  );
  await assert.rejects(
    () => music.reviseScore({ sourceJobId: 5, instruction: 'x', bars: { start: 1, end: 10001 } }),
    ValidationError,
  );
  assert.equal(calls.length, 0);
});

test('recordScore POSTs /edit and rejects a blank score', async () => {
  const { music, calls } = makeResource({ job_id: 11, status: 'PENDING' });
  await music.recordScore({ sourceJobId: 5, abc: 'X:1\nK:C\nCDEF|', allowTempoChange: true });
  assert.equal(calls[0].endpoint, `${V3}/edit`);
  assert.deepEqual(calls[0].data, { source_job_id: 5, abc: 'X:1\nK:C\nCDEF|', allow_tempo_change: true });
  await assert.rejects(() => music.recordScore({ sourceJobId: 5, abc: ' ' }), ValidationError);
  assert.equal(calls.length, 1);
});

test('recordScore without abc fetches the source score first', async () => {
  const { music, calls } = makeResource({ abc: 'X:1\nK:C\nG|\n', editable: true }, { job_id: 12, status: 'PENDING' });
  const job = await music.recordScore({ sourceJobId: 5, style: 'jazz' });
  assert.equal(job.job_id, 12);
  assert.deepEqual(calls, [
    { method: 'GET', endpoint: `${V3}/jobs/5/score`, data: undefined },
    { method: 'POST', endpoint: `${V3}/edit`, data: { source_job_id: 5, abc: 'X:1\nK:C\nG|', style: 'jazz' } },
  ]);
});

test('recordScore without abc on a scoreless source throws before /edit', async () => {
  const { music, calls } = makeResource({ abc: null, editable: false });
  await assert.rejects(() => music.recordScore({ sourceJobId: 5 }), ValidationError);
  assert.equal(calls.length, 1);
});

test('generateV3 POSTs /generate', async () => {
  const { music, calls } = makeResource({ job_id: 12, status: 'PENDING' });
  await music.generateV3({ style: 'synthwave', abc: 'X:1', seed: 3 });
  assert.equal(calls[0].endpoint, `${V3}/generate`);
  assert.deepEqual(calls[0].data, { style: 'synthwave', abc: 'X:1', seed: 3 });
});

test('read paths', async () => {
  const { music, calls } = makeResource([]);
  await music.getV3Job(3);
  await music.getScore(3);
  await music.listV3Jobs({ workflow: 'plan', sourceJobId: 3 });
  assert.deepEqual(calls, [
    { method: 'GET', endpoint: `${V3}/jobs/3`, data: undefined },
    { method: 'GET', endpoint: `${V3}/jobs/3/score`, data: undefined },
    { method: 'GET', endpoint: `${V3}/jobs`, data: { skip: 0, limit: 50, workflow: 'plan', source_job_id: 3 } },
  ]);
});

// --- polling -----------------------------------------------------------------

test('waitForV3Job polls until COMPLETED', async () => {
  const { music, calls } = makeResource(
    { job_id: 7, status: 'PENDING' },
    { job_id: 7, status: 'PROCESSING' },
    { job_id: 7, status: 'COMPLETED', audio_url: 'https://x/a.flac' },
  );
  const job = await music.waitForV3Job(7, { pollInterval: 1 });
  assert.equal(job.audio_url, 'https://x/a.flac');
  assert.equal(calls.length, 3);
  assert.ok(calls.every((c) => c.endpoint === `${V3}/jobs/7`));
});

test('waitForV3Job rejects on failure', async () => {
  const { music } = makeResource({ job_id: 7, status: 'FAILED', error_message: 'boom' });
  await assert.rejects(() => music.waitForV3Job(7, { pollInterval: 1 }), (err: unknown) => {
    assert.ok(err instanceof AudioPodError);
    assert.match((err as Error).message, /boom/);
    return true;
  });
});

test('waitForV3Job times out', async () => {
  const { music } = makeResource({ job_id: 7, status: 'PROCESSING' });
  await assert.rejects(() => music.waitForV3Job(7, { timeout: 0, pollInterval: 1 }), /did not complete/);
});

// --- v2 quality is accepted but not sent by default ----------------------------

test('v2 create does not send quality unless set', async () => {
  const { music, calls } = makeResource({ id: 1 });
  await music.create({ prompt: 'ambient' });
  assert.equal((calls[0].data as Record<string, unknown>).quality, undefined);
  await music.create({ prompt: 'ambient', quality: 'premium' });
  assert.equal((calls[1].data as Record<string, unknown>).quality, 'premium');
});

// --- transport: the Idempotency-Key header reaches axios ---------------------

test('AudioPod.post forwards per-request headers to axios', async () => {
  const { default: AudioPod } = await import('../src/client');
  const client = new AudioPod({ apiKey: 'ap_test' });
  const seen: unknown[][] = [];
  (client as any)._axios.post = async (...args: unknown[]) => {
    seen.push(args);
    return { data: { job_id: 1, status: 'PENDING' } };
  };
  await client.music.reviseScore({ sourceJobId: 5, instruction: 'brighter', idempotencyKey: 'abc' });
  assert.equal(seen[0][0], `${V3}/revise`);
  assert.deepEqual(seen[0][2], { headers: { 'Idempotency-Key': 'abc' } });
});
