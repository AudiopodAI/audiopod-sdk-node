import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import AudioPod from '../src/client';
import { Dubbing } from '../src/resources/dubbing';
import { Voice } from '../src/resources/voice';
import { APIError } from '../src/errors';
import { canonicalUuid } from '../src/workflow-utils';
import { main } from '../src/cli';
import axios from 'axios';

const id = 'AAAAAAAA-1111-2222-3333-BBBBBBBBBBBB';
const canonical = id.toLowerCase();
const key = 'CCCCCCCC-4444-5555-6666-DDDDDDDDDDDD';
function fixture(response: any = {}) {
  const calls: any[] = [];
  const methods = Object.fromEntries(['get','post','put','patch','delete','upload','getBytes'].map(method=>[method,async (...args:any[])=>{
    calls.push({method,args}); return response;
  }]));
  return { dubbing:new Dubbing(methods as any), voice:new Voice(methods as any), calls };
}

test('quotes are read-only, accepted confirmation keeps exact digest and canonical caller UUID',async()=>{
  const {dubbing,calls} = fixture();
  await dubbing.quote(id,true);
  await dubbing.analyze(id,{confirm:true,confirmations:[{edition_id:id,expected_revision:3,quote_identity:'q'.repeat(64),idempotency_key:key,retranslate:true}]});
  assert.deepEqual(calls[0],{method:'get',args:[`/api/v1/dubbing/editions/${canonical}/quote`,{retranslate:true}]});
  assert.equal(calls[1].args[1].confirmations[0].idempotency_key,key.toLowerCase());
  assert.equal(calls[1].args[1].confirmations[0].quote_identity,'q'.repeat(64));
  assert.throws(()=>dubbing.analyze(id,{confirm:false,confirmations:[]} as any),TypeError);
  assert.equal(calls.length,2);
  assert.throws(()=>canonicalUuid('not-a-uuid'),TypeError);
  await dubbing.retranslate(id,{expected_revision:3,quote_identity:'q'.repeat(64),confirm:true});
  assert.equal(calls[2].args[0],`/api/v1/dubbing/jobs/${canonical}/retranslate`);
  assert.throws(()=>dubbing.retranslate(id,{expected_revision:3,quote_identity:'q'.repeat(64),confirm:false} as any),TypeError);
});

test('wait returns review and partial-export decisions without automatically generating or retrying',async()=>{
  for (const status of ['review_required','export_partial','completed']) {
    const {dubbing,calls} = fixture({id:canonical,status,financial_disposition:'held'});
    assert.equal((await dubbing.waitForJob(id)).status,status);
    assert.equal(calls.length,1); assert.equal(calls[0].method,'get');
  }
  const failed = fixture({id:canonical,status:'expired',error_code:'review_expired'});
  await assert.rejects(()=>failed.dubbing.waitForJob(id),error=>error instanceof APIError && error.code==='review_expired');
  const pending = fixture({id:canonical,status:'settle_pending'});
  await assert.rejects(()=>pending.dubbing.waitForJob(id,{timeout:0}),error=>error instanceof APIError && error.code==='wait_timeout' && error.action==='poll_job' && (error.detail as any).job.status==='settle_pending');
});

test('private agency resources preserve revision CAS, manual recipient and encoded invitation token',async()=>{
  const {dubbing,calls} = fixture();
  await dubbing.setGlossary({language:'hi',project_id:id},{expected_version:0,mode:'override',entries:[{source:'AudioPod',mode:'keep_unchanged'}]});
  await dubbing.resetGlossary({language:'hi'},4);
  await dubbing.inviteReviewer(id,'recipient@isolated.invalid');
  await dubbing.getReview('token/?private');
  await dubbing.addComment('token/?private',{expected_revision:2,segment_id:'s1',position_us:125000,body:'Review this term'});
  assert.equal(calls[0].args[1].expected_version,0);
  assert.equal(new URL(calls[0].args[0],'https://isolated.invalid').searchParams.get('project_id'),canonical);
  assert.equal(calls[1].method,'delete');
  assert.equal(calls[2].args[1].recipient_email,'recipient@isolated.invalid');
  assert.ok(calls[3].args[0].endsWith('token%2F%3Fprivate'));
  assert.equal(calls[4].args[1].expected_revision,2);
  assert.equal(calls.length,5);
});

test('strict admission uses the same file, exact transcript and replacement CAS; recovery is GET only',async()=>{
  const {voice,calls} = fixture();
  await voice.admitReference({audioFile:'/original.wav',consent_id:id,consent_revision:2,consent_version:'policy',transcription:'मेरी आवाज़',confirm_transcription:true,replace_voice_id:17,reference_revision:4});
  await voice.registerReference({audioFile:'/original.wav',admission_token:'opaque',idempotency_key:key,name:'Narrator'});
  await voice.registrationStatus(key);
  assert.equal(calls[0].args[1],calls[1].args[1]);
  assert.equal(calls[0].args[3].reference_revision,4);
  assert.equal(calls[0].args[3].transcription,'मेरी आवाज़');
  assert.equal(calls[1].args[3].idempotency_key,key.toLowerCase());
  assert.equal(calls[2].method,'get');
  assert.ok(calls[2].args[0].endsWith(key.toLowerCase()));
});

