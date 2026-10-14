/**
 * AudioPod CLI — generate music, voiceover, transcribe, separate stems,
 * and clone voices from the terminal.
 *
 * Auth: `audiopod login` stores your API key at ~/.audiopod/config.json,
 * or set AUDIOPOD_API_KEY in the environment.
 *
 * Examples:
 *   audiopod music "lo-fi rainy 90 BPM" --duration 60 --out song.wav
 *   audiopod tts "Welcome to AudioPod." --voice 368 --out hello.wav
 *   audiopod transcribe meeting.mp3 --diarize --format srt
 *   audiopod stems track.wav --mode six
 *   audiopod clone reference.wav --name Narrator
 *   audiopod jobs job_abc123
 */

import { promises as fs } from "node:fs";
import { createWriteStream } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import AudioPod from "./client";
import type { StemMode } from "./types";

const CONFIG_DIR = join(homedir(), ".audiopod");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

// ---- Config ----

async function loadApiKey(): Promise<string | null> {
  if (process.env.AUDIOPOD_API_KEY) return process.env.AUDIOPOD_API_KEY;
  try {
    const raw = await fs.readFile(CONFIG_FILE, "utf8");
    const data = JSON.parse(raw);
    return typeof data.api_key === "string" && data.api_key.startsWith("ap_")
      ? data.api_key
      : null;
  } catch {
    return null;
  }
}

async function saveApiKey(apiKey: string): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
  await fs.writeFile(CONFIG_FILE, JSON.stringify({ api_key: apiKey }, null, 2), {
    mode: 0o600,
  });
}

// ---- Argv parsing (zero-dep) ----

interface Args {
  command: string;
  positional: string[];
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): Args {
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];
  let command = "";

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!command && !arg.startsWith("-")) {
      command = arg;
      continue;
    }
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("-")) {
        flags[key] = true;
      } else {
        flags[key] = next;
        i++;
      }
    } else {
      positional.push(arg);
    }
  }

  return { command, positional, flags };
}

function flagBool(args: Args, key: string): boolean {
  return args.flags[key] === true || args.flags[key] === "true";
}
function flagStr(args: Args, key: string, fallback?: string): string | undefined {
  const v = args.flags[key];
  if (typeof v === "string") return v;
  return fallback;
}
function flagNum(args: Args, key: string, fallback: number): number {
  const v = args.flags[key];
  if (typeof v === "string") {
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return fallback;
}

// ---- Output helpers ----

function emit(args: Args, payload: unknown): void {
  if (flagBool(args, "json")) {
    console.log(JSON.stringify(payload, null, 2));
  } else if (payload && typeof payload === "object") {
    for (const [k, v] of Object.entries(payload as Record<string, unknown>)) {
      console.log(`${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`);
    }
  } else {
    console.log(payload);
  }
}

async function downloadTo(url: string, dest: string): Promise<void> {
  await fs.mkdir(dirname(dest), { recursive: true });
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`download failed: ${res.status} ${res.statusText}`);
  }
  await pipeline(Readable.fromWeb(res.body as never), createWriteStream(dest));
}

async function makeClient(args: Args): Promise<AudioPod> {
  const apiKey = flagStr(args, "api-key") ?? (await loadApiKey());
  if (!apiKey) {
    process.stderr.write(
      "No API key found. Run `audiopod login` or set AUDIOPOD_API_KEY.\n",
    );
    process.exit(2);
  }
  const baseURL = flagStr(args, "base-url") ?? process.env.AUDIOPOD_BASE_URL;
  return new AudioPod({ apiKey, baseUrl: baseURL });
}

// ---- Commands ----

