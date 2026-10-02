import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { join } from 'node:path';
import ts from 'typescript';
import AudioPod from '../src/client';

test('public podcast metadata types accept legacy/null values and reject wrong frame/identity shapes', () => {
  const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
  assert.equal(config.error, undefined);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd());
  const program = ts.createProgram([...parsed.fileNames, join(process.cwd(), 'test/podcast-types.fixture.ts')],
    { ...parsed.options, rootDir: process.cwd(), noEmit: true });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.deepEqual(diagnostics.map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')), []);
});

test('actual JSON reads preserve take metadata and transcript round trips keep stable IDs', async () => {
  const timing = { dialogue_id: 'line', take_identity: null, audio_sha256: 'a'.repeat(64),
    format: 'wav', start_frame: 11025, end_frame: 22050, sample_rate: 44100 };
  const payloads = [
    { id: 'project', dialogues: [{ speaker: 'Host', text: 'Legacy' }], future_response_field: 'kept' },
    { id: 'project', dialogues: [{ id: 'line', speaker: 'Host', text: 'Legacy', take_identity: null }], combined_timing: null },
    { id: 'project', dialogues: [{ id: 'line', speaker: 'Host', text: 'Hello', take_identity: 'b'.repeat(64) }], combined_timing: [timing] },
  ];
  const writes: any[] = [];
  let current = 0;
  const server = createServer(async (request, response) => {
    if (request.method === 'PUT') {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(chunk);
      writes.push(JSON.parse(Buffer.concat(chunks).toString('utf8')));
    }
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify(payloads[current]));
  }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const client = new AudioPod({ apiKey: 'ap_isolated', baseUrl: `http://127.0.0.1:${(server.address() as any).port}`, maxRetries: 0 });
    for (current = 0; current < payloads.length; current++) {
      const project = await client.podcast.getProject('project');
      assert.deepEqual(project, payloads[current]);
      await client.podcast.updateTranscript('project', project.dialogues!);
    }
    assert.deepEqual(writes, [
      { dialogues: [{ speaker: 'Host', text: 'Legacy' }] },
      { dialogues: [{ id: 'line', speaker: 'Host', text: 'Legacy' }] },
      { dialogues: [{ id: 'line', speaker: 'Host', text: 'Hello' }] },
    ]);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
