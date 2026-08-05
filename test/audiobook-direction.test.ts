/**
 * Unit tests for the Audiobook resource's direction surface (PLAT-2677).
 *
 * These endpoints existed on the API for days before the SDK could reach them,
 * which is the gap this suite exists to keep closed. The transport is mocked at
 * the resource's `client` boundary — a fake client records the method, path and
 * body, so no network or axios is involved.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Audiobook } from '../src/resources/audiobook';

interface RecordedCall {
  method: 'post' | 'get' | 'postForm';
  endpoint: string;
  data?: unknown;
}

function makeResource(respond: (call: RecordedCall) => unknown = () => ({})) {
  const calls: RecordedCall[] = [];
  const record = (method: RecordedCall['method']) => async (endpoint: string, data?: unknown) => {
    const call: RecordedCall = { method, endpoint, data };
    calls.push(call);
    return respond(call);
  };
  const fakeClient = {
    post: record('post'),
    get: record('get'),
    postForm: record('postForm'),
  };
  return { resource: new Audiobook(fakeClient as any), calls };
}

// ---------------------------------------------------------------- autoDirect

test('autoDirect posts to the direction/auto path and returns the queued job', async () => {
  const job = { job_id: '901', total_chapters: 23 };
  const { resource, calls } = makeResource(() => job);

  const result = await resource.autoDirect('proj_abc');

  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, 'post');
  assert.equal(calls[0].endpoint, '/api/v1/audiobook/projects/proj_abc/direction/auto');
  assert.deepEqual(result, job);
});

test('autoDirect omits chapter_ids entirely when no subset is given', async () => {
  // The server reads "no chapter_ids" as "the whole book". Sending an empty
  // array instead would scope the run to nothing and 400 with "No chapters
  // found to direct".
  const { resource, calls } = makeResource(() => ({ job_id: '1', total_chapters: 1 }));

  await resource.autoDirect('proj_abc');

  assert.deepEqual(calls[0].data, {});
  assert.ok(!('chapter_ids' in (calls[0].data as object)));
});

test('autoDirect scopes to a chapter subset when asked', async () => {
  const { resource, calls } = makeResource(() => ({ job_id: '1', total_chapters: 1 }));

  await resource.autoDirect('proj_abc', { chapterIds: ['ch1', 'ch2'] });

  assert.deepEqual(calls[0].data, { chapter_ids: ['ch1', 'ch2'] });
});

// -------------------------------------------------------------------- status

test('autoDirectionStatus and latestAutoDirection hit their documented paths', async () => {
  const { resource, calls } = makeResource(() => ({ job_id: '901', status: 'COMPLETED', progress: 100 }));

  await resource.autoDirectionStatus('proj_abc', 901);
  await resource.latestAutoDirection('proj_abc');

  assert.equal(calls[0].endpoint, '/api/v1/audiobook/projects/proj_abc/direction/auto/901/status');
  assert.equal(calls[0].method, 'get');
  assert.equal(calls[1].endpoint, '/api/v1/audiobook/projects/proj_abc/direction/auto/latest');
  assert.equal(calls[1].method, 'get');
});

test('autoDirectAndWait polls until the run reaches a terminal state', async () => {
  const states = ['PENDING', 'PROCESSING', 'COMPLETED'];
  let polled = 0;
  const { resource } = makeResource((call) => {
    if (call.endpoint.endsWith('/direction/auto')) return { job_id: '901', total_chapters: 2 };
    return { job_id: '901', status: states[polled++] ?? 'COMPLETED', progress: 100 };
  });

  const status = await resource.autoDirectAndWait('proj_abc', {}, { pollIntervalMs: 1 });

  assert.equal(status.status, 'COMPLETED');
  assert.equal(polled, 3);
});

test('autoDirectAndWait stops on FAILED rather than polling to the timeout', async () => {
  const { resource } = makeResource((call) => {
    if (call.endpoint.endsWith('/direction/auto')) return { job_id: '901', total_chapters: 2 };
    return { job_id: '901', status: 'FAILED', progress: 0, error_message: 'nope' };
  });

  const status = await resource.autoDirectAndWait('proj_abc', {}, { pollIntervalMs: 1 });

  assert.equal(status.status, 'FAILED');
});

// ----------------------------------------------------------- parseManuscript

test('parseManuscript still sends only the two required fields by default', async () => {
  // auto_direction is TRI-state on the wire: absent means "use the default for
  // my auth method". Sending `false` by default would silently convert the
  // absent case into an explicit opt-out.
  const { resource, calls } = makeResource(() => ({ job_id: 5 }));

  await resource.parseManuscript('proj_abc', 'key123', 'book.epub');

  assert.deepEqual(calls[0].data, { file_key: 'key123', filename: 'book.epub' });
});

test('parseManuscript forwards an explicit auto_direction opt-in', async () => {
  const { resource, calls } = makeResource(() => ({ job_id: 5 }));

  await resource.parseManuscript('proj_abc', 'key123', 'book.epub', { autoDirection: true });

  assert.deepEqual(calls[0].data, {
    file_key: 'key123',
    filename: 'book.epub',
    auto_direction: true,
  });
});

test('parseManuscript forwards an explicit auto_direction opt-OUT', async () => {
  const { resource, calls } = makeResource(() => ({ job_id: 5 }));

  await resource.parseManuscript('proj_abc', 'key123', 'book.epub', { autoDirection: false });

  assert.equal((calls[0].data as any).auto_direction, false);
});

test('parseManuscript forwards force', async () => {
  const { resource, calls } = makeResource(() => ({ job_id: 5 }));

  await resource.parseManuscript('proj_abc', 'key123', 'book.epub', { force: true });

  assert.equal((calls[0].data as any).force, true);
});

// ------------------------------------------------------------- batchNarrate

test('batchNarrate passes delivery_mode through narration_settings verbatim', async () => {
  const { resource, calls } = makeResource(() => ({ job_id: 7, total_paragraphs: 40 }));

  await resource.batchNarrate('proj_abc', {
    chapterIds: ['ch8'],
    includeCompleted: true,
    narrationSettings: { delivery_mode: 'creative' },
  });

  const body = calls[0].data as any;
  assert.equal(body.narration_settings.delivery_mode, 'creative');
  assert.equal(body.include_completed, true);
  assert.deepEqual(body.chapter_ids, ['ch8']);
});
