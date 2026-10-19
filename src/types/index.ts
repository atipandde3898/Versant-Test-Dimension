export type SectionLetter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export type QuestionType =
  | 'read_aloud'
  | 'repeat'
  | 'short_answer'
  | 'sentence_build'
  | 'retell'
  | 'open';

export interface Question {
  id: string;
  section: SectionLetter;
  section_title: string;
  order_number: number;
  type: QuestionType;
  display_text: string;
  instructions: string;
  audio_url?: string; // audio data url or prompt
  audio_blob?: Blob;
  audio_script?: string; // script read by TTS or audio prompt
  time_limit_seconds: number;
  active: boolean;
}

export type CandidateStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'auto_submitted';

export interface Candidate {
  id: string;
  full_name: string;
  email?: string;
  test_code: string;
  status: CandidateStatus;
  warning_count: number;
  started_at: string;
  submitted_at?: string;
  total_score?: number; // 0 - 100 percentage
  overall_notes?: string;
  current_question_index?: number;
}

export interface TestCode {
  id: string;
  code: string;
  candidate_name?: string;
  used: boolean;
  used_by_candidate_id?: string;
  created_at: string;
}

export interface CandidateResponse {
  id: string;
  candidate_id: string;
  question_id: string;
  question_order: number;
  section: SectionLetter;
  audio_blob: Blob;
  audio_mime_type: string;
  duration_seconds: number;
  recorded_at: string;
}

export interface Score {
  id: string;
  response_id: string;
  candidate_id: string;
  question_id: string;
  pronunciation: number; // 1-5
  fluency: number; // 1-5
  accuracy: number; // 1-5
  content: number; // 1-5
  notes?: string;
  updated_at: string;
}

export type ProctorEventType = 'tab_switch' | 'fullscreen_exit' | 'auto_submit';

export interface ProctorEvent {
  id: string;
  candidate_id: string;
  event_type: ProctorEventType;
  question_id?: string;
  question_order?: number;
  created_at: string;
  details?: string;
}

export interface SectionSummary {
  section: SectionLetter;
  title: string;
  question_count: number;
  pronunciation_avg: number;
  fluency_avg: number;
  accuracy_avg: number;
  content_avg: number;
  overall_avg: number; // 1-5
}
