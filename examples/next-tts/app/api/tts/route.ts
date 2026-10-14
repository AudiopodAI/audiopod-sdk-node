// Next.js App Router route: POST /api/tts { "text": "..." } -> { "url": "..." }
//
// Drop this file into a Next.js app, `npm install audiopod`, and set
// AUDIOPOD_API_KEY in .env.local. The key stays on the server; the browser only
// receives the audio URL, e.g.
//
//   const { url } = await (await fetch("/api/tts", { method: "POST", body: JSON.stringify({ text }) })).json();
//   new Audio(url).play();

import AudioPod from "audiopod";

export const runtime = "nodejs"; // the SDK uses Node APIs
export const maxDuration = 60; // seconds; TTS for a paragraph finishes well inside this

const client = new AudioPod(); // reads AUDIOPOD_API_KEY
const VOICE_ID = 368; // any id from client.voice.list()

export async function POST(request: Request) {
  const { text } = (await request.json().catch(() => ({}))) as { text?: string };
  if (!text || text.length > 20_000) {
    return Response.json({ error: "text is required (max 20,000 characters)" }, { status: 400 });
  }
  try {
    const job = await client.voice.generate({ text, voiceId: VOICE_ID });
    return Response.json({ url: job.output_url });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 502 });
  }
}
