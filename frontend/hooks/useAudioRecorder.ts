import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderError = "unsupported" | "denied" | "failed";

const WAV_SAMPLE_RATE = 16000;

/**
 * Re-encodes a browser recording (usually webm/opus) as 16 kHz mono 16-bit PCM WAV,
 * the format the pronunciation scorer accepts.
 */
async function toWav(recording: Blob): Promise<Blob> {
  const context = new AudioContext();
  let decoded: AudioBuffer;
  try {
    decoded = await context.decodeAudioData(await recording.arrayBuffer());
  } finally {
    void context.close();
  }
  const length = Math.max(1, Math.ceil(decoded.duration * WAV_SAMPLE_RATE));
  const offline = new OfflineAudioContext(1, length, WAV_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const samples = (await offline.startRendering()).getChannelData(0);

  const view = new DataView(new ArrayBuffer(44 + samples.length * 2));
  const ascii = (offset: number, text: string) =>
    [...text].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
  ascii(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true); // PCM header size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, WAV_SAMPLE_RATE, true);
  view.setUint32(28, WAV_SAMPLE_RATE * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  ascii(36, "data");
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, index) => {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + index * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  });
  return new Blob([view], { type: "audio/wav" });
}

/** Records one clip at a time from the microphone with the browser's MediaRecorder. */
export function useAudioRecorder() {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<RecorderError | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number>();

  // Stops the timer and hands the microphone back so the browser's recording indicator goes away.
  const release = useCallback(() => {
    window.clearInterval(timerRef.current);
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    recorderRef.current = null;
  }, []);

  useEffect(() => release, [release]);

  const start = useCallback(async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("unsupported");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.start();
      recorderRef.current = recorder;
      setSeconds(0);
      setRecording(true);
      timerRef.current = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    } catch (cause) {
      const denied =
        cause instanceof DOMException &&
        (cause.name === "NotAllowedError" || cause.name === "SecurityError");
      setError(denied ? "denied" : "failed");
    }
  }, []);

  /** Ends the current clip. Resolves to null when nothing was captured. */
  const stop = useCallback(
    () =>
      new Promise<Blob | null>((resolve) => {
        const recorder = recorderRef.current;
        if (!recorder) {
          resolve(null);
          return;
        }
        recorder.onstop = async () => {
          const recorded = new Blob(chunksRef.current, { type: recorder.mimeType });
          release();
          setRecording(false);
          const audio = recorded.size ? await toWav(recorded).catch(() => null) : null;
          if (!audio) setError("failed");
          resolve(audio);
        };
        recorder.stop();
      }),
    [release],
  );

  return { recording, seconds, error, start, stop };
}
