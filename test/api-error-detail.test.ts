/**
 * PLAT-3961: when an API error `detail` is an object, the thrown APIError
 * shows `detail.message`, never `[object Object]`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import AudioPod from '../src/client';
import { APIError } from '../src/errors';

function httpError(status: number, data: any): any {
  return { message: `Request failed with status code ${status}`, response: { status, data } };
}

test('object detail surfaces detail.message', () => {
  const client = new AudioPod({ apiKey: 'ap_test' });
  assert.throws(
    () => client._handleError(httpError(400, { detail: { message: 'Voice not ready', code: 'x' } })),
    (err: any) =>
      err instanceof APIError &&
      err.message.includes('Voice not ready') &&
      !err.message.includes('[object Object]')
  );
});

test('string detail is unchanged', () => {
  const client = new AudioPod({ apiKey: 'ap_test' });
  assert.throws(
    () => client._handleError(httpError(404, { detail: 'Not found' })),
    (err: any) => err instanceof APIError && err.message.includes('Not found')
  );
});
