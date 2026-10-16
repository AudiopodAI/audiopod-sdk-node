/**
 * PLAT-3970: `mode` on narrateParagraph / batchNarrate / costEstimate.
 *
 * The SDK sends `mode` only when given, rejects unknown values (and the strict
 * `sentence` on batch / estimate) before any request, and returns the server's
 * `status: "skipped"` / `billing` fields unchanged.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Audiobook } from '../src/resources/audiobook';

function makeResource(reply: any = { job_id: 1 }) {
  const calls: { method: string; endpoint: string; data?: any }[] = [];
  const rec = (method: string) => async (endpoint: string, data?: any) => {
    calls.push({ method, endpoint, data });
    return reply;
  };
  return {
    resource: new Audiobook({ post: rec('POST'), get: rec('GET'), postForm: rec('POST') } as any),
    calls,
  };
}

for (const mode of ['auto', 'sentence', 'passage'] as const) {
  test(`narrateParagraph sends mode ${mode}`, async () => {
    const { resource, calls } = makeResource();
    await resource.narrateParagraph('p', 'para', { mode, voiceId: 3 });
    assert.equal(calls[0].endpoint, '/api/v1/audiobook/projects/p/paragraphs/para/narrate');
    assert.equal(calls[0].data.mode, mode);
    assert.equal(calls[0].data.voice_id, 3);
  });
}

test('narrateParagraph omits mode by default', async () => {
  const { resource, calls } = makeResource();
  await resource.narrateParagraph('p', 'para');
  assert.equal(calls[0].data.mode, undefined);
});

test('narrateParagraph returns a skipped no-audible-change edit', async () => {
  const { resource } = makeResource({
    task_id: null,
    job_id: null,
    paragraph_id: 'para',
    status: 'skipped',
    billing: { mode: 'none', billed_chars: 0, reason: 'no_audible_change', skipped: true },
  });
  const out = await resource.narrateParagraph('p', 'para', { mode: 'auto' });
  assert.equal(out.status, 'skipped');
  assert.equal(out.billing?.reason, 'no_audible_change');
});

for (const mode of ['auto', 'passage'] as const) {
  test(`batchNarrate sends mode ${mode}`, async () => {
    const { resource, calls } = makeResource();
    await resource.batchNarrate('p', { mode });
    assert.equal(calls[0].data.mode, mode);
  });
}

test('batchNarrate omits mode by default', async () => {
  const { resource, calls } = makeResource();
  await resource.batchNarrate('p');
  assert.equal(calls[0].data.mode, undefined);
});

const INVALID: [string, (r: Audiobook) => Promise<unknown>][] = [
  ['narrateParagraph', (r) => r.narrateParagraph('p', 'para', { mode: 'whole' as any })],
  ['batchNarrate', (r) => r.batchNarrate('p', { mode: 'sentence' as any })],
  ['costEstimate', (r) => r.costEstimate('p', { mode: 'sentence' as any })],
];

for (const [name, call] of INVALID) {
  test(`${name}: invalid mode throws before any request`, async () => {
    const { resource, calls } = makeResource();
    await assert.rejects(call(resource), /mode must be one of/);
    assert.equal(calls.length, 0);
  });
}

test('costEstimate sends query params', async () => {
  const { resource, calls } = makeResource();
  await resource.costEstimate('p', { paragraphId: 'para', mode: 'passage' });
  assert.equal(calls[0].method, 'GET');
  assert.equal(calls[0].endpoint, '/api/v1/audiobook/projects/p/cost-estimate');
  assert.deepEqual(calls[0].data, { paragraph_id: 'para', mode: 'passage' });
});

test('costEstimate without options sends no params', async () => {
  const { resource, calls } = makeResource();
  await resource.costEstimate('p');
  assert.equal(calls[0].data, undefined);
});

test('getCost reads the project cost', async () => {
  const { resource, calls } = makeResource({ project_id: 'p', breakdown: { sentence_edits: { count: 2 } } });
  const out = await resource.getCost('p');
  assert.equal(calls[0].method, 'GET');
  assert.equal(calls[0].endpoint, '/api/v1/audiobook/projects/p/cost');
  assert.equal(out.breakdown.sentence_edits?.count, 2);
});
