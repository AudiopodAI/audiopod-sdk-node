# AudioPod Node.js SDK examples

Small, runnable programs that each end with a real AudioPod call. Every one
reads your key from `AUDIOPOD_API_KEY`
([get a key](https://www.audiopod.ai/dashboard/account/api-keys); new accounts
start with free credits). They need Node 18+ for the built-in `fetch`.

| Example | What it does |
|---|---|
| [`node-tts/tts.mjs`](node-tts/tts.mjs) | `node tts.mjs "Hello there"` turns text into speech and saves `speech.mp3`. |
| [`next-tts/app/api/tts/route.ts`](next-tts/app/api/tts/route.ts) | A Next.js route that returns a speech URL for a "listen to this" button, with the key kept server-side. |
| [`stems-cli/stems.mjs`](stems-cli/stems.mjs) | `node stems.mjs song.mp3 four` splits a song and saves each stem to a folder. |

Guides for every task: [docs.audiopod.ai/quickstarts](https://docs.audiopod.ai/quickstarts/transcription).
Using an AI coding agent? See [AudioPod for AI agents](https://docs.audiopod.ai/agents).
