import React, { useState, useRef, useEffect } from 'react';
import { Candidate } from '../../types';
import { getSupportedMimeType } from '../../services/audioUtils';
import {
  Mic,
  Volume2,
  CheckCircle,
  AlertTriangle,
  Play,
  Square,
  Maximize,
  HelpCircle,
  Clock,
  Laptop,
} from 'lucide-react';

interface CandidateInstructionsProps {
  candidate: Candidate;
  onStartTest: () => void;
}

export const CandidateInstructions: React.FC<CandidateInstructionsProps> = ({
  candidate,
  onStartTest,
}) => {
  // Mic check state
  const [micStatus, setMicStatus] = useState<'idle' | 'recording' | 'recorded' | 'playing' | 'error'>('idle');
  const [recordSecondsLeft, setRecordSecondsLeft] = useState(3);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [micVolumeLevel, setMicVolumeLevel] = useState<number>(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  // Clean up audio objects on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [audioUrl]);

  const startMicCheck = async () => {
    setMicError(null);
    audioChunksRef.current = [];
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      audioStreamRef.current = stream;

      // Audio analysis for volume meter
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateMeter = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        setMicVolumeLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateMeter);
      };
      updateMeter();

      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        const recordedBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(recordedBlob);
        setAudioUrl(url);
        setMicStatus('recorded');
        setMicVolumeLevel(0);

        // stop microphone stream after test
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setMicStatus('recording');
      setRecordSecondsLeft(3);

      let countdown = 3;
      const interval = setInterval(() => {
        countdown -= 1;
        setRecordSecondsLeft(countdown);
        if (countdown <= 0) {
          clearInterval(interval);
          if (recorder.state === 'recording') {
            recorder.stop();
          }
        }
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      setMicError('Microphone access was denied or no microphone found. Please allow microphone permissions in Chrome.');
      setMicStatus('error');
    }
  };

  const playRecordedAudio = () => {
    if (!audioUrl) return;
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    const audio = new Audio(audioUrl);
    audioPlayerRef.current = audio;
    setMicStatus('playing');

    audio.onended = () => {
      setMicStatus('recorded');
    };
    audio.play().catch((err) => {
      console.warn('Playback error', err);
      setMicStatus('recorded');
    });
  };

  const handleStartFullscreenTest = async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if ((elem as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
        await (elem as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen request bypassed or blocked:', err);
    }
    onStartTest();
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] py-8 px-4 flex items-center justify-center">
      <div className="max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-10 text-white space-y-8">
        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full text-blue-300 text-xs font-semibold uppercase tracking-wider mb-3">
            <Laptop className="w-3.5 h-3.5" />
            Candidate Orientation
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Welcome, {candidate.full_name}
          </h1>
          <p className="text-sm sm:text-base text-slate-400 mt-1">
            Please read these examination rules carefully and complete the mandatory audio check below before beginning.
          </p>
        </div>

        {/* Rules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-2xl flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
              1
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Browser & Environment</h3>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                Use Google Chrome on a desktop or laptop. Stay in a quiet, isolated room without background conversations or music.
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-2xl flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
              2
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Audio Plays Once</h3>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                Each audio prompt will play <strong className="text-blue-300">only once</strong>. There is no replay button. Listen intently when prompted.
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-2xl flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-600/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
              3
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Strict Proctoring</h3>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                Do not switch tabs, minimize windows, or exit fullscreen. You will receive a warning popup.
                <strong className="text-amber-300"> At 2 warnings, your test automatically auto-submits.</strong>
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-2xl flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
              4
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">No Backward Navigation</h3>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                You cannot return to earlier questions. When the recording stops, your answer is securely saved and the next question loads immediately.
              </p>
            </div>
          </div>
        </div>

        {/* Mandatory Microphone Check Section */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Mic className="w-5 h-5 text-blue-400" />
                <h2 className="text-base font-semibold text-white">Microphone Quality Check</h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Required
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Record a 3-second sample sentence (e.g., &quot;Testing my microphone for Dimension Education&quot;) and play it back to confirm sound clarity.
              </p>
            </div>

            {micStatus === 'recorded' || micStatus === 'playing' ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 font-medium">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Microphone Verified</span>
              </div>
            ) : null}
          </div>

          {micError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{micError}</span>
            </div>
          )}

          {/* Interactive Mic Box */}
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
            {/* Record Button */}
            {micStatus === 'idle' || micStatus === 'error' ? (
              <button
                type="button"
                onClick={startMicCheck}
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <Mic className="w-4 h-4" />
                <span>Record 3-Sec Sample</span>
              </button>
            ) : micStatus === 'recording' ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 bg-rose-600/20 border border-rose-500/40 text-rose-300 rounded-xl text-sm font-medium animate-pulse">
                  <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
                  <span>Recording... ({recordSecondsLeft}s)</span>
                </div>
                {/* Volume meter bar */}
                <div className="w-24 sm:w-32 h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-75"
                    style={{ width: `${micVolumeLevel}%` }}
                  />
                </div>
              </div>
            ) : (
              /* Recorded / Playing states */
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={playRecordedAudio}
                  disabled={micStatus === 'playing'}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{micStatus === 'playing' ? 'Playing Sample...' : 'Play Back My Sample'}</span>
                </button>
                <button
                  type="button"
                  onClick={startMicCheck}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition-colors"
                >
                  Retest
                </button>
              </div>
            )}

            <div className="text-xs text-slate-400 text-center sm:text-left">
              {micStatus === 'idle' && 'Click the record button and speak clearly into your mic.'}
              {micStatus === 'recording' && 'Speak into your microphone now...'}
              {(micStatus === 'recorded' || micStatus === 'playing') && (
                <span className="text-emerald-300 font-medium">
                  Sample captured! Click &apos;Play Back&apos; to confirm you can hear yourself clearly.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Start Test CTA */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Maximize className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Clicking Start Test will automatically request Fullscreen mode.</span>
          </div>

          <button
            type="button"
            onClick={handleStartFullscreenTest}
            disabled={micStatus !== 'recorded' && micStatus !== 'playing'}
            className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:border-slate-700 disabled:cursor-not-allowed text-white font-bold text-sm sm:text-base rounded-2xl transition-all shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Maximize className="w-5 h-5" />
            <span>Start Test Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
