/**
 * PLAT-3976: `POST /denoiser/denoise` reads form fields (file | url,
 * quality_mode). A URL job sent as JSON reached the server with no URL, so
 * `denoise({ url })` must go through postForm, and `mode` maps to quality_mode.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Denoiser } from '../src/resources/denoiser';

function makeResource() {
  const calls: { via: string; endpoint: string; data?: any; extra?: any }[] = [];
  const record = (via: string) => async (endpoint: string, data?: any, _field?: any, extra?: any) => {
    calls.push({ via, endpoint, data, extra });
    return { id: 1, status: 'PENDING' };
  };
  const client = { post: record('post'), postForm: record('postForm'), upload: record('upload') };
  return { resource: new Denoiser(client as any), calls };
}

test('URL denoise is sent as a form, not JSON', async () => {
  const { resource, calls } = makeResource();
  await resource.create({ url: 'https://example.com/a.mp3' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].via, 'postForm');
  assert.deepEqual(calls[0].data, { url: 'https://example.com/a.mp3' });
});

test('mode is sent as quality_mode for a URL', async () => {
  const { resource, calls } = makeResource();
  await resource.create({ url: 'https://example.com/a.mp3', mode: 'ultra' });
  assert.deepEqual(calls[0].data, { url: 'https://example.com/a.mp3', quality_mode: 'ultra' });
});

test('mode is sent as quality_mode with a file upload', async () => {
  const { resource, calls } = makeResource();
  await resource.create({ file: './a.mp3', mode: 'balanced' });
  assert.equal(calls[0].via, 'upload');
  assert.deepEqual(calls[0].extra, { quality_mode: 'balanced' });
});

test('no mode leaves the server default', async () => {
  const { resource, calls } = makeResource();
  await resource.create({ file: './a.mp3' });
  assert.equal(calls[0].extra, undefined);
});
