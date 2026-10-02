import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Voice } from '../src/resources/voice';
import { VERSION } from '../src/version';
import metadata from '../package.json';
import { APIError } from '../src/errors';

function fixture(failure?: Error) {
  const calls: Array<{ method: string; path: string; body?: any; args?: any[] }> = [];
  const record = (method: string) => async (path: string, body?: any, ...args: any[]) => {
    calls.push({ method, path, body, args });
    if (failure) throw failure;
    return { readiness: { state: 'unknown' }, quote_identity: 'q1' };
  };
  const client = Object.fromEntries(['get', 'post', 'put', 'delete', 'upload', 'postForm'].map(method => [method, record(method)]));
  return { voice: new Voice(client as any), calls };
}

test('unknown capability facts remain unknown and operation/UUID are sent', async () => {
  const { voice, calls } = fixture();
  const result = await voice.capabilities('cc29e2ea-99cd-4123-91fd-cefd7ce29c03', 'audition');
  assert.equal(result.readiness.state, 'unknown');
  assert.equal(calls[0].path, '/api/v1/voice/voices/cc29e2ea-99cd-4123-91fd-cefd7ce29c03/capabilities');
  assert.deepEqual(calls[0].body, { operation: 'audition' });
});

test('Hindi project pronunciation carries version zero and reset CAS without cascading requests', async () => {
  const { voice, calls } = fixture();
  const scope = { language: 'hi', project_kind: 'podcast' as const, project_id: 'project space' };
  await voice.setPronunciation(scope, { expected_version: 0, entries: [{ source: 'राकेश', alias: 'राकेश जी' }] });
  await voice.resetPronunciation(scope, 4);
  const save = new URL(calls[0].path, 'https://fixture.invalid');
  const reset = new URL(calls[1].path, 'https://fixture.invalid');
  assert.equal(save.searchParams.get('project_id'), 'project space');
  assert.equal(calls[0].body.expected_version, 0);
  assert.equal(reset.searchParams.get('expected_version'), '4');
  assert.equal(calls[1].method, 'delete');
});

test('quote is no-spend; acceptance sends explicit confirmation and same full context', async () => {
  const { voice, calls } = fixture();
  const params = { text: 'नमस्ते राकेश', language: 'hi', speed: 1.1, project_kind: 'tts' as const, project_id: 'p1' };
  await voice.quoteAudition(5, params);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, '/api/v1/voice/auditions/5/quote');
  assert.equal(calls[0].body.confirm, undefined);
  await voice.audition(5, { ...params, quote_identity: 'q1', idempotency_key: '2fd18aeb-a0c7-477e-a1a3-d5c7c3f44154', confirm: true });
  assert.deepEqual(calls[1].body, { ...params, quote_identity: 'q1', idempotency_key: '2fd18aeb-a0c7-477e-a1a3-d5c7c3f44154', confirm: true });
});

test('stale confirmation returns original error without auto-requoting or spending again', async () => {
  const error = new APIError('audition_quote_changed', 409);
  const { voice, calls } = fixture(error);
  await assert.rejects(() => voice.audition(5, { text: 'hello', language: 'en', quote_identity: 'old', idempotency_key: '2fd18aeb-a0c7-477e-a1a3-d5c7c3f44154', confirm: true }), e => e === error);
  assert.equal(calls.length, 1);
});

test('reference upload passes exact fractional crop as multipart file', async () => {
  const { voice, calls } = fixture();
  await voice.referenceDiagnostics({ audioFile: '/fixture.wav', cropStartSeconds: 2.25, cropEndSeconds: 7.5 });
  assert.equal(calls[0].path, '/api/v1/voice/reference/diagnostics');
  assert.deepEqual(calls[0].args, ['file', { crop_start_seconds: 2.25, crop_end_seconds: 7.5 }]);
});

test('generation sends the expected pronunciation identity in the form contract', async () => {
  const { voice, calls } = fixture();
  await voice.speak({ text: 'hello', voiceId: 'voice-id', pronunciationProjectKind: 'tts', pronunciationProjectId: 'p1', pronunciationIdentity: 'rules1' });
  assert.equal(calls[0].method, 'postForm');
  assert.equal(calls[0].body.pronunciation_identity, 'rules1');
  assert.equal(calls[0].body.pronunciation_project_id, 'p1');
});

test('runtime and transport version are derived from package metadata', () => {
  assert.equal(VERSION, metadata.version);
});

test('canonical job_id envelopes produce a compatible id for acceptance and polling', async () => {
  const client = {
    post: async () => ({ job_id: 27, status: 'pending', audition: {} }),
    postForm: async () => ({ job_id: 28, status: 'pending' }),
    get: async () => ({ job_id: 29, status: 'completed' }),
  };
  const voice = new Voice(client as any);
  const audition = await voice.audition(5, { text: 'hello', language: 'en', quote_identity: 'q1', idempotency_key: '2fd18aeb-a0c7-477e-a1a3-d5c7c3f44154', confirm: true });
  assert.equal(audition.id, 27);
  assert.equal(audition.job_id, 27);
  assert.equal((await voice.speak({ voiceId: 5, text: 'hello' })).id, 28);
  assert.equal((await voice.getJob(29)).id, 29);
});
