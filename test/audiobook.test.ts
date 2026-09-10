/**
 * Unit tests for the Audiobook resource's narration-cancel method (PLAT-2591).
 *
 * The transport is mocked at the resource's `client` boundary — a fake client
 * records the POST path + body and returns a canned response, so no network or
 * axios is involved.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Audiobook, AudiobookNarrationCancellation } from '../src/resources/audiobook';
import { APIError } from '../src/errors';

interface RecordedPost {
  endpoint: string;
  data: unknown;
}

function makeResource(postImpl: (endpoint: string, data?: unknown) => unknown) {
  const calls: RecordedPost[] = [];
  const fakeClient = {
    async post(endpoint: string, data?: unknown) {
      calls.push({ endpoint, data });
      return postImpl(endpoint, data);
    },
  };
  // The Audiobook ctor only ever touches `client.post` on this path.
  const resource = new Audiobook(fakeClient as any);
  return { resource, calls };
}

test('cancelNarration POSTs to the narration/cancel path with no body and returns the parsed body', async () => {
  const body: AudiobookNarrationCancellation = {
    job_id: 4242,
    status: 'cancelled',
    paragraphs_kept: 12,
    paragraphs_reset: 8,
    billing_released: 640,
    project_status: 'narration_cancelled',
  };
  const { resource, calls } = makeResource(() => body);

  const result = await resource.cancelNarration('proj_abc');

  assert.equal(calls.length, 1);
  assert.equal(calls[0].endpoint, '/api/v1/audiobook/projects/proj_abc/narration/cancel');
  // No request body — post with no data argument.
  assert.equal(calls[0].data, undefined);
  assert.deepEqual(result, body);
});

test('cancelNarration surfaces the idempotent 404 (no_narration_running) as an APIError', async () => {
  const { resource } = makeResource(() => {
    // Mirrors what BaseClient._handleError throws for a structured 404 detail.
    throw new APIError('no narration is currently running', 404);
  });

  await assert.rejects(
    () => resource.cancelNarration('proj_abc'),
    (err: unknown) => {
      assert.ok(err instanceof APIError);
      assert.equal((err as APIError).statusCode, 404);
      return true;
    },
  );
});

/**
 * PLAT-3116 — `regenerateChapter` must not call the retired route.
 *
 * `POST /chapters/{chapter_id}/regenerate` rendered a whole chapter's TTS
 * synchronously inside the request and charged nothing; it returns 410 Gone
 * (PLAT-3056). Every call through this method failed outright until it was
 * re-pointed at the billed batch route.
 */
test('regenerateChapter POSTs to narration/batch, not the 410 regenerate route', async () => {
  const { resource, calls } = makeResource(() => ({ job_id: 91, total_paragraphs: 40, skipped_paragraphs: 0 }));

  await resource.regenerateChapter('proj_abc', 'chap_7');

  assert.equal(calls.length, 1);
  assert.equal(calls[0].endpoint, '/api/v1/audiobook/projects/proj_abc/narration/batch');
  assert.ok(
    !calls[0].endpoint.includes('/regenerate'),
    'still calling the retired route — every request would 410',
  );
});

test('regenerateChapter scopes to the one chapter and forces include_completed', async () => {
  const { resource, calls } = makeResource(() => ({ job_id: 92, total_paragraphs: 40, skipped_paragraphs: 0 }));

  await resource.regenerateChapter('proj_abc', 'chap_7');

  const body = calls[0].data as Record<string, unknown>;
  assert.deepEqual(body.chapter_ids, ['chap_7'], 'must not re-narrate the whole project');
  // A chapter being RE-rendered already has audio. Without include_completed
  // every paragraph is skipped and the call 400s "No eligible paragraphs".
  assert.equal(body.include_completed, true);
});

test('regenerateChapter passes a voice override through', async () => {
  const { resource, calls } = makeResource(() => ({ job_id: 93, total_paragraphs: 40, skipped_paragraphs: 0 }));

  await resource.regenerateChapter('proj_abc', 'chap_7', { voiceId: 55 });

  assert.equal((calls[0].data as Record<string, unknown>).voice_id, 55);
});
