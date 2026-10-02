import type { PodcastDialogue, PodcastProject, PodcastTakeTiming } from '../src/index';

const legacyDialogue: PodcastDialogue = { speaker: 'Host', text: 'Hello' };
const legacyProject: PodcastProject = { id: 'project' };
const nullableDialogue: PodcastDialogue = { ...legacyDialogue, take_identity: null };
const nullableProject: PodcastProject = { ...legacyProject, combined_timing: null };
const timing: PodcastTakeTiming = {
  dialogue_id: 'line', take_identity: null, audio_sha256: 'a'.repeat(64),
  format: 'wav', start_frame: 11025, end_frame: 22050, sample_rate: 44100,
};
const measuredProject: PodcastProject = {
  id: 'project', dialogues: [{ id: 'line', ...legacyDialogue, take_identity: 'b'.repeat(64) }],
  combined_timing: [timing], future_response_field: 'preserved',
};

// @ts-expect-error accepted take identity is a nullable string
const badDialogue: PodcastDialogue = { ...legacyDialogue, take_identity: 1 };
// @ts-expect-error frame positions are numbers
const badTiming: PodcastTakeTiming = { ...timing, start_frame: '0.25' };
// @ts-expect-error provenance describes the required WAV
const badFormat: PodcastTakeTiming = { ...timing, format: 'mp3' };
// @ts-expect-error combined timing is a nullable list of measured entries
const badProject: PodcastProject = { ...legacyProject, combined_timing: ['line'] };

void [nullableDialogue, nullableProject, measuredProject, badDialogue, badTiming, badFormat, badProject];
