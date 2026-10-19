import JSZip from 'jszip';
import { Candidate, CandidateResponse, Question, Score } from '../types';

// Helper to sanitize filenames
function sanitizeFileName(str: string): string {
  return str.replace(/[^a-zA-Z0-9_-]/g, '_');
}

// Download single audio recording file
export function downloadSingleRecording(
  blob: Blob,
  candidateName: string,
  questionOrder: number,
  sectionTitle: string
): void {
  const safeName = sanitizeFileName(candidateName);
  const safeSection = sanitizeFileName(sectionTitle);
  const orderPadded = String(questionOrder).padStart(2, '0');
  const filename = `${safeName}_Q${orderPadded}_${safeSection}.webm`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Build scores.csv text for candidate
export function generateCandidateScoresCsv(
  candidate: Candidate,
  questions: Question[],
  scores: Score[],
  responses: CandidateResponse[]
): string {
  const headers = [
    'Question Order',
    'Section',
    'Question Type',
    'Prompt / Text',
    'Pronunciation (1-5)',
    'Fluency (1-5)',
    'Accuracy (1-5)',
    'Content (1-5)',
    'Question Average (1-5)',
    'Duration (s)',
    'Examiner Notes',
  ];

  const rows = questions.map((q) => {
    const sc = scores.find((s) => s.question_id === q.id);
    const resp = responses.find((r) => r.question_id === q.id);
    const promptClean = (q.display_text || q.audio_script || '').replace(/"/g, '""');

    const p = sc ? sc.pronunciation : '';
    const f = sc ? sc.fluency : '';
    const a = sc ? sc.accuracy : '';
    const c = sc ? sc.content : '';
    const avg = sc ? ((sc.pronunciation + sc.fluency + sc.accuracy + sc.content) / 4).toFixed(2) : '';
    const dur = resp ? resp.duration_seconds.toFixed(1) : '';
    const notes = sc?.notes ? `"${sc.notes.replace(/"/g, '""')}"` : '""';

    return [
      q.order_number,
      q.section,
      q.type,
      `"${promptClean}"`,
      p,
      f,
      a,
      c,
      avg,
      dur,
      notes,
    ].join(',');
  });

  const summary = [
    '',
    `"Candidate: ${candidate.full_name}"`,
    `"Test Code: ${candidate.test_code}"`,
    `"Status: ${candidate.status}"`,
    `"Started: ${candidate.started_at}"`,
    `"Submitted: ${candidate.submitted_at || 'N/A'}"`,
    `"Warnings: ${candidate.warning_count}"`,
    `"Total Score: ${candidate.total_score != null ? candidate.total_score + '%' : 'Pending'}"`,
    `"Overall Notes: ${candidate.overall_notes ? candidate.overall_notes.replace(/"/g, '""') : ''}"`,
  ].join('\n');

  return [headers.join(','), ...rows, summary].join('\n');
}

// Build ZIP of all recordings for one candidate
export async function createCandidateZip(
  candidate: Candidate,
  questions: Question[],
  responses: CandidateResponse[],
  scores: Score[],
  onProgress?: (percent: number, status: string) => void
): Promise<Blob> {
  const zip = new JSZip();
  const safeName = sanitizeFileName(candidate.full_name || 'Candidate');
  const folder = zip.folder(`${safeName}_${candidate.test_code}`) || zip;

  onProgress?.(10, 'Generating scores.csv...');
  const csvContent = generateCandidateScoresCsv(candidate, questions, scores, responses);
  folder.file('scores.csv', csvContent);

  const total = responses.length;
  for (let i = 0; i < total; i++) {
    const resp = responses[i];
    const q = questions.find((item) => item.id === resp.question_id);
    const orderPadded = String(resp.question_order).padStart(2, '0');
    const safeSection = sanitizeFileName(q?.section_title || resp.section);
    const filename = `${safeName}_Q${orderPadded}_${safeSection}.webm`;

    onProgress?.(
      Math.round(15 + ((i + 1) / total) * 75),
      `Adding recording ${i + 1} of ${total} (${filename})...`
    );

    folder.file(filename, resp.audio_blob);
  }

  onProgress?.(95, 'Compressing archive...');
  const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
    onProgress?.(Math.round(95 + (metadata.percent / 100) * 5), 'Finalizing archive...');
  });

  onProgress?.(100, 'Done');
  return zipBlob;
}

