# AudioPod Node.js SDK

Official Node.js SDK for [AudioPod AI](https://audiopod.ai) — an all-in-one AI
**audio** platform: music generation, text-to-speech (with directing), voice
cloning, stem separation, transcription, speaker separation, noise reduction,
and audiobook production.

This SDK is the **Platform (API + Agent)** surface of AudioPod — the developer
entry point alongside the [Python SDK](https://pypi.org/project/audiopod/), the
CLI, and the MCP server. **Start free** — mint a key, get free credits to try,
no card required. API usage is **pay-as-you-go** ($1 = 7,500 credits, credits
never expire).

[![npm version](https://badge.fury.io/js/audiopod.svg)](https://www.npmjs.com/package/audiopod)
[![Node 16+](https://img.shields.io/badge/node-16+-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Run in Postman](https://run.pstmn.io/button.svg)](https://god.gw.postman.com/run-collection/58401244-916ddbda-1a70-4c07-8ccd-fe524703a84b?action=collection%2Ffork&source=rip_markdown&collection-url=entityId%3D58401244-916ddbda-1a70-4c07-8ccd-fe524703a84b%26entityType%3Dcollection%26workspaceId%3D8013472d-5897-47d1-bf5c-92683a027b35&utm_source=audiopod-sdk-node)

Want to see a response before installing anything? The **Getting Started**
collection reaches a real `200` in two requests with no account and no API key.
[More about the collections](https://docs.audiopod.ai/sdks/postman).

## Installation

```bash
npm install audiopod
# or
yarn add audiopod
```

## Quick Start

```typescript
import AudioPod from "audiopod";

// Reads AUDIOPOD_API_KEY, or pass { apiKey: "ap_your_api_key" }
const client = new AudioPod();

// Text-to-speech
const job = await client.voice.speak({ text: "Welcome to AudioPod.", voiceId: 368 });
const done = await client.voice.waitForCompletion(job.id);
console.log(done.output_url);
```

Get a key at [audiopod.ai/dashboard/account/api-keys](https://www.audiopod.ai/dashboard/account/api-keys).

## Text-to-Speech

500+ voices across 85+ languages, with **inline directing** written straight
into the text.

```typescript
// Emotion, non-verbal sounds, pauses, and pronunciation — all inline in `text`
const job = await client.voice.speak({
  text: '[warm, unhurried] Good evening. [breathe] Tonight, a story. <break time="600ms"/> It begins in Worcester /ˈwʊstər/.',
  voiceId: 368,
});
```

- **Emotion / delivery** — a leading bracket per segment: `[whispering, tense] …`
- **Non-verbal sounds** — `[laugh] [sigh] [clear throat] [breathe] [cough] [yawn] [chuckle] [gasp] [groan]`
- **Pauses** — `<break time="500ms"/>` (≤10s each, ≤20 per request)
- **Pronunciation** — inline IPA between slashes: `Worcester /ˈwʊstər/`

Word-level timestamps (for follow-along / karaoke UIs) and **Voice Design**
(create a voice from a text description) are available via the REST API —
see [the docs](https://docs.audiopod.ai/api-reference/text-to-speech).

## Voice Cloning

### Effective voice settings and contextual auditions

The voice foundations endpoints require a server version that supports them.
Read capabilities for the intended operation before offering a language, format,
timing mode or control. `unknown` readiness is a reason to recheck, not permission
to assume support. UI locale does not select speech language.

```typescript
import { randomUUID } from "node:crypto";
const voiceId = 368; // Explicitly choose an authorized voice from voice.list().
const capability = await client.voice.capabilities(voiceId, 'audition');
if (capability.readiness.state !== 'ready') {
  throw new Error(capability.readiness.reason_code);
}
const context = { text: 'नमस्ते राकेश', language: 'hi' };
const quote = await client.voice.quoteAudition(voiceId, context);
// Display required_credits or cost_cents from the quoted billing_lane.
// After the user confirms this exact excerpt and price:
const idempotencyKey = randomUUID(); // Retain for retries of this confirmation.
const audition = await client.voice.audition(voiceId, {
  ...context, quote_identity: quote.quote_identity, idempotency_key: idempotencyKey, confirm: true,
});
const result = await client.voice.waitForCompletion(audition.id);
```

Auditions use the existing paid speech lane; requesting a quote does not generate
audio. A `409` means voice/settings/rules changed: fetch a new quote and ask for a
new confirmation. The SDK does not accept a replacement quote automatically.

Caller-owned pronunciation supports `getPronunciation`, `setPronunciation`,
`resetPronunciation` and `resolvePronunciation`, scoped by language and optional
`project_kind` / `project_id`. Save/reset uses the observed version. Reset restores
inheritance; `mode: 'disable'` explicitly disables rules. Resolve returns an
immutable `snapshot.identity`; pass it as `pronunciationIdentity` when generating
speech to reject changed rules. These rules affect spoken text, not printed text
or the existing text billing basis.

`referenceDiagnostics({ audioFile, cropStartSeconds, cropEndSeconds })` measures
the exact selected reference and returns raw/window/prepared digests, acoustic
facts and warnings. Diagnostics do not register a clone, verify speaker identity
or implicitly run transcription. Check `transcript_validation` independently.

### Exact-reference consent and recovery

New clones require an accepted consent receipt and an exact-reference admission.
The legacy `voice.create` request is deprecated and current servers reject it.
Existing stored voices remain usable. Measure a 3–15 second crop of the original
file, show its scope and consent policy, then obtain explicit confirmation:

```typescript
import { VOICE_CONSENT_VERSION } from 'audiopod';
const owner = new AudioPod({ accessToken: signedInJwt });
const audioFile = './original.wav';
const facts = await owner.voice.referenceDiagnostics({
  audioFile, cropStartSeconds: 0, cropEndSeconds: 10,
});
if (!facts.prepared_sha256) throw new Error('Choose a usable reference');
// Only after the signed-in owner accepts this exact recording and policy:
const receipt = await owner.voice.createConsent({
  project_kind: 'account', recording_sha256: facts.raw_sha256,
  window_sha256: facts.window_sha256, prepared_sha256: facts.prepared_sha256,
  crop: facts.crop, reference_filename: 'original.wav',
  consent_version: VOICE_CONSENT_VERSION, confirm: true,
});
const admission = await client.voice.admitReference({
  audioFile, consent_id: receipt.id, consent_revision: receipt.consent_revision,
  consent_version: receipt.consent_version,
  transcription: 'The exact words spoken in the selected crop.',
  confirm_transcription: true, // Explicitly authorize exact-window ASR validation.
});
const cloneKey = randomUUID(); // Store before submitting; retain after uncertainty.
const registration = await client.voice.registerReference({
  audioFile, admission_token: admission.admission_token,
  idempotency_key: cloneKey, name: 'My Voice', language_code: 'en',
});
// If processing/registration_uncertain/cleanup_pending, read recovery with:
const status = await client.voice.registrationStatus(cloneKey);
if (status.state === 'completed' && status.voice_id !== null) {
  const capability = await client.voice.capabilities(status.voice_id, 'tts');
  if (capability.readiness.state === 'ready') {
    await client.voice.speak({ text: 'Now in my own voice.', voiceId: status.voice_id });
  }
}
```

Admission and registration receive the same original file; the receipt fixes the
crop. For replacement, pass `replace_voice_id` and the current numeric
`reference_revision` to admission. A stale revision requires a fresh review;
failed replacement preserves the previous reference. Recover an uncertain create
with `registrationStatus` and the retained UUID, without submitting a new clone.

For a named speaker, set `recipient_email` when creating the receipt. Manually
share its invitation token and the recording; the named signed-in recipient uses
`previewConsentInvitation` then explicitly `acceptConsentInvitation`. No email is
sent. API keys can consume a prior accepted owner grant but cannot grant consent.
Transcription checks correspondence, not identity or liveness.

New clones are private. Self/account consent may optionally include an explicit
`allow_public_sharing: true`; later owner `updateMetadata(id, { is_public: true })`
is a separate action. Named, project and source grants remain private. Metadata
also supports name, description, gender, age_group and use_case.

A dubbing source clone requires `project_kind: 'dubbing'`, the exact `project_id`
and `source_id`, and a live confirmed workflow hold before registration. It uses
that hold; the SDK adds no component charge. Retrieve these voices through
`dubbing.projectVoices(projectId)`. They cannot enter general TTS or other projects.
Check operation capabilities before using new strict clones in older consumers;
audiobook, conversion and direct streaming currently reject unsupported strict
references before billing.

Voice conversion (voice-to-voice) is available via the REST API — see
[Voice Changer](https://docs.audiopod.ai/api-reference/voice-changer).


## Reviewed dubbing and private reuse

These methods require a backend version with the dubbing and strict-consent
routes. Upload admission uses the original source bytes and server measurement;
no SDK duration estimate determines price. Presigned uploads are one PUT using
only the returned storage headers. They do not send API credentials or follow
redirects. There is no separate completion or multipart-resume endpoint.

```typescript
import { stat } from 'node:fs/promises';
const file = './original.wav';
await client.uploads.limits('dubbing');
const upload = await client.uploads.presign({
  service: 'dubbing', filename: 'original.wav', content_type: 'audio/wav',
  size_bytes: (await stat(file)).size,
});
await client.uploads.put(upload, file);
const source = await client.dubbing.adoptSource(upload.upload_id);
// If preparing, poll getSource(source.id) before creating a project.
if (source.status !== 'ready') throw new Error('Source admission is not ready');
const project = await client.dubbing.createProject({
  source_id: source.id, title: 'Hindi edition', source_language: 'en',
});
const edition = await client.dubbing.createEdition(project.id, {
  target_language: 'hi', settings: { catalog_voice_id: 368 },
  required_outputs: ['audio', 'srt'],
});
const quote = await client.dubbing.quote(edition.id);
// Display required_credits/additional_credits from this account-credit quote.
// Only after explicit confirmation, retain this UUID and the exact quote:
const key = randomUUID();
const accepted = await client.dubbing.analyze(project.id, {
  confirm: true, confirmations: [{ edition_id: edition.id,
    expected_revision: quote.revision, quote_identity: quote.quote_identity,
    idempotency_key: key }],
});
const reviewed = await client.dubbing.waitForJob(accepted.items[0].id);
// review_required: inspect/edit/save the edition before a new decision.
// After review, obtain a fresh quote and explicitly confirm generation:
const generation = await client.dubbing.quote(edition.id);
const job = await client.dubbing.generate(reviewed.id, {
  expected_revision: generation.revision, quote_identity: generation.quote_identity,
  confirm: true,
});
const result = await client.dubbing.waitForJob(job.id);
// export_partial requires an explicit retryExports/cancel decision.
// completed + captured artifacts may be fetched with artifact(job.id, 'audio').
```

`waitForJob` returns at `review_required`, `export_partial` and `completed`; it
never generates, retranslates or retries exports for you. Failed/cancelled/expired
jobs raise `APIError` with the job and error code retained in `detail`.

| Area | Methods |
| --- | --- |
| Source/library | `adoptSource`, `getSource`, `sourceMedia`, `createProject`, `listProjects`, `getProject`, `deleteProject`, `projectVoices` |
| Revision/work | `createEdition`, `getEdition`, `saveEdition`, `quote`, `analyze`, `getJob`, `generate`, `retranslate`, `cancel`, `retryExports`, `events`, `artifact`, `reviewComplete` |
| Private organization | `listFolders`, `createFolder`, `renameFolder`, `deleteFolder`, `moveProject` |
| Translation policy | `getGlossary`, `setGlossary`, `resetGlossary` with language/project scope and observed version |
| Reusable settings | `listTemplates`, `saveTemplate`, `fromTemplate` with a new explicit source/voice selection |
| Named review | `inviteReviewer`, `listReviewGrants`, `revokeReviewGrant`, `getReview`, `addComment`, `approveReview`, `listReviewComments`, `reviewMedia` |

Typed requests/responses are exported from `audiopod`. `listProjects` accepts
folder_id/unfiled/review/completion filters. Templates copy safe settings, not
voice consent or paid authorization. Review invitation links are shared manually;
use an explicit `accessToken` client for named signed-in grants and reviews.
API keys do not become recipient identities. Media stays authenticated.

For translation-only reruns, call `quote(editionId, true)`. A held review uses
explicit `retranslate(jobId, { expected_revision, quote_identity, confirm: true })`
on the same hold/deadline. A completed edition uses a newly confirmed `analyze`
item with `retranslate: true` and a new UUID. The backend reuses ASR and quotes the
union of saved original intervals; the SDK never computes or substitutes a price.

HTTP errors retain `statusCode`, `code`, `action`, `detail` and `retryAfter`.
A stale quote/revision/consent calls for a fresh review; neither transport nor wait
helpers replace confirmations. Persist accepted job IDs, exact request bodies and
idempotency UUIDs before sending a charged request.

## CLI workflow actions

Both SDK CLIs use the same action names. Set `AUDIOPOD_API_KEY` for API work or
`AUDIOPOD_ACCESS_TOKEN` for signed-in consent/review; they are separate identities.
`--body FILE` supplies the exact JSON request. Paid/consent/approval actions require
`--confirm`; it does not fetch a replacement quote or choose a price.

```sh
audiopod dubbing capabilities --json
audiopod uploads presign --body upload.json --json
audiopod uploads put original.wav --body presigned.json --json
audiopod dubbing adopt-source UPLOAD_UUID --json
audiopod dubbing create-project --body project.json --json
audiopod dubbing create-edition PROJECT_UUID --body edition.json --json
audiopod dubbing quote EDITION_UUID --json
audiopod dubbing analyze PROJECT_UUID --body confirmed-batch.json --confirm --json
audiopod dubbing wait JOB_UUID --json
audiopod dubbing generate JOB_UUID --body confirmed-generation.json --confirm --json
audiopod dubbing artifact JOB_UUID audio --out localized.wav
audiopod dubbing quote EDITION_UUID --retranslate --json
audiopod dubbing retranslate JOB_UUID --body confirmed-generation.json --confirm --json
audiopod voice diagnostics original.wav --crop-start 0 --crop-end 10 --json
audiopod voice consent-create --body consent.json --confirm --json
audiopod voice admit original.wav --body admission.json --confirm --json
audiopod clone original.wav --name Narrator --admission-token TOKEN --idempotency-key UUID
audiopod voice clone-status UUID --json
```

`confirmed-batch.json` contains `confirmations` items with edition_id,
expected_revision, quote_identity and caller-generated UUID idempotency_key;
`confirmed-generation.json` contains expected_revision and quote_identity.
Retain the same UUID/body after transport uncertainty. A fresh intentional job
uses a new UUID. `--json` errors go to stderr with status/code/action/detail.

Dubbing actions also cover projects/project/project-voices/delete-project,
source/source-media, edition/save-edition, job/cancel/retry-exports/events,
review-complete, folders/create-folder/rename-folder/delete-folder/move-project,
glossary/set-glossary/reset-glossary, templates/save-template/from-template,
invite-reviewer/review-grants/revoke-review-grant/review/add-comment/approve-review/
review-comments/review-media. Binary media actions require `--out`.

Voice actions cover capabilities, diagnostics, consent/consent-preview/
consent-accept/consent-revoke, admit/clone-status/metadata, pronunciation/
pronunciation-save/pronunciation-reset/pronunciation-resolve, audition-quote/
audition-accept. Policy saves use `{"scope": {...}, "policy": {...}}`; policy resets
use `{"scope": {...}, "expected_version": N}`. Glossary scope uses language and
optional project_id; pronunciation scope also uses project_kind. Read/resolve
commands do not accept paid quotes automatically.

## Music Generation

```typescript
// Duration is not tier-capped (10s–10min; -1 = model-decided)
const job = await client.music.generate({
  prompt: "upbeat synthwave, 120 BPM, driving bassline",
  duration: 60,
});
const song = await client.music.waitForCompletion(job.id);
```

## Stem Separation

Extract individual audio components from a mixed recording.

### Available Modes

| Mode        | Stems | Output                                                          |
| ----------- | ----- | --------------------------------------------------------------- |
| `single`    | 1     | Specified stem only (vocals, drums, bass, guitar, piano, other) |
| `two`       | 2     | Vocals + Instrumental                                           |
| `four`      | 4     | Vocals, Drums, Bass, Other                                      |
| `six`       | 6     | Vocals, Drums, Bass, Guitar, Piano, Other                       |
| `producer`  | 8     | + Kick, Snare, Hihat                                            |
| `studio`    | 12    | Full production toolkit                                         |
| `mastering` | 16    | Maximum detail                                                  |

```typescript
// From a local file (or pass { url: "https://.../song.mp3" })
const result = await client.stems.separate({ file: "./song.mp3", mode: "six" });
for (const [stem, url] of Object.entries(result.download_urls)) {
  console.log(`${stem}: ${url}`);
}

// Isolate just the vocals
const vocals = await client.stems.separate({ file: "./song.mp3", mode: "single", stem: "vocals" });
```

## Audio to MIDI

Convert a mix — or stems you already separated — into MIDI (bass, vocals,
piano by default; guitar is opt-in/experimental). It's a starting-point
transcription: tidy timing/lengths in your DAW, drums aren't transcribed
yet, and dynamics are approximate.

```typescript
// Standalone: split + transcribe in one call (default stems: bass, vocals, piano)
const result = await client.midi.transcribe({ file: "./song.mp3" });
console.log(result.merged_midi_url);

// Add-on: transcribe stems you already separated (bills the add-on rate only)
const stemJob = await client.stems.separate({ file: "./song.mp3", mode: "six" });
const midiJob = await client.midi.convertFromStemJob(stemJob.id);
for (const [stem, url] of Object.entries(midiJob.midi_urls ?? {})) {
  console.log(`${stem}: ${url}`);
}
```

## Transcription

```typescript
// Speaker labels + word timestamps
const job = await client.transcription.create({
  url: "https://example.com/meeting.mp3",
  speakerDiarization: true,
  wordTimestamps: true,
});
const result = await client.transcription.waitForCompletion(job.id);
```

Premium-accuracy transcription and real-time WebSocket streaming
(`client.transcription.stream(...)`) are also supported — see
[Speech-to-Text](https://docs.audiopod.ai/api-reference/speech-to-text).

## Other Audio Services

```typescript
// Speaker separation / diarization
const speakers = await client.speaker.diarize({ url: "https://example.com/interview.wav" });

// Noise reduction
const clean = await client.denoiser.denoise({ file: "./noisy.wav" });

// Audiobook production (manuscript → ACX-ready export)
const project = await client.audiobook.createProject({ title: "My Book", language: "en" });
```

## Audiobooks: paragraph-level control

Narration works at paragraph granularity — project → chapter → paragraph.

```typescript
// Manuscript parsing is async. waitForParse polls the project and throws
// immediately if the parse failed (instead of hanging forever).
await client.audiobook.waitForParse(projectId);

// One round-trip for the project plus its chapters.
const project = await client.audiobook.getProject(projectId, { includeChapters: true });
const chapterId = project.chapters![0].id;

// Omit page/perPage to get every paragraph in the chapter.
const { paragraphs, total } = await client.audiobook.listParagraphs(projectId, chapterId);

// Narrate a single paragraph (first take billed, first regeneration free).
const take = await client.audiobook.narrateParagraph(projectId, paragraphs[0].id, {
  voiceId: 42,
  direction: "warm, unhurried",
});
const status = await client.audiobook.getParagraph(projectId, paragraphs[0].id);

// Or queue one job for many paragraphs — omit both id lists for the whole project.
const batch = await client.audiobook.batchNarrate(projectId, { voiceId: 42, chapterIds: [chapterId] });
```

## OpenAI-Compatible Endpoints

Already have OpenAI-shaped audio code? Point it at AudioPod — set the client
base URL to `https://api.audiopod.ai/api/v1` and `Authorization: Bearer ap_...`.
The `/audio/speech`, `/audio/transcriptions`, and `/audio/translations`
endpoints behave like their OpenAI counterparts. See
[OpenAI compatibility](https://docs.audiopod.ai/api-reference/openai-compatibility).

## API Wallet

```typescript
const balance = await client.wallet.getBalance();
console.log(`Balance: ${balance.balance_usd}`);

const estimate = await client.wallet.estimateCost({ serviceType: "text_to_speech", durationSeconds: 180 });
console.log(`Estimated cost: ${estimate.cost_usd}`);
```

## Error Handling

```typescript
import AudioPod, {
  InsufficientBalanceError,
  AuthenticationError,
} from "audiopod";

try {
  const client = new AudioPod({ apiKey: "ap_..." });
  const job = await client.voice.speak({ text: "Hello", voiceId: 368 });
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.log("Invalid API key");
  } else if (error instanceof InsufficientBalanceError) {
    console.log(`Need more credits. Required: ${error.requiredCents} cents`);
  }
}
```

## Environment Variables

```bash
export AUDIOPOD_API_KEY="ap_your_api_key"
```

```typescript
// Client reads from env automatically
const client = new AudioPod();
```

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import AudioPod, { StemExtractionJob, StemMode, WalletBalance } from "audiopod";
```

## Documentation

- [API Documentation](https://docs.audiopod.ai)
- [Text-to-Speech](https://docs.audiopod.ai/api-reference/text-to-speech)
- [Get API Key](https://www.audiopod.ai/dashboard/account/api-keys)

## License

MIT License - see [LICENSE](LICENSE) for details.
