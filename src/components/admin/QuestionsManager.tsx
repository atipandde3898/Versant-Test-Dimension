import React, { useState, useEffect, useRef } from 'react';
import { Question, SectionLetter } from '../../types';
import { dbService, DEFAULT_QUESTIONS } from '../../services/db';
import {
  playCountdownChime,
  playTextPrompt,
  getSupportedMimeType,
} from '../../services/audioUtils';
import {
  HelpCircle,
  ArrowLeft,
  Edit2,
  Save,
  Volume2,
  Mic,
  Upload,
  RotateCcw,
  CheckCircle,
  Play,
  Square,
  Clock,
  Plus,
} from 'lucide-react';

interface QuestionsManagerProps {
  onBack: () => void;
}

export const QuestionsManager: React.FC<QuestionsManagerProps> = ({ onBack }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [recordingForQuestionId, setRecordingForQuestionId] = useState<string | null>(null);
  const [recSeconds, setRecSeconds] = useState<number>(0);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeTTSQuestionId, setActiveTTSQuestionId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<NodeJS.Timeout | null>(null);
  const ttsControllerRef = useRef<{ stop: () => void } | null>(null);

  const loadQuestions = async () => {
    const list = await dbService.getQuestions();
    setQuestions(list);
  };

  useEffect(() => {
    loadQuestions();
    return () => {
      if (ttsControllerRef.current) ttsControllerRef.current.stop();
      if (recTimerRef.current) clearInterval(recTimerRef.current);
    };
  }, []);

  // Reset to default questions
  const handleResetDefaults = async () => {
    if (confirm('Reset all questions to default 17 Versant-style Dimension Education test questions?')) {
      await dbService.resetQuestionsToDefault();
      await loadQuestions();
      setSuccessMsg('Questions reset to official default curriculum.');
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  // Save edited question
  const handleSaveQuestion = async (q: Question) => {
    await dbService.saveQuestion(q);
    setEditingQuestion(null);
    await loadQuestions();
    setSuccessMsg(`Question ${q.order_number} updated.`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Preview TTS voice
  const handlePlayTTS = (q: Question) => {
    if (activeTTSQuestionId === q.id && ttsControllerRef.current) {
      ttsControllerRef.current.stop();
      setActiveTTSQuestionId(null);
      return;
    }

    if (ttsControllerRef.current) {
      ttsControllerRef.current.stop();
    }

    const textToRead = q.audio_script || q.display_text || q.instructions;
    setActiveTTSQuestionId(q.id);

    ttsControllerRef.current = playTextPrompt(
      textToRead,
      () => setActiveTTSQuestionId(null),
      () => setActiveTTSQuestionId(null)
    );
  };

  // Record custom voice prompt with mic
  const handleStartPromptRecording = async (q: Question) => {
    try {
      recordedChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(recordedChunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          q.audio_url = base64Audio;
          await dbService.saveQuestion(q);
          await loadQuestions();
          setSuccessMsg(`Recorded custom audio prompt saved for Question ${q.order_number}.`);
          setTimeout(() => setSuccessMsg(null), 3000);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setRecordingForQuestionId(q.id);
      setRecSeconds(0);

      recTimerRef.current = setInterval(() => {
        setRecSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Could not access microphone to record prompt: ' + err);
    }
  };

  const handleStopPromptRecording = () => {
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setRecordingForQuestionId(null);
  };

  // Handle uploading audio file (.mp3 / .wav)
  const handleUploadAudioFile = (q: Question, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const dataUrl = evt.target?.result as string;
      q.audio_url = dataUrl;
      await dbService.saveQuestion(q);
      await loadQuestions();
      setSuccessMsg(`Audio prompt file uploaded for Question ${q.order_number}.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    };
    reader.readAsDataURL(file);
  };

  const sections: SectionLetter[] = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-400 hover:text-white transition-colors cursor-pointer mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-2xl font-bold text-white tracking-tight">Question Curriculum Manager</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Configure Versant-style spoken English questions, audio prompts, and response time limits.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetDefaults}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-medium rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 text-amber-400" />
          <span>Reset to Default 17 Questions</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs sm:text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Sections Grouped Questions */}
      <div className="space-y-8">
        {sections.map((sec) => {
          const secQuestions = questions.filter((q) => q.section === sec);
          if (!secQuestions.length) return null;

          return (
            <div key={sec} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-sm">
                    {sec}
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Section {sec}: {secQuestions[0]?.section_title}
                    </h3>
                    <p className="text-xs text-slate-400">{secQuestions.length} questions in this section</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {secQuestions.map((q) => {
                  const isEditing = editingQuestion?.id === q.id;
                  const isRecording = recordingForQuestionId === q.id;
                  const isTTSPlaying = activeTTSQuestionId === q.id;

                  return (
                    <div
                      key={q.id}
                      className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 sm:p-5 space-y-3"
                    >
                      {isEditing ? (
                        /* Editing Form */
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                                Display Text (Shown on Screen)
                              </label>
                              <input
                                type="text"
                                value={editingQuestion.display_text}
                                onChange={(e) =>
                                  setEditingQuestion({ ...editingQuestion, display_text: e.target.value })
                                }
                                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                                Audio Prompt Script (Spoken to Candidate)
                              </label>
                              <input
                                type="text"
                                value={editingQuestion.audio_script || ''}
                                onChange={(e) =>
                                  setEditingQuestion({ ...editingQuestion, audio_script: e.target.value })
                                }
                                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                                Candidate Task Instructions
                              </label>
                              <input
                                type="text"
                                value={editingQuestion.instructions}
                                onChange={(e) =>
                                  setEditingQuestion({ ...editingQuestion, instructions: e.target.value })
                                }
                                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                                Time Limit (Seconds)
                              </label>
                              <input
                                type="number"
                                min="5"
                                max="180"
                                value={editingQuestion.time_limit_seconds}
                                onChange={(e) =>
                                  setEditingQuestion({
                                    ...editingQuestion,
                                    time_limit_seconds: parseInt(e.target.value) || 15,
                                  })
                                }
                                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setEditingQuestion(null)}
                              className="px-3 py-1.5 bg-slate-700 text-slate-300 text-xs rounded-xl"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveQuestion(editingQuestion)}
                              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Save Changes</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Read-only view with Audio Controls */
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-blue-400">
                                Q{q.order_number}
                              </span>
                              <span className="text-xs text-slate-500">•</span>
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {q.time_limit_seconds}s limit
                              </span>
                            </div>

                            <p className="text-sm font-semibold text-white">
                              {q.display_text ? `"${q.display_text}"` : q.audio_script ? `Audio Prompt: "${q.audio_script}"` : q.instructions}
                            </p>

                            <p className="text-xs text-slate-400">{q.instructions}</p>
                          </div>

                          {/* Audio Prompt Actions */}
                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            {/* TTS Preview */}
                            <button
                              type="button"
                              onClick={() => handlePlayTTS(q)}
                              className={`px-2.5 py-1.5 text-xs font-medium rounded-xl border flex items-center gap-1.5 transition-colors cursor-pointer ${
                                isTTSPlaying
                                  ? 'bg-amber-600 border-amber-500 text-white'
                                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-700'
                              }`}
                              title="Test Speech Synthesis TTS Voice"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>{isTTSPlaying ? 'Stop TTS' : 'Test Voice'}</span>
                            </button>

                            {/* Record Voice Prompt */}
                            {isRecording ? (
                              <button
                                type="button"
                                onClick={handleStopPromptRecording}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 animate-pulse"
                              >
                                <Square className="w-3.5 h-3.5 fill-current" />
                                <span>Stop Recording ({recSeconds}s)</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleStartPromptRecording(q)}
                                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
                                title="Record your own voice for this question"
                              >
                                <Mic className="w-3.5 h-3.5 text-rose-400" />
                                <span>Record Prompt</span>
                              </button>
                            )}

                            {/* Upload Audio Prompt File */}
                            <label
                              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Upload custom MP3 / WAV audio prompt"
                            >
                              <Upload className="w-3.5 h-3.5 text-blue-400" />
                              <span>Upload Audio</span>
                              <input
                                type="file"
                                accept="audio/*"
                                onChange={(e) => handleUploadAudioFile(q, e)}
                                className="hidden"
                              />
                            </label>

                            {/* Edit Text */}
                            <button
                              type="button"
                              onClick={() => setEditingQuestion(q)}
                              className="p-1.5 bg-slate-900 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
                              title="Edit Question"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
