// Text to speech from the command line: writes speech.mp3 (or the file you name).
//
//   npm install audiopod
//   export AUDIOPOD_API_KEY=ap_...
//   node tts.mjs "Welcome back. Here is today's summary." [voiceId] [out.mp3]

import { writeFile } from "node:fs/promises";
import AudioPod from "audiopod";

const [text, voiceId = "368", out = "speech.mp3"] = process.argv.slice(2);
if (!text) {
  console.error('usage: node tts.mjs "text to speak" [voiceId] [out.mp3]');
  process.exit(1);
}

const client = new AudioPod(); // reads AUDIOPOD_API_KEY

// generate() starts the job and waits until the audio is ready
const job = await client.voice.generate({
  text,
  voiceId: /^\d+$/.test(voiceId) ? Number(voiceId) : voiceId,
});

const audio = await fetch(job.output_url);
if (!audio.ok) throw new Error(`download failed: ${audio.status}`);
await writeFile(out, Buffer.from(await audio.arrayBuffer()));
console.log(`saved ${out} (${job.output_url})`);
