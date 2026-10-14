/**
 * PLAT-3976: the create endpoints don't all answer `{ id }`, and diarize reads
 * a form body plus a query string.
 *
 * - POST /voice/voices/{id}/generate answers `{ job_id }`: voice.generate()
 *   polled tts-jobs/undefined/status.
 * - POST /music/{task} answers `{ job: { id }, message }`: music.generate()
 *   polled jobs/undefined.
 * - POST /speaker/diarize reads `url` from the form and `num_speakers` from the
 *   query: a JSON body lost both.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Voice } from '../src/resources/voice';
import { Music } from '../src/resources/music';
import { Speaker } from '../src/resources/speaker';

type Call = { via: string; endpoint: string; data?: any };

function fakeClient(createResponse: any, done: any) {
  const calls: Call[] = [];
  const rec = (via: string) => async (endpoint: string, data?: any) => {
    calls.push({ via, endpoint, data });
    return via === 'get' ? done : createResponse;
  };
  return { calls, client: { post: rec('post'), postForm: rec('postForm'), upload: rec('upload'), get: rec('get') } };
}

test('voice.generate polls the job_id the generate endpoint returns', async () => {
  const { calls, client } = fakeClient(
    { job_id: 7, status: 'PENDING' },
    { id: 7, status: 'COMPLETED', output_url: 'https://x/7.mp3' },
  );
  const job = await new Voice(client as any).generate({ text: 'hi', voiceId: 368 });
  assert.equal(job.output_url, 'https://x/7.mp3');
  assert.ok(calls.some((c) => c.via === 'get' && c.endpoint.includes('/7/')), JSON.stringify(calls));
  assert.ok(!calls.some((c) => c.endpoint.includes('undefined')));
});

test('music.generate polls the nested job.id', async () => {
  const { calls, client } = fakeClient(
    { job: { id: 9, status: 'PENDING' }, message: 'started' },
    { id: 9, status: 'COMPLETED', output_url: 'https://x/9.flac' },
  );
  const track = await new Music(client as any).generate({ prompt: 'lo-fi', duration: 30 });
  assert.equal(track.output_url, 'https://x/9.flac');
  assert.ok(calls.some((c) => c.via === 'get' && c.endpoint.includes('/9')), JSON.stringify(calls));
  assert.ok(!calls.some((c) => c.endpoint.includes('undefined')));
});

test('speaker.diarize by URL sends a form and num_speakers as a query param', async () => {
  const { calls, client } = fakeClient({ id: 1, status: 'PENDING' }, {});
  await new Speaker(client as any).diarize({ url: 'https://example.com/a.mp3', numSpeakers: 2 });
  assert.equal(calls[0].via, 'postForm');
  assert.equal(calls[0].endpoint, '/api/v1/speaker/diarize?num_speakers=2');
  assert.deepEqual(calls[0].data, { url: 'https://example.com/a.mp3' });
});

test('speaker.diarize without numSpeakers sends no query string', async () => {
  const { calls, client } = fakeClient({ id: 1, status: 'PENDING' }, {});
  await new Speaker(client as any).diarize({ file: './a.mp3' });
  assert.equal(calls[0].via, 'upload');
  assert.equal(calls[0].endpoint, '/api/v1/speaker/diarize');
});
