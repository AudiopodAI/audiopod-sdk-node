/**
 * PLAT-3944: an explicit empty selection array must never mean "the whole book".
 *
 * The API answers `[]` in chapter_ids / paragraph_ids / include_chapters with
 * 400 `empty_selection` (PLAT-3943). The SDK throws before any request, omits
 * the field for `undefined`, and sends any non-empty array verbatim.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Audiobook } from '../src/resources/audiobook';

function makeResource() {
  const calls: { endpoint: string; data?: any }[] = [];
  const post = async (endpoint: string, data?: any) => {
    calls.push({ endpoint, data });
    return { job_id: '1' };
  };
  return { resource: new Audiobook({ post, get: post, postForm: post } as any), calls };
}

type Case = [string, string, string, (r: Audiobook, v: string[] | undefined) => Promise<unknown>];

const CASES: Case[] = [
  ['autoDirect', 'chapterIds', 'chapter_ids', (r, v) => r.autoDirect('p', { chapterIds: v })],
  ['batchNarrate', 'chapterIds', 'chapter_ids', (r, v) => r.batchNarrate('p', { chapterIds: v })],
  ['batchNarrate', 'paragraphIds', 'paragraph_ids', (r, v) => r.batchNarrate('p', { paragraphIds: v })],
  ['startNarration', 'chapterIds', 'chapter_ids', (r, v) => r.startNarration('p', { voiceId: 7, chapterIds: v } as any)],
  ['startExport', 'includeChapters', 'include_chapters', (r, v) => r.startExport('p', v)],
];

for (const [method, param, wire, call] of CASES) {
  test(`${method}: empty ${param} throws before any request`, async () => {
    const { resource, calls } = makeResource();
    await assert.rejects(call(resource, []), {
      message: `${param} is empty; pass undefined to use the whole book`,
    });
    assert.equal(calls.length, 0);
  });

  test(`${method}: undefined ${param} omits ${wire}`, async () => {
    const { resource, calls } = makeResource();
    await call(resource, undefined);
    assert.equal(calls[0].data?.[wire], undefined);
  });

  test(`${method}: non-empty ${param} is sent as ${wire}`, async () => {
    const { resource, calls } = makeResource();
    await call(resource, ['c1', 'c2']);
    assert.deepEqual(calls[0].data[wire], ['c1', 'c2']);
  });
}
