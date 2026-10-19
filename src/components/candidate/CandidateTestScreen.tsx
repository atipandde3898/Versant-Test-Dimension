import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Candidate,
  CandidateResponse,
  ProctorEvent,
  Question,
} from '../../types';
import { dbService } from '../../services/db';
import {
  playCountdownChime,
  playTextPrompt,
  getSupportedMimeType,
} from '../../services/audioUtils';
import {
  Volume2,
  Mic,
  Square,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Radio,
  CheckCircle2,
  Maximize2,
  RefreshCw,
} from 'lucide-react';

interface CandidateTestScreenProps {
  candidate: Candidate;
  questions: Question[];
  onComplete: (candidate: Candidate) => void;
  onAutoSubmit: (candidate: Candidate) => void;
}

type QuestionPhase = 'idle' | 'listening' | 'get_ready' | 'recording' | 'saving';

export const CandidateTestScreen: React.FC<CandidateTestScreenProps> = ({
  candidate,
  questions,
  onComplete,
  onAutoSubmit,
}) => {
  // Current question index
  const [currentIndex, setCurrentIndex] = useState<number>(candidate.current_question_index || 0);
  const [phase, setPhase] = useState<QuestionPhase>('idle');
  const [getReadySeconds, setGetReadySeconds] = useState<number>(3);
  const [recordSecondsLeft, setRecordSecondsLeft] = useState<number>(15);
  const [audioPromptEnded, setAudioPromptEnded] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Proctoring warnings state
  const [warningCount, setWarningCount] = useState<number>(candidate.warning_count || 0);
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const [warningModalReason, setWarningModalReason] = useState<string>('');

  // Audio & Mic state
  const [micVolume, setMicVolume] = useState<number>(0);
  const micStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const speechPromptRef = useRef<{ stop: () => void } | null>(null);
  const lastWarningTimestampRef = useRef<number>(0);
  const isAutoSubmittingRef = useRef<boolean>(false);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const progressPercent = Math.round(((currentIndex) / totalQuestions) * 100);

  // Clean up all media and timers on unmount
  const stopAllMedia = useCallback(() => {
    if (speechPromptRef.current) {
      speechPromptRef.current.stop();
      speechPromptRef.current = null;
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('Recorder stop error:', e);
      }
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
  }, []);

  // --- Proctoring Engine: Detect tab switch, blur, fullscreen exit ---
  const triggerProctorWarning = useCallback(
    async (eventType: 'tab_switch' | 'fullscreen_exit', reasonText: string) => {
      // Debounce events firing within 1500ms of each other
      const now = Date.now();
      if (now - lastWarningTimestampRef.current < 1500) return;
      if (isAutoSubmittingRef.current) return;
      lastWarningTimestampRef.current = now;

      const nextWarnings = warningCount + 1;
      setWarningCount(nextWarnings);

      // Log proctor event to DB
      const proctorEvent: ProctorEvent = {
        id: 'pe_' + Math.random().toString(36).substring(2, 9),
        candidate_id: candidate.id,
        event_type: eventType,
        question_id: currentQuestion?.id,
        question_order: currentQuestion?.order_number,
        created_at: new Date().toISOString(),
        details: reasonText,
      };
      await dbService.logProctorEvent(proctorEvent);

      // Update candidate warning count in DB
      candidate.warning_count = nextWarnings;
      await dbService.updateCandidate(candidate);

      if (nextWarnings >= 2) {
        // Auto-submit immediately!
        isAutoSubmittingRef.current = true;
        stopAllMedia();

        const autoSubmitEvent: ProctorEvent = {
          id: 'pe_' + Math.random().toString(36).substring(2, 9),
          candidate_id: candidate.id,
          event_type: 'auto_submit',
          question_id: currentQuestion?.id,
          question_order: currentQuestion?.order_number,
          created_at: new Date().toISOString(),
          details: 'Maximum proctoring warnings (2) reached. Automatic test submission.',
        };
        await dbService.logProctorEvent(autoSubmitEvent);

        candidate.status = 'auto_submitted';
        candidate.submitted_at = new Date().toISOString();
        await dbService.updateCandidate(candidate);

        // Notify parent
        onAutoSubmit(candidate);
      } else {
        // Show Warning 1 popup modal
        setWarningModalReason(reasonText);
        setShowWarningModal(true);
      }
    },
    [candidate, currentQuestion, stopAllMedia, warningCount, onAutoSubmit]
  );

  useEffect(() => {
    // 1. Tab switch or window minimized
    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerProctorWarning('tab_switch', 'You switched browser tabs or minimized the test window.');
      }
    };

    // 2. Window blur (lost focus to other application)
    const handleWindowBlur = () => {
      // Give a tiny delay in case browser was simply triggering an internal event
      setTimeout(() => {
        if (!document.hasFocus() && !isAutoSubmittingRef.current) {
          triggerProctorWarning('tab_switch', 'Test window lost focus.');
        }
      }, 300);
    };

    // 3. Fullscreen exit
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = Boolean(
        document.fullscreenElement ||
          (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement
      );
      if (!isCurrentlyFullscreen && !isAutoSubmittingRef.current) {
        triggerProctorWarning('fullscreen_exit', 'You exited fullscreen mode.');
      }
    };

    // 4. Disable right click, copy, paste, select
    const preventContextMenu = (e: MouseEvent) => e.preventDefault();
    const preventCopy = (e: ClipboardEvent) => e.preventDefault();
    const preventCut = (e: ClipboardEvent) => e.preventDefault();
    const preventPaste = (e: ClipboardEvent) => e.preventDefault();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('copy', preventCopy);
    document.addEventListener('cut', preventCut);
    document.addEventListener('paste', preventPaste);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('cut', preventCut);
      document.removeEventListener('paste', preventPaste);
    };
  }, [triggerProctorWarning]);

  // --- Step 3: Question Flow Lifecycle ---
  // When question changes, reset state and begin audio / countdown
  useEffect(() => {
    if (!currentQuestion) return;

    let isMounted = true;
    setUploadError(null);
    setAudioPromptEnded(false);

    // Save candidate index in DB so refresh resumes here
    candidate.current_question_index = currentIndex;
    dbService.updateCandidate(candidate);

    // Check if this question requires an audio prompt
    const hasAudioPrompt = Boolean(currentQuestion.audio_url || currentQuestion.audio_script);

    if (hasAudioPrompt) {
      setPhase('listening');
      // If audio file URL exists
      if (currentQuestion.audio_url) {
        const audio = new Audio(currentQuestion.audio_url);
        audio.onended = () => {
          if (isMounted) startGetReadyCountdown();
        };
        audio.onerror = () => {
          if (isMounted) startGetReadyCountdown();
        };
        audio.play().catch(() => {
          if (isMounted) startGetReadyCountdown();
        });
      } else if (currentQuestion.audio_script) {
        // Play TTS speech prompt exactly once
        const speechController = playTextPrompt(
          currentQuestion.audio_script,
          () => {
            if (isMounted) startGetReadyCountdown();
          },
          () => {
            if (isMounted) startGetReadyCountdown();
          }
        );
        speechPromptRef.current = speechController;
      }
    } else {
      // No audio prompt (e.g. Section A: Read Aloud or Section F: Open Question where text is displayed)
      // Allow 2 seconds reading time before get-ready countdown
      const timeout = setTimeout(() => {
        if (isMounted) startGetReadyCountdown();
      }, 1500);
      return () => clearTimeout(timeout);
    }

    return () => {
      isMounted = false;
      stopAllMedia();
    };
  }, [currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Phase 2: 3-Second "Get Ready" Countdown
  const startGetReadyCountdown = () => {
    setAudioPromptEnded(true);
    setPhase('get_ready');
    setGetReadySeconds(3);
    playCountdownChime(660, 100);

    let count = 3;
    const interval = setInterval(() => {
      count -= 1;
      setGetReadySeconds(count);
      if (count > 0) {
        playCountdownChime(660, 100);
      } else {
        clearInterval(interval);
        // Beep high tone to signal recording start
        playCountdownChime(880, 200);
        startCandidateRecording();
      }
    }, 1000);
  };

  // Phase 3: Start Automatic MediaRecorder
  const startCandidateRecording = async () => {
    try {
      recordedChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = stream;

      // Audio analysis for volume meter
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateMeter = () => {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        setMicVolume(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateMeter);
      };
      updateMeter();

      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        saveCandidateResponse(recordedChunksRef.current, mimeType);
      };

      recorder.start(250);
      recordingStartTimeRef.current = Date.now();
      setPhase('recording');

      const timeLimit = currentQuestion.time_limit_seconds || 15;
      setRecordSecondsLeft(timeLimit);

      let timeLeft = timeLimit;
      recordingTimerRef.current = setInterval(() => {
        timeLeft -= 1;
        setRecordSecondsLeft(timeLeft);
        if (timeLeft <= 0) {
          if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
          }
          stopCandidateRecording();
        }
      }, 1000);
    } catch (err) {
      console.error('Recording initialization error:', err);
      setUploadError('Microphone error: please check microphone permissions.');
      setPhase('idle');
    }
  };

  // Stop recording (called by user click or timer expiration)
  const stopCandidateRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      setPhase('saving');
      mediaRecorderRef.current.stop();
    }
  };

  // Phase 4: Save candidate recording to IndexedDB & advance
  const saveCandidateResponse = async (chunks: Blob[], mimeType: string) => {
    try {
      const recordedBlob = new Blob(chunks, { type: mimeType });
      const duration = Math.max(0.5, (Date.now() - recordingStartTimeRef.current) / 1000);

      // Clean stream
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      setMicVolume(0);

      // Store in responses
      const responseRecord: CandidateResponse = {
        id: `resp_${candidate.id}_${currentQuestion.id}`,
        candidate_id: candidate.id,
        question_id: currentQuestion.id,
        question_order: currentQuestion.order_number,
        section: currentQuestion.section,
        audio_blob: recordedBlob,
        audio_mime_type: mimeType,
        duration_seconds: duration,
        recorded_at: new Date().toISOString(),
      };

      await dbService.saveResponse(responseRecord);

      // Check if this was the last question
      if (currentIndex + 1 >= totalQuestions) {
        // Complete the test!
        candidate.status = 'submitted';
        candidate.submitted_at = new Date().toISOString();
        candidate.current_question_index = totalQuestions;
        await dbService.updateCandidate(candidate);
        onComplete(candidate);
      } else {
        // Move to next question automatically
        setCurrentIndex((prev) => prev + 1);
      }
    } catch (err) {
      console.error('Failed to save response:', err);
      setUploadError('Failed to save recording. Please click retry to continue.');
      setPhase('idle');
    }
  };

  // Re-enter fullscreen when warning modal button is clicked
  const handleReturnToFullscreen = async () => {
    setShowWarningModal(false);
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if ((elem as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
        await (elem as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
      }
    } catch (err) {
      console.warn('Could not re-enter fullscreen:', err);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-8rem)] py-6 px-4 flex flex-col justify-between max-w-4xl mx-auto select-none">
      {/* Top Test Progress Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl font-bold text-xs uppercase tracking-wider">
              Section {currentQuestion?.section}: {currentQuestion?.section_title}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Question {currentIndex + 1} of {totalQuestions}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 rounded-lg text-slate-300">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>Time limit: {currentQuestion?.time_limit_seconds}s</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 rounded-lg text-slate-300">
              <ShieldAlert className={`w-3.5 h-3.5 ${warningCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
              <span className={warningCount > 0 ? 'text-amber-300 font-semibold' : 'text-slate-300'}>
                Warnings: {warningCount}/2
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700/50">
          <div
            className="bg-blue-600 h-full transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Question Arena Card */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl flex flex-col justify-center items-center text-center relative overflow-hidden">
        {/* Question Instructions Header */}
        <div className="max-w-xl mx-auto mb-6">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-blue-400 mb-1">
            Task Instructions
          </p>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-medium">
            {currentQuestion?.instructions}
          </p>
        </div>

        {/* Display Text (if Read Aloud or Open Question) */}
        {currentQuestion?.display_text ? (
          <div className="w-full max-w-2xl bg-slate-800/80 border border-slate-700 rounded-2xl p-6 sm:p-8 my-4 shadow-inner">
            <p className="text-xl sm:text-2xl font-serif text-white tracking-wide leading-relaxed font-medium">
              &ldquo;{currentQuestion.display_text}&rdquo;
            </p>
          </div>
        ) : null}

        {/* Error State with Retry Button */}
        {uploadError && (
          <div className="my-4 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm max-w-md flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <span>{uploadError}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setUploadError(null);
                startGetReadyCountdown();
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Question</span>
            </button>
          </div>
        )}

        {/* Phase Indicators */}
        {/* Phase 1: Listening Indicator */}
        {phase === 'listening' && (
          <div className="my-6 flex flex-col items-center gap-3 animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-blue-600/20 border-2 border-blue-500 flex items-center justify-center text-blue-400 shadow-xl relative">
              <Volume2 className="w-10 h-10 animate-bounce" />
              <span className="absolute -inset-1 rounded-full border border-blue-400/40 animate-ping pointer-events-none" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-white">Listening to Prompt...</h3>
              <p className="text-xs text-slate-400 mt-0.5">Please listen carefully. Audio will not be repeated.</p>
            </div>
          </div>
        )}

        {/* Phase 2: Get Ready 3-Sec Countdown */}
        {phase === 'get_ready' && (
          <div className="my-6 flex flex-col items-center gap-3 animate-scale-up">
            <div className="w-24 h-24 rounded-full bg-amber-500/20 border-4 border-amber-400 flex items-center justify-center text-amber-300 font-extrabold text-4xl shadow-2xl animate-pulse">
              {getReadySeconds}
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-white">Get Ready to Speak...</h3>
              <p className="text-xs text-slate-400 mt-0.5">Microphone will activate automatically.</p>
            </div>
          </div>
        )}

        {/* Phase 3: Active Recording */}
        {phase === 'recording' && (
          <div className="my-6 flex flex-col items-center gap-5 w-full max-w-md animate-fade-in">
            {/* Pulsing Recording Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-sm font-semibold tracking-wide">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
              <span>RECORDING YOUR ANSWER</span>
            </div>

            {/* Countdown Big Timer */}
            <div className="flex flex-col items-center">
              <div className="text-5xl sm:text-6xl font-mono font-bold text-white tracking-tight">
                {recordSecondsLeft}s
              </div>
              <p className="text-xs text-slate-400 mt-1">Remaining Time</p>
            </div>

            {/* Live Mic Frequency Waves */}
            <div className="w-full flex items-center justify-center gap-1.5 h-12 bg-slate-800/80 px-4 rounded-xl border border-slate-700">
              <Mic className="w-4 h-4 text-emerald-400 mr-2 shrink-0" />
              {Array.from({ length: 16 }).map((_, i) => {
                // Responsive modulated height based on live micVolume
                const heightPercent = Math.max(
                  15,
                  Math.min(100, micVolume * (0.5 + Math.sin(i * 0.5) * 0.5))
                );
                return (
                  <div
                    key={i}
                    className="w-1.5 rounded-full bg-emerald-400 transition-all duration-75"
                    style={{ height: `${heightPercent}%` }}
                  />
                );
              })}
            </div>

            {/* Stop & Submit Button */}
            <button
              type="button"
              onClick={stopCandidateRecording}
              className="px-8 py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm sm:text-base rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-rose-600/30 cursor-pointer transition-all active:scale-95"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Stop &amp; Submit Answer</span>
            </button>
          </div>
        )}

        {/* Phase 4: Saving Recording */}
        {phase === 'saving' && (
          <div className="my-8 flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-slate-200">Saving response &amp; loading next question...</p>
          </div>
        )}
      </div>

      {/* Bottom Status & Anti-Cheating Advisory */}
      <div className="mt-4 text-center">
        <p className="text-xs text-slate-500">
          Candidate: <span className="text-slate-300 font-medium">{candidate.full_name}</span> • Test Code:{' '}
          <span className="font-mono text-slate-300">{candidate.test_code}</span> • Tab switching &amp; window exits are
          actively logged.
        </p>
      </div>

      {/* Proctoring Warning Modal (Shown on Warning 1) */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 sm:p-8 text-center text-white shadow-2xl space-y-4">
            <div className="w-16 h-16 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-bold text-amber-300">Warning {warningCount} of 2</h2>

            <p className="text-sm text-slate-300 leading-relaxed">
              {warningModalReason || 'Please do not leave the test screen or exit fullscreen mode.'}
            </p>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-200 text-left">
              <strong className="block text-amber-300 mb-1">Final Notice:</strong>
              Leaving the test window or exiting fullscreen again will reach 2 warnings and{' '}
              <strong>automatically submit your test</strong> immediately with whatever answers were recorded so far.
            </div>

            <button
              type="button"
              onClick={handleReturnToFullscreen}
              className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Return to Fullscreen &amp; Continue</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
