// Split a song into stems and save each one to a folder.
//
//   npm install audiopod
//   export AUDIOPOD_API_KEY=ap_...
//   node stems.mjs song.mp3            # vocals, drums, bass, other
//   node stems.mjs song.mp3 two        # vocals + instrumental (karaoke)
//   node stems.mjs song.mp3 six        # adds guitar and piano

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import AudioPod from "audiopod";

const MODES = ["two", "four", "six", "producer", "studio", "mastering"];
const [file, mode = "four"] = process.argv.slice(2);
if (!file || !MODES.includes(mode)) {
  console.error(`usage: node stems.mjs <file> [${MODES.join("|")}]`);
  process.exit(1);
}

const outDir = path.join(path.dirname(file), `${path.parse(file).name}_stems`);
await mkdir(outDir, { recursive: true });

const client = new AudioPod(); // reads AUDIOPOD_API_KEY
console.log(`Separating ${path.basename(file)} (${mode})...`);

// separate() uploads the file, starts the job and waits for it
const job = await client.stems.separate({ file, mode });

for (const [stem, link] of Object.entries(job.download_urls ?? {})) {
  const ext = path.extname(new URL(link).pathname) || ".wav";
  const target = path.join(outDir, `${stem}${ext}`);
  const res = await fetch(link);
  if (!res.ok) throw new Error(`download of ${stem} failed: ${res.status}`);
  await writeFile(target, Buffer.from(await res.arrayBuffer()));
  console.log(`  ${stem.padEnd(12)} -> ${target}`);
}
