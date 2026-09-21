import { useEffect, useRef, useState } from "react";
import { apiUrl } from "../../config";
import { upload } from "../api";

type VoiceDraft = {
  blob: Blob;
  url: string;
  durationMs: number;
  requestId: string;
};

const voiceDrafts = new Map<number, VoiceDraft>();

function clock(milliseconds: number) {
  const seconds = Math.max(0, Math.round(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function AudioBubble({
  url,
  durationMs,
}: {
  url: string;
  durationMs?: number;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState((durationMs || 0) / 1000);
  const source = url.startsWith("/") ? apiUrl(url) : url;
  return (
    <div className="crm-audio-player">
      <audio
        ref={audio}
        src={source}
        preload="metadata"
        onLoadedMetadata={(event) =>
          setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : duration)
        }
        onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
        onEnded={() => setPlaying(false)}
      />
      <button
        type="button"
        aria-label={playing ? "Pause voice message" : "Play voice message"}
        onClick={() => {
          if (!audio.current) return;
          if (playing) audio.current.pause();
          else void audio.current.play();
          setPlaying(!playing);
        }}
      >
        {playing ? "Ⅱ" : "▶"}
      </button>
      <input
        aria-label="Voice message progress"
        type="range"
        min="0"
        max={Math.max(duration, 0.1)}
        step="0.1"
        value={Math.min(current, duration || 0)}
        onChange={(event) => {
          const value = Number(event.target.value);
          if (audio.current) audio.current.currentTime = value;
          setCurrent(value);
        }}
      />
      <time>{clock((duration || current) * 1000)}</time>
    </div>
  );
}

export default function VoiceRecorder({
  conversationId,
  blockedReason,
  deliverySupported,
  onSent,
}: {
  conversationId: number;
  blockedReason?: string | null;
  deliverySupported: boolean;
  onSent: () => void;
}) {
  const saved = voiceDrafts.get(conversationId);
  const [mode, setMode] = useState<"idle" | "recording" | "preview" | "sending">(
    saved ? "preview" : "idle",
  );
  const [draft, setDraft] = useState<VoiceDraft | null>(saved || null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const started = useRef(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const animation = useRef<number | null>(null);
  const mounted = useRef(true);
  const supported =
    typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

  function stopCapture() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    if (animation.current) cancelAnimationFrame(animation.current);
    animation.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    void audioContext.current?.close();
    audioContext.current = null;
  }

  useEffect(
    () => () => {
      mounted.current = false;
      if (recorder.current?.state === "recording") {
        recorder.current.onstop = null;
        recorder.current.stop();
      }
      stopCapture();
    },
    [],
  );

  function drawActivity(input: MediaStream) {
    try {
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 64;
      context.createMediaStreamSource(input).connect(analyser);
      audioContext.current = context;
      const values = new Uint8Array(analyser.frequencyBinCount);
      const draw = () => {
        const target = canvas.current;
        if (!target) return;
        analyser.getByteFrequencyData(values);
        const paint = target.getContext("2d");
        if (!paint) return;
        paint.clearRect(0, 0, target.width, target.height);
        paint.fillStyle = "#4f6bff";
        values.slice(0, 18).forEach((value, index) => {
          const height = Math.max(3, (value / 255) * target.height);
          paint.fillRect(index * 7, (target.height - height) / 2, 3, height);
        });
        animation.current = requestAnimationFrame(draw);
      };
      draw();
    } catch {
      // Recording remains usable when the visualization API is unavailable.
    }
  }

  async function start() {
    setError("");
    if (!supported) {
      setError("Voice recording is not supported in this browser.");
      return;
    }
    try {
      const input = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) {
        input.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = input;
      const mimeType = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"]
        .find((value) => MediaRecorder.isTypeSupported(value));
      const next = new MediaRecorder(input, mimeType ? { mimeType } : undefined);
      const chunks: BlobPart[] = [];
      recorder.current = next;
      next.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      next.onerror = () => {
        setError("Recording failed. Check the microphone and try again.");
        setMode("idle");
        stopCapture();
      };
      next.onstop = () => {
        const durationMs = Date.now() - started.current;
        stopCapture();
        const blob = new Blob(chunks, { type: next.mimeType || "audio/webm" });
        if (!blob.size) {
          setError("The recording was empty. Please record again.");
          setMode("idle");
          return;
        }
        const nextDraft = {
          blob,
          url: URL.createObjectURL(blob),
          durationMs,
          requestId: crypto.randomUUID(),
        };
        voiceDrafts.set(conversationId, nextDraft);
        setDraft(nextDraft);
        setElapsed(durationMs);
        setMode("preview");
      };
      started.current = Date.now();
      setElapsed(0);
      setMode("recording");
      next.start(250);
      timer.current = setInterval(() => setElapsed(Date.now() - started.current), 250);
      drawActivity(input);
    } catch (reason) {
      stopCapture();
      const name = reason instanceof DOMException ? reason.name : "";
      setError(
        name === "NotAllowedError"
          ? "Microphone permission was denied. Allow access in your browser settings and try again."
          : name === "NotFoundError"
            ? "No microphone was found on this device."
            : "The microphone could not start. Please try again.",
      );
    }
  }

  function cancel() {
    if (recorder.current?.state === "recording") {
      recorder.current.onstop = null;
      recorder.current.stop();
    }
    stopCapture();
    setElapsed(0);
    setMode("idle");
  }

  function removeDraft() {
    if (draft) URL.revokeObjectURL(draft.url);
    voiceDrafts.delete(conversationId);
    setDraft(null);
    setElapsed(0);
    setError("");
    setMode("idle");
  }

  async function send(closeAfterSend: boolean) {
    if (!draft || mode === "sending") return;
    if (!deliverySupported) {
      setError("Recorded voice delivery is not enabled for this Instagram connection.");
      return;
    }
    if (blockedReason) {
      setError(blockedReason);
      return;
    }
    setMode("sending");
    setError("");
    const form = new FormData();
    form.append("audio", draft.blob, `voice-${draft.requestId}`);
    form.append("duration_ms", String(draft.durationMs));
    form.append("request_id", draft.requestId);
    form.append("close_after_send", String(closeAfterSend));
    try {
      await upload(`/conversations/${conversationId}/audio`, form);
      removeDraft();
      onSent();
    } catch (reason) {
      setError((reason as Error).message);
      setMode("preview");
    }
  }

  if (mode === "idle")
    return (
      <div className="crm-voice-idle">
        <button
          type="button"
          className="crm-tool-button"
          title={supported ? "Record a voice message" : "Voice recording is unavailable"}
          aria-label="Record voice message"
          onClick={start}
        >
          🎙
        </button>
        {error && <span role="alert" className="crm-voice-error">{error}</span>}
      </div>
    );

  return (
    <div className="crm-voice-panel" aria-live="polite">
      {mode === "recording" ? (
        <>
          <span className="crm-recording-dot" />
          <strong>Recording {clock(elapsed)}</strong>
          <canvas ref={canvas} width="128" height="28" aria-label="Audio activity" />
          <button type="button" onClick={cancel}>Cancel</button>
          <button
            type="button"
            className="crm-primary"
            onClick={() => recorder.current?.stop()}
          >
            Stop
          </button>
        </>
      ) : draft ? (
        <>
          <AudioBubble url={draft.url} durationMs={draft.durationMs} />
          <button type="button" onClick={removeDraft}>Delete</button>
          <button type="button" onClick={() => { removeDraft(); void start(); }}>Record again</button>
          <button
            type="button"
            className="crm-primary"
            disabled={mode === "sending" || !!blockedReason}
            onClick={() => void send(false)}
          >
            {mode === "sending" ? "Sending…" : "Send voice"}
          </button>
          <button
            type="button"
            disabled={mode === "sending" || !!blockedReason}
            onClick={() => void send(true)}
          >
            Send & Close
          </button>
        </>
      ) : null}
      {!deliverySupported && (
        <p className="crm-voice-provider-note">
          Preview is available. Delivery is disabled for this Instagram provider.
        </p>
      )}
      {error && <p role="alert" className="crm-voice-error">{error}</p>}
    </div>
  );
}
