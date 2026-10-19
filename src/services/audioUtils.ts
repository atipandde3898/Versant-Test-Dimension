/**
 * Audio Utilities for Dimension Education Verbal Test
 * Handles speech synthesis, countdown beeps, synthetic audio generation for demo records,
 * and MediaRecorder format detection.
 */

// Safe MIME type detector for MediaRecorder across browsers
export function getSupportedMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm';
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/aac',
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return 'audio/webm';
}

// Play countdown beep using Web Audio API
export function playCountdownChime(frequency = 880, durationMs = 120): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch (err) {
    console.warn('Audio chime could not play:', err);
  }
}

// Web Speech API wrapper to play text prompts once
export function playTextPrompt(
  text: string,
  onEnd?: () => void,
  onError?: (err: unknown) => void
): { stop: () => void } {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    // If not supported, simulate a 3-second reading delay
    const timeout = setTimeout(() => {
      onEnd?.();
    }, 2500);
    return { stop: () => clearTimeout(timeout) };
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95; // Clear, deliberate pace suitable for testing
  utterance.pitch = 1.0;
  utterance.lang = 'en-US';

  // Try to find a clear English voice
  const voices = window.speechSynthesis.getVoices();
  const naturalVoice = voices.find(
    v => (v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel')))
  ) || voices.find(v => v.lang.startsWith('en'));

  if (naturalVoice) {
    utterance.voice = naturalVoice;
  }

  let hasEnded = false;
  utterance.onend = () => {
    if (!hasEnded) {
      hasEnded = true;
      onEnd?.();
    }
  };

  utterance.onerror = (e) => {
    if (!hasEnded) {
      hasEnded = true;
      console.warn('Speech synthesis error, falling back:', e);
      onError?.(e);
      // Still trigger onEnd so the test is not stuck
      onEnd?.();
    }
  };

  // Chrome bug workaround: speechSynthesis can pause after 15s
  const interval = setInterval(() => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    } else {
      clearInterval(interval);
    }
  }, 10000);

  window.speechSynthesis.speak(utterance);

  return {
    stop: () => {
      clearInterval(interval);
      window.speechSynthesis.cancel();
    },
  };
}

// Generate a synthetic WAV audio blob for demo candidates (so admin can test listening right away)
export function createSyntheticAudioBlob(durationSeconds = 4, pitch = 440, label = 'Sample'): Blob {
  const sampleRate = 22050;
  const numChannels = 1;
  const numSamples = sampleRate * durationSeconds;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // Write WAV Header
  function writeString(offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  // Generate a speech-like formant-modulated wave
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Modulation mimics speech cadence
    const envelope = Math.sin(Math.PI * (t / durationSeconds)) * (0.6 + 0.4 * Math.sin(4 * Math.PI * t));
    const harmonic1 = Math.sin(2 * Math.PI * pitch * t);
    const harmonic2 = 0.5 * Math.sin(2 * Math.PI * (pitch * 1.5) * t);
    const harmonic3 = 0.25 * Math.sin(2 * Math.PI * (pitch * 2) * t);
    const sample = Math.max(-1, Math.min(1, (harmonic1 + harmonic2 + harmonic3) * envelope * 0.4));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}