async function cmdLogin(args: Args): Promise<void> {
  let apiKey = flagStr(args, "api-key") ?? args.positional[0];
  if (!apiKey) {
    const rl = createInterface({ input, output });
    apiKey = (
      await rl.question(
        "Paste your AudioPod API key (https://audiopod.ai/dashboard/api-keys): ",
      )
    ).trim();
    rl.close();
  }
  if (!apiKey.startsWith("ap_")) {
    process.stderr.write("API keys start with 'ap_'.\n");
    process.exit(2);
  }
  await saveApiKey(apiKey);
  console.log(`Saved to ${CONFIG_FILE}`);
}

async function cmdMusic(args: Args): Promise<void> {
  const prompt = args.positional[0];
  if (!prompt) {
    process.stderr.write("usage: audiopod music <prompt> [--duration N] [--out FILE]\n");
    process.exit(2);
  }
  const client = await makeClient(args);
  const kindMap: Record<string, "text2music" | "prompt2instrumental" | "text2rap" | "lyric2vocals"> = {
    song: "text2music",
    instrumental: "prompt2instrumental",
    rap: "text2rap",
    vocals: "lyric2vocals",
  };
  const task = kindMap[flagStr(args, "kind", "song") as string] ?? "text2music";
  const job = await client.music.create({
    prompt,
    task,
    duration: flagNum(args, "duration", 60),
    lyrics: flagStr(args, "lyrics"),
  });

  const out = flagStr(args, "out");
  if (out) {
    const completed = await client.music.waitForCompletion(
      typeof job.id === "string" ? Number(job.id) : (job.id as number),
      flagNum(args, "timeout", 600) * 1000,
    );
    const url = (completed as { output_url?: string }).output_url;
    if (!url) throw new Error("Job completed without an output URL");
    await downloadTo(url, out);
    console.log(`Saved ${out}`);
  } else {
    emit(args, job);
  }
}

async function cmdTts(args: Args): Promise<void> {
  const text = args.positional[0];
  if (!text) {
    process.stderr.write("usage: audiopod tts <text> [--voice ID] [--out FILE]\n");
    process.exit(2);
  }
  const client = await makeClient(args);
  const voice = flagStr(args, "voice", "368")!;
  const job = await client.voice.speak({
    text,
    voiceId: /^\d+$/.test(voice) ? Number(voice) : voice,
    language: flagStr(args, "lang", "en")!,
    speed: flagNum(args, "speed", 1.0),
    audioFormat: (flagStr(args, "format", "mp3") as "mp3" | "wav" | "ogg") ?? "mp3",
  });

  const out = flagStr(args, "out");
  if (out) {
    const completed = await client.voice.waitForCompletion(
      job.id as number,
      flagNum(args, "timeout", 300) * 1000,
    );
    const url = (completed as { output_url?: string }).output_url;
    if (!url) throw new Error("Job completed without an output URL");
    await downloadTo(url, out);
    console.log(`Saved ${out}`);
  } else {
    emit(args, job);
  }
}

async function cmdTranscribe(args: Args): Promise<void> {
  const source = args.positional[0];
  if (!source) {
    process.stderr.write("usage: audiopod transcribe <file_or_url>\n");
    process.exit(2);
  }
  const client = await makeClient(args);
  const job = await client.transcription.create({
    url: source,
    language: flagStr(args, "lang"),
    speakerDiarization: flagBool(args, "diarize"),
  });
  emit(args, job);
}

async function cmdStems(args: Args): Promise<void> {
  const source = args.positional[0];
  if (!source) {
    process.stderr.write("usage: audiopod stems <file_or_url> [--mode two|four|six|sixteen]\n");
    process.exit(2);
  }
  const client = await makeClient(args);
  const modeMap: Record<string, StemMode> = {
    two: "two",
    four: "four",
    six: "six",
    producer: "producer",
    studio: "studio",
    mastering: "mastering",
  };
  const mode = modeMap[flagStr(args, "mode", "four") as string] ?? "four";
  const job = await client.stems.extract({ url: source, mode });
  emit(args, job);
}

