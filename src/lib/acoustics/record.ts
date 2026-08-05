"use client";

/**
 * Microphone capture for #005 Room Acoustics.
 * Raw mono samples are needed for a decay measurement, so this records via a
 * ScriptProcessorNode: it is deprecated but universally supported (including
 * iOS Safari) and needs no worklet plumbing for a three-second capture.
 * Audio never leaves the device — it lives in memory until the analysis ends.
 */

export type Recording = { samples: Float32Array; sampleRate: number };

export class MicError extends Error {
  constructor(
    message: string,
    readonly kind: "denied" | "unavailable" | "failed",
  ) {
    super(message);
    this.name = "MicError";
  }
}

/** Request the mic with all processing disabled — AGC/echo cancellation and
 *  noise suppression reshape the decay tail we are trying to measure. */
export async function openMicrophone(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new MicError("Microphone capture is not available in this browser.", "unavailable");
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
      },
      video: false,
    });
  } catch (err) {
    const denied =
      err instanceof DOMException &&
      (err.name === "NotAllowedError" || err.name === "SecurityError");
    throw new MicError(
      denied ? "Microphone access was declined." : "The microphone could not be started.",
      denied ? "denied" : "failed",
    );
  }
}

/**
 * Record `seconds` of mono audio from an open stream.
 * `onLevel` receives a 0..1 peak level for the live meter.
 */
export async function recordSamples(
  stream: MediaStream,
  seconds: number,
  onLevel?: (level: number) => void,
): Promise<Recording> {
  const AudioCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) {
    throw new MicError("Web Audio is not available in this browser.", "unavailable");
  }
  const ctx = new AudioCtor();
  await ctx.resume();

  const source = ctx.createMediaStreamSource(stream);
  const bufferSize = 4096;
  const processor = ctx.createScriptProcessor(bufferSize, 1, 1);
  // Silent sink: the processor only runs while connected, and a zero gain
  // keeps the microphone out of the speakers (no feedback loop).
  const mute = ctx.createGain();
  mute.gain.value = 0;

  const chunks: Float32Array[] = [];
  const target = Math.ceil(seconds * ctx.sampleRate);
  let collected = 0;

  const done = new Promise<void>((resolve) => {
    processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
      chunks.push(new Float32Array(input));
      collected += input.length;
      if (onLevel) {
        let peak = 0;
        for (let i = 0; i < input.length; i++) {
          const v = Math.abs(input[i]);
          if (v > peak) peak = v;
        }
        onLevel(peak);
      }
      if (collected >= target) resolve();
    };
  });

  source.connect(processor);
  processor.connect(mute);
  mute.connect(ctx.destination);

  try {
    await done;
  } finally {
    processor.onaudioprocess = null;
    source.disconnect();
    processor.disconnect();
    mute.disconnect();
    await ctx.close().catch(() => {});
  }

  const samples = new Float32Array(collected);
  let offset = 0;
  for (const chunk of chunks) {
    samples.set(chunk, offset);
    offset += chunk.length;
  }
  return { samples, sampleRate: ctx.sampleRate };
}

export function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((t) => t.stop());
}
