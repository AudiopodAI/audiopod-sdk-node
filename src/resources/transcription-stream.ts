/**
 * Real-time streaming transcription over WebSocket.
 *
 * A `TranscriptionStream` is BOTH an EventEmitter and an AsyncIterable, so you
 * can consume events either way:
 *
 * ```typescript
 * const stream = client.transcription.stream({ language: 'en', diarize: true });
 *
 * // Event style
 * stream.on('partial', (e) => process.stdout.write('\r' + e.text));
 * stream.on('final', (e) => console.log('\n' + e.text));
 * stream.on('completed', (e) => console.log(`done — ${e.credits_used} credits`));
 *
 * // ...or async-iterator style
 * for await (const event of stream) {
 *   if (event.type === 'final') console.log(event.text);
 * }
 *
 * await stream.ready;          // resolves on the server `ready` frame
 * stream.sendAudio(pcm16le);   // 16-bit PCM, 16 kHz, mono
 * stream.end();                // flush + finalize
 * ```
 */

import { EventEmitter } from "events";
import WebSocket from "ws";
import type AudioPod from "../client";
import type {
  TranscriptionStreamConfig,
  TranscriptionStreamEvent,
} from "../types";

const STREAM_PATH = "/api/v1/transcription/stream";

export class TranscriptionStream extends EventEmitter {
  private _ws: WebSocket;
  private _buffer: TranscriptionStreamEvent[] = [];
  private _waiters: Array<(r: IteratorResult<TranscriptionStreamEvent>) => void> = [];
  private _ended = false;
  private _readyResolve!: () => void;
  private _readyReject!: (err: Error) => void;

  /** Resolves on the server `ready` frame; rejects if the session errors before it. */
  readonly ready: Promise<void>;

  constructor(client: AudioPod, config: TranscriptionStreamConfig = {}) {
    super();
    this.ready = new Promise<void>((resolve, reject) => {
      this._readyResolve = resolve;
      this._readyReject = reject;
    });
    // Swallow an unhandled `ready` rejection if no one awaits it (errors still
    // surface via the 'error' event + the async iterator).
    this.ready.catch(() => {});

    const ws = new WebSocket(client.streamUrl(STREAM_PATH));
    ws.binaryType = "nodebuffer";
    this._ws = ws;

    ws.on("open", () => {
      ws.send(
        JSON.stringify({
          type: "start",
          language: config.language ?? null,
          diarize: config.diarize ?? false,
          sample_rate: config.sampleRate ?? 16000,
          channels: config.channels ?? 1,
        }),
      );
      this.emit("open");
    });

    ws.on("message", (data: WebSocket.RawData, isBinary: boolean) => {
      if (isBinary) return;
      let event: TranscriptionStreamEvent;
      try {
        event = JSON.parse(data.toString());
      } catch {
        return;
      }
      if (event.type === "ready") this._readyResolve();
      this._dispatch(event);
      if (event.type === "completed") this._finish();
      if (event.type === "error") {
        this._readyReject(new Error(event.message || event.code || "stream error"));
        this._finish();
      }
    });

    ws.on("error", (err: Error) => {
      const event: TranscriptionStreamEvent = {
        type: "error",
        code: "CONNECTION",
        message: err.message,
      };
      this._dispatch(event);
      this._readyReject(err);
      this._finish();
    });

    ws.on("close", () => {
      this.emit("close");
      this._finish();
    });
  }

  /** Send a chunk of raw 16-bit little-endian PCM audio (16 kHz, mono). */
  sendAudio(chunk: Buffer | Uint8Array): void {
    if (this._ws.readyState === WebSocket.OPEN) this._ws.send(chunk);
  }

  /** Signal end-of-audio; the server flushes and emits `completed`. */
  end(): void {
    if (this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify({ type: "end" }));
    }
  }

  /** Tear down the socket immediately (no flush). */
  close(): void {
    try {
      this._ws.close();
    } catch {
      /* already closing */
    }
  }

  private _dispatch(event: TranscriptionStreamEvent): void {
    // EventEmitter throws on an 'error' event with no listener — guard it.
    if (event.type === "error") {
      if (this.listenerCount("error") > 0) this.emit("error", event);
    } else {
      this.emit(event.type, event);
    }
    const waiter = this._waiters.shift();
    if (waiter) waiter({ value: event, done: false });
    else this._buffer.push(event);
  }

  private _finish(): void {
    if (this._ended) return;
    this._ended = true;
    while (this._waiters.length) {
      this._waiters.shift()!({ value: undefined as never, done: true });
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<TranscriptionStreamEvent> {
    return {
      next: (): Promise<IteratorResult<TranscriptionStreamEvent>> => {
        if (this._buffer.length) {
          return Promise.resolve({ value: this._buffer.shift()!, done: false });
        }
        if (this._ended) {
          return Promise.resolve({ value: undefined as never, done: true });
        }
        return new Promise((resolve) => this._waiters.push(resolve));
      },
    };
  }
}