// Build bulk ZIP for multiple candidates
export async function createBulkCandidatesZip(
  candidates: Candidate[],
  questions: Question[],
  getResponsesAndScoresForCandidate: (candidateId: string) => Promise<{
    responses: CandidateResponse[];
    scores: Score[];
  }>,
  onProgress?: (percent: number, status: string) => void
): Promise<Blob> {
  const zip = new JSZip();
  const total = candidates.length;

  for (let i = 0; i < total; i++) {
    const cand = candidates[i];
    const safeName = sanitizeFileName(cand.full_name || 'Candidate');
    const candFolder = zip.folder(`${safeName}_${cand.test_code}`) || zip;

    onProgress?.(
      Math.round((i / total) * 90),
      `Processing candidate ${i + 1} of ${total} (${cand.full_name})...`
    );

    const { responses, scores } = await getResponsesAndScoresForCandidate(cand.id);

    // Add scores.csv
    const csvContent = generateCandidateScoresCsv(cand, questions, scores, responses);
    candFolder.file('scores.csv', csvContent);

    // Add recordings
    for (const resp of responses) {
      const q = questions.find((item) => item.id === resp.question_id);
      const orderPadded = String(resp.question_order).padStart(2, '0');
      const safeSection = sanitizeFileName(q?.section_title || resp.section);
      const filename = `${safeName}_Q${orderPadded}_${safeSection}.webm`;
      candFolder.file(filename, resp.audio_blob);
    }
  }

  onProgress?.(92, 'Creating master ZIP bundle...');
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  onProgress?.(100, 'Complete');
  return zipBlob;
}

// Download Candidate Report CSV (Step 7 requirement)
export function downloadCandidatesReportCsv(
  candidates: Candidate[],
  allScores: Score[],
  questions: Question[]
): void {
  const headers = [
    'Candidate Name',
    'Test Code',
    'Started At',
    'Submitted At',
    'Status',
    'Warnings Count',
    'Section A (Read Aloud)',
    'Section B (Repeat)',
    'Section C (Short Answer)',
    'Section D (Sentence Build)',
    'Section E (Story Retell)',
    'Section F (Open Question)',
    'Total Score (%)',
    'Overall Notes',
  ];

  const rows = candidates.map((c) => {
    const candScores = allScores.filter((s) => s.candidate_id === c.id);

    // Compute averages per section
    const getSectionAvg = (sec: string) => {
      const secQIds = questions.filter((q) => q.section === sec).map((q) => q.id);
      const matchingScores = candScores.filter((s) => secQIds.includes(s.question_id));
      if (!matchingScores.length) return 'N/A';
      const sum = matchingScores.reduce(
        (acc, curr) => acc + (curr.pronunciation + curr.fluency + curr.accuracy + curr.content) / 4,
        0
      );
      return (sum / matchingScores.length).toFixed(2);
    };

    return [
      `"${(c.full_name || '').replace(/"/g, '""')}"`,
      `"${c.test_code}"`,
      `"${c.started_at ? new Date(c.started_at).toLocaleString() : ''}"`,
      `"${c.submitted_at ? new Date(c.submitted_at).toLocaleString() : ''}"`,
      `"${c.status}"`,
      c.warning_count,
      getSectionAvg('A'),
      getSectionAvg('B'),
      getSectionAvg('C'),
      getSectionAvg('D'),
      getSectionAvg('E'),
      getSectionAvg('F'),
      c.total_score != null ? `${c.total_score}%` : 'N/A',
      `"${(c.overall_notes || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Dimension_Education_Report_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
