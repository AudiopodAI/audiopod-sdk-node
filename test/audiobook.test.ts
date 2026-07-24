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
  // No request body — matches `regenerateChapter` (post with no data argument).
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
