import React, { useState, useEffect, useRef } from 'react';
import {
  Candidate,
  CandidateResponse,
  ProctorEvent,
  Question,
  Score,
  SectionLetter,
} from '../../types';
import { dbService } from '../../services/db';
import {
  createCandidateZip,
  downloadSingleRecording,
} from '../../services/zipExport';
import {
  ArrowLeft,
  Download,
  Trash2,
  Save,
  Play,
  Pause,
  Volume2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Info,
  CheckCircle2,
  FileSpreadsheet,
  Archive,
  User,
  Calendar,
} from 'lucide-react';

interface CandidateDetailProps {
  candidate: Candidate;
  onBack: () => void;
  onCandidateDeleted: () => void;
  onCandidateUpdated: (updated: Candidate) => void;
}

export const CandidateDetail: React.FC<CandidateDetailProps> = ({
  candidate,
  onBack,
  onCandidateDeleted,
  onCandidateUpdated,
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<CandidateResponse[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [proctorEvents, setProctorEvents] = useState<ProctorEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Overall candidate state
  const [overallNotes, setOverallNotes] = useState<string>(candidate.overall_notes || '');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Audio playback state
  const [activePlayingResponseId, setActivePlayingResponseId] = useState<string | null>(null);
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // ZIP download progress
  const [zipProgress, setZipProgress] = useState<{ active: boolean; text: string }>({
    active: false,
    text: '',
  });

  // Delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

  // Active section tab for navigation
  const [selectedSection, setSelectedSection] = useState<SectionLetter | 'all'>('all');

  // Load candidate's data
  const loadData = async () => {
    setLoading(true);
    try {
      const [qs, resps, scs, events] = await Promise.all([
        dbService.getQuestions(),
        dbService.getResponsesForCandidate(candidate.id),
        dbService.getScoresForCandidate(candidate.id),
        dbService.getProctorEventsForCandidate(candidate.id),
      ]);
      setQuestions(qs);
      setResponses(resps);
      setScores(scs);
      setProctorEvents(events);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    return () => {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
    };
  }, [candidate.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Audio Playback
  const handlePlayResponse = (resp: CandidateResponse) => {
    if (activePlayingResponseId === resp.id && activeAudioRef.current) {
      if (activeAudioRef.current.paused) {
        activeAudioRef.current.play();
      } else {
        activeAudioRef.current.pause();
        setActivePlayingResponseId(null);
      }
      return;
    }

    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
    }

    const url = URL.createObjectURL(resp.audio_blob);
    const audio = new Audio(url);
    activeAudioRef.current = audio;
    setActivePlayingResponseId(resp.id);

    audio.ontimeupdate = () => {
      setAudioCurrentTime(audio.currentTime);
      setAudioDuration(audio.duration || resp.duration_seconds);
    };

    audio.onended = () => {
      setActivePlayingResponseId(null);
      setAudioCurrentTime(0);
      URL.revokeObjectURL(url);
    };

    audio.play().catch((err) => {
      console.warn('Audio play failed', err);
      setActivePlayingResponseId(null);
    });
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (activeAudioRef.current) {
      const time = Number(e.target.value);
      activeAudioRef.current.currentTime = time;
      setAudioCurrentTime(time);
    }
  };

  // Rubric Score change handler
  const handleScoreChange = (
    respId: string,
    questionId: string,
    field: 'pronunciation' | 'fluency' | 'accuracy' | 'content',
    val: number
  ) => {
    setScores((prev) => {
      const existing = prev.find((s) => s.question_id === questionId);
      if (existing) {
        return prev.map((s) =>
          s.question_id === questionId
            ? { ...s, [field]: val, updated_at: new Date().toISOString() }
            : s
        );
      } else {
        const newScore: Score = {
          id: `score_${candidate.id}_${questionId}`,
          response_id: respId,
          candidate_id: candidate.id,
          question_id: questionId,
          pronunciation: field === 'pronunciation' ? val : 3,
          fluency: field === 'fluency' ? val : 3,
          accuracy: field === 'accuracy' ? val : 3,
          content: field === 'content' ? val : 3,
          updated_at: new Date().toISOString(),
        };
        return [...prev, newScore];
      }
    });
  };

  const handleNotesChange = (questionId: string, respId: string, notes: string) => {
    setScores((prev) => {
      const existing = prev.find((s) => s.question_id === questionId);
      if (existing) {
        return prev.map((s) =>
          s.question_id === questionId ? { ...s, notes, updated_at: new Date().toISOString() } : s
        );
      } else {
        const newScore: Score = {
          id: `score_${candidate.id}_${questionId}`,
          response_id: respId,
          candidate_id: candidate.id,
          question_id: questionId,
          pronunciation: 3,
          fluency: 3,
          accuracy: 3,
          content: 3,
          notes,
          updated_at: new Date().toISOString(),
        };
        return [...prev, newScore];
      }
    });
  };

  // Save all scores to database and recalculate total
  const handleSaveAllScores = async () => {
    for (const sc of scores) {
      await dbService.saveScore(sc);
    }

    // Save overall notes & calculate score
    candidate.overall_notes = overallNotes;
    const totalScorePercent = await dbService.recalculateCandidateTotalScore(candidate.id);
    candidate.total_score = totalScorePercent;
    await dbService.updateCandidate(candidate);

    onCandidateUpdated(candidate);
    setSaveSuccessMsg('All candidate scores and rubric evaluation saved successfully!');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Download all recordings as ZIP
  const handleDownloadAllZip = async () => {
    setZipProgress({ active: true, text: 'Creating candidate archive...' });
    try {
      const zipBlob = await createCandidateZip(
        candidate,
        questions,
        responses,
        scores,
        (_, status) => {
          setZipProgress({ active: true, text: status });
        }
      );
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${candidate.full_name.replace(/\s+/g, '_')}_Recordings_${candidate.test_code}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      console.error('ZIP generation failed:', err);
    } finally {
      setZipProgress({ active: false, text: '' });
    }
  };

  // Delete Candidate Data
  const handleDeleteCandidate = async () => {
    await dbService.deleteCandidateData(candidate.id);
    onCandidateDeleted();
  };

  // Group questions by section
  const sections: SectionLetter[] = ['A', 'B', 'C', 'D', 'E', 'F'];
  const sectionTitles: Record<SectionLetter, string> = {
    A: 'Read Aloud',
    B: 'Repeat',
    C: 'Short Answer',
    D: 'Sentence Build',
    E: 'Story Retell',
    F: 'Open Question',
  };

  // Calculate section averages
  const calculateSectionAvg = (sec: SectionLetter) => {
    const secQIds = questions.filter((q) => q.section === sec).map((q) => q.id);
    const secScores = scores.filter((s) => secQIds.includes(s.question_id));
    if (!secScores.length) return null;

    let sum = 0;
    for (const s of secScores) {
      sum += (s.pronunciation + s.fluency + s.accuracy + s.content) / 4;
    }
    return (sum / secScores.length).toFixed(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadAllZip}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <Download className="w-4 h-4" />
            <span>Download All Recordings (ZIP)</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAllScores}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <Save className="w-4 h-4" />
            <span>Save Scores &amp; Notes</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-rose-900/30 text-rose-300 text-xs sm:text-sm font-medium rounded-xl border border-slate-700 hover:border-rose-500/50 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Delete candidate records"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs sm:text-sm flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Candidate Profile Summary Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-2 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-lg">
              {candidate.full_name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{candidate.full_name}</h2>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="font-mono text-blue-300 font-semibold">{candidate.test_code}</span>
                <span>•</span>
                <span>{candidate.email || 'No email provided'}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 text-xs text-slate-400">
            <div>
              <span className="text-slate-500 block">Started:</span>
              <span className="text-slate-300">{new Date(candidate.started_at).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Submitted:</span>
              <span className="text-slate-300">
                {candidate.submitted_at ? new Date(candidate.submitted_at).toLocaleString() : 'In Progress'}
              </span>
            </div>
          </div>
        </div>

        {/* Status & Warning Badge Card */}
        <div className="space-y-3 bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50">
          <div className="text-xs text-slate-400 font-medium">Test Integrity &amp; Status</div>
          <div className="flex items-center gap-2">
            {candidate.status === 'submitted' && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Normal Submission
              </span>
            )}
            {candidate.status === 'auto_submitted' && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Auto-Submitted (2 Warnings)
              </span>
            )}
            {candidate.status === 'in_progress' && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Test In Progress
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <ShieldAlert className={`w-4 h-4 ${candidate.warning_count > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
            <span className={candidate.warning_count > 0 ? 'text-amber-300 font-semibold' : 'text-slate-300'}>
              Proctor Warnings: {candidate.warning_count} / 2
            </span>
          </div>
        </div>

        {/* Total Score Badge Card */}
        <div className="space-y-1 bg-blue-950/30 p-4 rounded-2xl border border-blue-800/40 flex flex-col justify-center items-center text-center">
          <span className="text-xs uppercase font-bold text-blue-300 tracking-wider">Overall Verbal Score</span>
          <div className="text-4xl font-extrabold text-white tracking-tight">
            {candidate.total_score != null ? `${candidate.total_score}%` : 'Pending'}
          </div>
          <span className="text-[11px] text-blue-400">
            {candidate.total_score != null ? 'Average converted from 1-5 scale' : 'Input scores below to calculate'}
          </span>
        </div>
      </div>

      {/* Proctoring Events Timeline Log */}
      {proctorEvents.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Proctoring Event Audit Log</h3>
            <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
              {proctorEvents.length} {proctorEvents.length === 1 ? 'incident' : 'incidents'} detected
            </span>
          </div>

          <div className="space-y-2">
            {proctorEvents.map((evt, idx) => (
              <div
                key={evt.id || idx}
                className="flex items-start justify-between p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-amber-300 uppercase tracking-wide">
                      {evt.event_type.replace('_', ' ')}
                    </span>
                    {evt.question_order && (
                      <span className="text-slate-400">
                        (During Question #{evt.question_order})
                      </span>
                    )}
                  </div>
                  <p className="text-slate-300">{evt.details}</p>
                </div>
                <div className="text-slate-500 text-[11px] shrink-0 font-mono">
                  {new Date(evt.created_at).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section Filter Pills & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedSection('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              selectedSection === 'all'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            All Sections
          </button>
          {sections.map((sec) => {
            const avg = calculateSectionAvg(sec);
            return (
              <button
                key={sec}
                type="button"
                onClick={() => setSelectedSection(sec)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  selectedSection === sec
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span>Section {sec}: {sectionTitles[sec]}</span>
                {avg && <span className="bg-slate-900/60 px-1.5 py-0.2 rounded text-[10px] text-blue-300">{avg}/5</span>}
              </button>
            );
          })}
        </div>

        {/* Rubric Criteria Tooltip Reference */}
        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-blue-400" />
          <span>Rubric Scale: 1 (Needs work) → 3 (Moderate) → 5 (Natural/Fluent)</span>
        </div>
      </div>

      {/* Questions & Responses Grading List */}
      <div className="space-y-4">
        {questions
          .filter((q) => selectedSection === 'all' || q.section === selectedSection)
          .map((q) => {
            const resp = responses.find((r) => r.question_id === q.id);
            const score = scores.find((s) => s.question_id === q.id);
            const isPlaying = activePlayingResponseId === resp?.id;

            return (
              <div
                key={q.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5"
              >
                {/* Question Info Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-blue-600/20 text-blue-300 text-xs font-bold uppercase tracking-wider">
                        Q{q.order_number} • Section {q.section} ({q.section_title})
                      </span>
                      <span className="text-xs text-slate-400">{q.type.replace('_', ' ')}</span>
                    </div>

                    <h4 className="text-base sm:text-lg font-semibold text-white">
                      {q.display_text ? `"${q.display_text}"` : q.audio_script ? `Prompt: "${q.audio_script}"` : q.instructions}
                    </h4>
                  </div>

                  {/* Single Recording Download Button */}
                  {resp && (
                    <button
                      type="button"
                      onClick={() =>
                        downloadSingleRecording(
                          resp.audio_blob,
                          candidate.full_name,
                          q.order_number,
                          q.section_title
                        )
                      }
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                      title="Download this audio file (.webm)"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-400" />
                      <span>Download .webm</span>
                    </button>
                  )}
                </div>

                {/* Candidate Audio Player Bar */}
                {resp ? (
                  <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
                    <button
                      type="button"
                      onClick={() => handlePlayResponse(resp)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white shadow-md transition-all cursor-pointer ${
                        isPlaying ? 'bg-amber-600 hover:bg-amber-500' : 'bg-blue-600 hover:bg-blue-500'
                      }`}
                    >
                      {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                    </button>

                    <div className="flex-1 w-full space-y-1">
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>
                          {isPlaying
                            ? `${audioCurrentTime.toFixed(1)}s / ${(audioDuration || resp.duration_seconds).toFixed(1)}s`
                            : `Duration: ${resp.duration_seconds.toFixed(1)}s`}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">
                          Recorded: {new Date(resp.recorded_at).toLocaleTimeString()}
                        </span>
                      </div>

                      {/* Scrubber slider */}
                      <input
                        type="range"
                        min="0"
                        max={audioDuration || resp.duration_seconds}
                        step="0.1"
                        value={isPlaying ? audioCurrentTime : 0}
                        onChange={handleSeek}
                        disabled={!isPlaying}
                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-800/40 border border-dashed border-slate-700 rounded-2xl text-xs text-slate-500 italic text-center">
                    No recording submitted for this question (test ended prior to completion).
                  </div>
                )}

                {/* Rubric Scoring Inputs Grid (1-5 for Pronunciation, Fluency, Accuracy, Content) */}
                <div className="bg-slate-850/60 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Assessment Rubric (1–5)
                    </span>
                    {score && (
                      <span className="text-xs font-semibold text-blue-300">
                        Question Average:{' '}
                        {((score.pronunciation + score.fluency + score.accuracy + score.content) / 4).toFixed(1)} / 5
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Pronunciation */}
                    <div className="space-y-1.5">
                      <label className="flex justify-between text-xs font-medium text-slate-300">
                        <span>Pronunciation</span>
                        <span className="font-bold text-blue-400">{score?.pronunciation || 3}/5</span>
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={score?.pronunciation || 3}
                        onChange={(e) =>
                          handleScoreChange(
                            resp?.id || '',
                            q.id,
                            'pronunciation',
                            parseInt(e.target.value)
                          )
                        }
                        className="w-full accent-blue-500 cursor-pointer"
                      />
                      <p className="text-[10px] text-slate-500">
                        {score?.pronunciation === 1 && '1: Very hard to understand'}
                        {score?.pronunciation === 2 && '2: Heavy strain required'}
                        {score?.pronunciation === 3 && '3: Understandable with effort'}
                        {score?.pronunciation === 4 && '4: Mostly clear with minor accent'}
                        {score?.pronunciation === 5 && '5: Clear, natural, effortless'}
                        {!score && '3: Understandable with effort'}
                      </p>
                    </div>

                    {/* Fluency */}
                    <div className="space-y-1.5">
                      <label className="flex justify-between text-xs font-medium text-slate-300">
                        <span>Fluency</span>
                        <span className="font-bold text-blue-400">{score?.fluency || 3}/5</span>
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={score?.fluency || 3}
                        onChange={(e) =>
                          handleScoreChange(
                            resp?.id || '',
                            q.id,
                            'fluency',
                            parseInt(e.target.value)
                          )
                        }
                        className="w-full accent-blue-500 cursor-pointer"
                      />
                      <p className="text-[10px] text-slate-500">
                        {score?.fluency === 1 && '1: Constant long pauses'}
                        {score?.fluency === 2 && '2: Frequent searching for words'}
                        {score?.fluency === 3 && '3: Some hesitation, steady flow'}
                        {score?.fluency === 4 && '4: Good rhythm with minor pauses'}
                        {score?.fluency === 5 && '5: Smooth, natural speech pace'}
                        {!score && '3: Some hesitation'}
                      </p>
                    </div>

                    {/* Accuracy */}
                    <div className="space-y-1.5">
                      <label className="flex justify-between text-xs font-medium text-slate-300">
                        <span>Accuracy</span>
                        <span className="font-bold text-blue-400">{score?.accuracy || 3}/5</span>
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={score?.accuracy || 3}
                        onChange={(e) =>
                          handleScoreChange(
                            resp?.id || '',
                            q.id,
                            'accuracy',
                            parseInt(e.target.value)
                          )
                        }
                        className="w-full accent-blue-500 cursor-pointer"
                      />
                      <p className="text-[10px] text-slate-500">
                        {score?.accuracy === 1 && '1: Many grammatical errors'}
                        {score?.accuracy === 2 && '2: Significant syntax flaws'}
                        {score?.accuracy === 3 && '3: Some errors, meaning clear'}
                        {score?.accuracy === 4 && '4: Minor non-intrusive slips'}
                        {score?.accuracy === 5 && '5: Fully correct & accurate'}
                        {!score && '3: Some errors, meaning clear'}
                      </p>
                    </div>

                    {/* Content */}
                    <div className="space-y-1.5">
                      <label className="flex justify-between text-xs font-medium text-slate-300">
                        <span>Content</span>
                        <span className="font-bold text-blue-400">{score?.content || 3}/5</span>
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={score?.content || 3}
                        onChange={(e) =>
                          handleScoreChange(
                            resp?.id || '',
                            q.id,
                            'content',
                            parseInt(e.target.value)
                          )
                        }
                        className="w-full accent-blue-500 cursor-pointer"
                      />
                      <p className="text-[10px] text-slate-500">
                        {score?.content === 1 && '1: Off-topic / empty answer'}
                        {score?.content === 2 && '2: Incomplete or distorted'}
                        {score?.content === 3 && '3: Partly relevant content'}
                        {score?.content === 4 && '4: Well organized & relevant'}
                        {score?.content === 5 && '5: Thorough, articulate, well structured'}
                        {!score && '3: Partly relevant'}
                      </p>
                    </div>
                  </div>

                  {/* Notes for this question */}
                  <div>
                    <input
                      type="text"
                      placeholder="Add examiner notes for this response (optional)..."
                      value={score?.notes || ''}
                      onChange={(e) => handleNotesChange(q.id, resp?.id || '', e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Overall Examiner Notes Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
        <h3 className="text-base font-bold text-white">Overall Assessment Summary &amp; Recommendations</h3>
        <textarea
          rows={3}
          value={overallNotes}
          onChange={(e) => setOverallNotes(e.target.value)}
          placeholder="Enter qualitative comments, candidate strengths, areas for vocabulary improvement, and final hiring / placement recommendations..."
          className="w-full p-3.5 bg-slate-800/80 border border-slate-700 rounded-2xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSaveAllScores}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm rounded-xl flex items-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save All Scores &amp; Overall Notes</span>
          </button>
        </div>
      </div>

      {/* Delete Candidate Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-rose-500/40 rounded-2xl p-6 text-white space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-center text-white">Delete Candidate Data?</h3>
            <p className="text-xs text-slate-300 text-center leading-relaxed">
              This action cannot be undone. It will permanently remove all audio recordings, proctoring events, and scores for{' '}
              <strong className="text-white">{candidate.full_name}</strong>.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCandidate}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl shadow-lg"
              >
                Yes, Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