test('real loopback transport preserves structured409 and Retry-After, without POST retry or re-quote',async()=>{
  let calls = 0;
  const server = createServer((request,response)=>{
    calls++; assert.equal(request.headers['x-api-key'],undefined);
    assert.equal(request.headers.authorization,'Bearer isolated-jwt');
    response.writeHead(409,{'content-type':'application/json','retry-after':'7'});
    response.end(JSON.stringify({detail:{code:'quote_changed',action:'new_quote',revision:4}}));
  }).listen(0,'127.0.0.1');
  await once(server,'listening');
  const port = (server.address() as any).port;
  try {
    const client = new AudioPod({accessToken:'isolated-jwt',baseUrl:`http://127.0.0.1:${port}`,maxRetries:9});
    await assert.rejects(()=>client.dubbing.generate(id,{expected_revision:3,quote_identity:'old',confirm:true}),error=>{
      assert.ok(error instanceof APIError); assert.equal(error.code,'quote_changed');
      assert.equal(error.action,'new_quote'); assert.equal(error.retryAfter,'7');
      assert.deepEqual(error.detail,{code:'quote_changed',action:'new_quote',revision:4}); return true;
    });
    assert.equal(calls,1);
  } finally { await new Promise<void>(resolve=>server.close(()=>resolve())); }
});

test('presigned PUT sends original bytes and never carries API credentials',async()=>{
  const raw = Buffer.from('original audio bytes'.repeat(1000));
  const directory = await fs.mkdtemp(join(tmpdir(),'audiopod-sdk-'));
  const file = join(directory,'original.wav'); await fs.writeFile(file,raw);
  const server = createServer(async(request,response)=>{
    if (request.method==='POST') {
      response.writeHead(200,{'content-type':'application/json'});
      response.end(JSON.stringify({upload_id:canonical,url:`http://127.0.0.1:${(server.address() as any).port}/bytes`,method:'PUT',headers:{'content-type':'audio/wav'},key_expires_in:60}));
    } else {
      assert.equal(request.headers.authorization,undefined); assert.equal(request.headers['x-api-key'],undefined);
      const chunks:Buffer[]=[]; for await (const chunk of request) chunks.push(chunk);
      assert.deepEqual(Buffer.concat(chunks),raw); response.writeHead(200,{etag:'isolated'}); response.end();
    }
  }).listen(0,'127.0.0.1'); await once(server,'listening');
  const originalAuth = axios.defaults.headers.common.Authorization;
  const originalKey = axios.defaults.headers.common['X-API-Key'];
  const originalBasic = axios.defaults.auth;
  try {
    const client = new AudioPod({apiKey:'ap_isolated',baseUrl:`http://127.0.0.1:${(server.address() as any).port}`});
    const upload = await client.uploads.presign({service:'dubbing',filename:'original.wav',content_type:'audio/wav',size_bytes:raw.length});
    axios.defaults.headers.common.Authorization = 'Bearer ambient-must-not-leak';
    axios.defaults.headers.common['X-API-Key'] = 'ambient-must-not-leak';
    axios.defaults.auth = {username:'ambient',password:'must-not-leak'};
    assert.deepEqual(await client.uploads.put(upload,file),{upload_session_id:canonical,etag:'isolated'});
  } finally {
    axios.defaults.headers.common.Authorization = originalAuth;
    axios.defaults.headers.common['X-API-Key'] = originalKey;
    axios.defaults.auth = originalBasic;
    await new Promise<void>(resolve=>server.close(()=>resolve())); await fs.rm(directory,{recursive:true});
  }
});

test('dubbing pronunciation identity uses canonical project UUID and JWT cannot enter an API-key websocket query',async()=>{
  const {voice,calls} = fixture();
  await voice.resolvePronunciation({language:'hi',project_kind:'dubbing',project_id:id},'AudioPod');
  await voice.quoteAudition(17,{text:'AudioPod',language:'hi',project_kind:'dubbing',project_id:id});
  assert.equal(calls[0].args[1].project_id,canonical);
  assert.equal(calls[1].args[1].project_id,canonical);
  assert.throws(()=>new AudioPod({accessToken:'isolated-jwt'}).streamUrl('/socket'),/requires an API key/);
});

test('CLI analyze requires explicit confirmation before creating a transport',async()=>{
  const previous = process.exit;
  const stderr = process.stderr.write;
  process.exit = ((code:number)=>{throw new Error(`exit ${code}`);}) as never;
  process.stderr.write = (()=>true) as never;
  try { await assert.rejects(()=>main(['dubbing','analyze',id]),/exit 1/); }
  finally { process.exit=previous; process.stderr.write=stderr; }
});