async function cmdClone(args: Args): Promise<void> {
  const reference = args.positional[0];
  const name = flagStr(args, "name");
  if (!reference || !name) {
    process.stderr.write("usage: audiopod clone <reference.wav> --name <voice_name>\n");
    process.exit(2);
  }
  const client = await makeClient(args);
  const voice = await client.voice.create({
    name,
    description: flagStr(args, "description") ?? "",
    audioFile: reference,
    // Speech with a PENDING clone fails; return once it is usable.
    waitForReady: true,
  });
  emit(args, voice);
}

async function cmdJobs(args: Args): Promise<void> {
  const id = args.positional[0];
  if (!id) {
    process.stderr.write("usage: audiopod jobs <job_id>\n");
    process.exit(2);
  }
  const client = await makeClient(args);
  // The base client exposes a generic GET — fall back to it for any job type.
  type AnyClient = AudioPod & { get: <T>(path: string) => Promise<T> };
  const result = await (client as AnyClient).get(`/api/v1/jobs/${id}`);
  emit(args, result);
}

async function cmdAudiobook(args: Args): Promise<void> {
  const file = args.positional[0];
  const text = flagStr(args, "text");
  const title = flagStr(args, "title");
  if (!title || (!file && !text)) {
    process.stderr.write(
      "usage: audiopod audiobook <file> --title TITLE [--author A] [--voice ID] [--out package.zip]\n" +
      "       (omit <file> and pass --text to narrate raw text)\n",
    );
    process.exit(2);
  }
  const client = await makeClient(args);
  const result = await client.audiobook.produce({
    title,
    author: flagStr(args, "author"),
    file: file || undefined,
    text: text || undefined,
    voiceId: flagNum(args, "voice", 387),
    timeoutMs: flagNum(args, "timeout", 1800) * 1000,
  });
  const out = flagStr(args, "out");
  if (out && result.download_url) {
    await downloadTo(result.download_url, out);
    console.log(`Saved ${out}`);
  } else {
    emit(args, result);
  }
}

// ---- Entry point ----

const HELP = `audiopod — AudioPod CLI

Commands:
  audiopod login                     Save your API key.
  audiopod music <prompt>            Generate music.
  audiopod tts <text>                Synthesize speech.
  audiopod transcribe <file_or_url>  Transcribe audio.
  audiopod stems <file_or_url>       Separate stems.
  audiopod clone <ref.wav> --name N  Clone a voice.
  audiopod audiobook <file> --title  Produce an ACX audiobook.
  audiopod jobs <job_id>             Look up a job.

Global flags:
  --api-key KEY    Override the saved API key.
  --base-url URL   Override the API base URL.
  --json           Emit machine-readable JSON.
`;

const COMMANDS: Record<string, (a: Args) => Promise<void>> = {
  login: cmdLogin,
  music: cmdMusic,
  tts: cmdTts,
  transcribe: cmdTranscribe,
  stems: cmdStems,
  clone: cmdClone,
  audiobook: cmdAudiobook,
  jobs: cmdJobs,
};

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  if (argv.length === 0 || argv[0] === "-h" || argv[0] === "--help" || argv[0] === "help") {
    process.stdout.write(HELP);
    return;
  }
  if (argv[0] === "--version" || argv[0] === "-v") {
    // Version is injected by tsup at build time via the package.json bundle.
    // For now read the running binary's process.env or fall back gracefully.
    console.log(`audiopod ${process.env.AUDIOPOD_CLI_VERSION ?? "2.5.0"}`);
    return;
  }

  const args = parseArgs(argv);
  const handler = COMMANDS[args.command];
  if (!handler) {
    process.stderr.write(`Unknown command: ${args.command}\n${HELP}`);
    process.exit(2);
  }
  try {
    await handler(args);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`audiopod: ${msg}\n`);
    process.exit(1);
  }
}

// CJS bundle entry detection — tsup CJS output sets require.main === module.
declare const require: { main?: NodeJS.Module } | undefined;
declare const module: NodeJS.Module;
if (typeof require !== "undefined" && require.main === module) {
  void main();
}
