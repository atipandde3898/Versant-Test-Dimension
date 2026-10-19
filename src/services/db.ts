import {
  Candidate,
  CandidateResponse,
  ProctorEvent,
  Question,
  Score,
  TestCode,
} from '../types';
import { createSyntheticAudioBlob } from './audioUtils';

const DB_NAME = 'dimension_edu_verbal_test_db';
const DB_VERSION = 1;

export const DEFAULT_QUESTIONS: Question[] = [
  // Section A: Read Aloud (3 questions, 20 sec)
  {
    id: 'q_a1',
    section: 'A',
    section_title: 'Read Aloud',
    order_number: 1,
    type: 'read_aloud',
    display_text: 'The new library opens at nine o\'clock every morning.',
    instructions: 'Read the sentence shown on screen clearly at a natural pace.',
    time_limit_seconds: 20,
    active: true,
  },
  {
    id: 'q_a2',
    section: 'A',
    section_title: 'Read Aloud',
    order_number: 2,
    type: 'read_aloud',
    display_text: 'Please submit your assignment before the end of the week.',
    instructions: 'Read the sentence shown on screen clearly at a natural pace.',
    time_limit_seconds: 20,
    active: true,
  },
  {
    id: 'q_a3',
    section: 'A',
    section_title: 'Read Aloud',
    order_number: 3,
    type: 'read_aloud',
    display_text: 'Communication skills are important in every profession.',
    instructions: 'Read the sentence shown on screen clearly at a natural pace.',
    time_limit_seconds: 20,
    active: true,
  },

  // Section B: Repeat (4 questions, 15 sec)
  {
    id: 'q_b1',
    section: 'B',
    section_title: 'Repeat',
    order_number: 4,
    type: 'repeat',
    display_text: '',
    instructions: 'Listen carefully to the sentence. When recording begins, repeat it exactly as you heard it.',
    audio_script: 'I usually walk to work.',
    time_limit_seconds: 15,
    active: true,
  },
  {
    id: 'q_b2',
    section: 'B',
    section_title: 'Repeat',
    order_number: 5,
    type: 'repeat',
    display_text: '',
    instructions: 'Listen carefully to the sentence. When recording begins, repeat it exactly as you heard it.',
    audio_script: 'The meeting has been moved to Thursday afternoon.',
    time_limit_seconds: 15,
    active: true,
  },
  {
    id: 'q_b3',
    section: 'B',
    section_title: 'Repeat',
    order_number: 6,
    type: 'repeat',
    display_text: '',
    instructions: 'Listen carefully to the sentence. When recording begins, repeat it exactly as you heard it.',
    audio_script: 'Could you please send me the updated schedule?',
    time_limit_seconds: 15,
    active: true,
  },
  {
    id: 'q_b4',
    section: 'B',
    section_title: 'Repeat',
    order_number: 7,
    type: 'repeat',
    display_text: '',
    instructions: 'Listen carefully to the sentence. When recording begins, repeat it exactly as you heard it.',
    audio_script: 'She has been learning English for three years.',
    time_limit_seconds: 15,
    active: true,
  },

  // Section C: Short Answer (4 questions, 15 sec)
  {
    id: 'q_c1',
    section: 'C',
    section_title: 'Short Answer',
    order_number: 8,
    type: 'short_answer',
    display_text: '',
    instructions: 'Listen to the question. Answer with a word or short phrase.',
    audio_script: 'What do you use to write on paper?',
    time_limit_seconds: 15,
    active: true,
  },
  {
    id: 'q_c2',
    section: 'C',
    section_title: 'Short Answer',
    order_number: 9,
    type: 'short_answer',
    display_text: '',
    instructions: 'Listen to the question. Answer with a word or short phrase.',
    audio_script: 'How many days are there in a week?',
    time_limit_seconds: 15,
    active: true,
  },
  {
    id: 'q_c3',
    section: 'C',
    section_title: 'Short Answer',
    order_number: 10,
    type: 'short_answer',
    display_text: '',
    instructions: 'Listen to the question. Answer with a word or short phrase.',
    audio_script: 'Which is bigger, an elephant or a cat?',
    time_limit_seconds: 15,
    active: true,
  },
  {
    id: 'q_c4',
    section: 'C',
    section_title: 'Short Answer',
    order_number: 11,
    type: 'short_answer',
    display_text: '',
    instructions: 'Listen to the question. Answer with a word or short phrase.',
    audio_script: 'Where do people usually go to buy medicine?',
    time_limit_seconds: 15,
    active: true,
  },

  // Section D: Sentence Build (3 questions, 20 sec)
  {
    id: 'q_d1',
    section: 'D',
    section_title: 'Sentence Build',
    order_number: 12,
    type: 'sentence_build',
    display_text: '',
    instructions: 'You will hear jumbled phrases. Rearrange them and say the correct sentence.',
    audio_script: 'to the market ... went ... yesterday ... she',
    time_limit_seconds: 20,
    active: true,
  },
  {
    id: 'q_d2',
    section: 'D',
    section_title: 'Sentence Build',
    order_number: 13,
    type: 'sentence_build',
    display_text: '',
    instructions: 'You will hear jumbled phrases. Rearrange them and say the correct sentence.',
    audio_script: 'is very important ... for everyone ... good health',
    time_limit_seconds: 20,
    active: true,
  },
  {
    id: 'q_d3',
    section: 'D',
    section_title: 'Sentence Build',
    order_number: 14,
    type: 'sentence_build',
    display_text: '',
    instructions: 'You will hear jumbled phrases. Rearrange them and say the correct sentence.',
    audio_script: 'the report ... by Friday ... must be submitted',
    time_limit_seconds: 20,
    active: true,
  },

  // Section E: Story Retell (1 question, 60 sec)
  {
    id: 'q_e1',
    section: 'E',
    section_title: 'Story Retell',
    order_number: 15,
    type: 'retell',
    display_text: '',
    instructions: 'Listen carefully to the story. Retell what happened in your own words with as much detail as you can remember.',
    audio_script: 'Rahul missed his bus on Monday morning. He decided to take an auto-rickshaw instead. On the way, the auto broke down. Rahul walked the last kilometre and reached the office ten minutes late.',
    time_limit_seconds: 60,
    active: true,
  },

  // Section F: Open Question (2 questions, 45 sec)
  {
    id: 'q_f1',
    section: 'F',
    section_title: 'Open Question',
    order_number: 16,
    type: 'open',
    display_text: 'Describe your daily routine.',
    instructions: 'Read the question and speak about the topic for the full duration.',
    time_limit_seconds: 45,
    active: true,
  },
  {
    id: 'q_f2',
    section: 'F',
    section_title: 'Open Question',
    order_number: 17,
    type: 'open',
    display_text: 'Talk about a person who has influenced you and why.',
    instructions: 'Read the question and speak about the topic for the full duration.',
    time_limit_seconds: 45,
    active: true,
  },
];

class IndexedDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('questions')) {
          const qStore = db.createObjectStore('questions', { keyPath: 'id' });
          qStore.createIndex('order_number', 'order_number', { unique: false });
        }

        if (!db.objectStoreNames.contains('test_codes')) {
          const tcStore = db.createObjectStore('test_codes', { keyPath: 'id' });
          tcStore.createIndex('code', 'code', { unique: true });
        }

        if (!db.objectStoreNames.contains('candidates')) {
          db.createObjectStore('candidates', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('responses')) {
          const rStore = db.createObjectStore('responses', { keyPath: 'id' });
          rStore.createIndex('candidate_id', 'candidate_id', { unique: false });
          rStore.createIndex('question_id', 'question_id', { unique: false });
        }

        if (!db.objectStoreNames.contains('scores')) {
          const sStore = db.createObjectStore('scores', { keyPath: 'id' });
          sStore.createIndex('candidate_id', 'candidate_id', { unique: false });
          sStore.createIndex('response_id', 'response_id', { unique: false });
        }

        if (!db.objectStoreNames.contains('proctor_events')) {
          const peStore = db.createObjectStore('proctor_events', { keyPath: 'id' });
          peStore.createIndex('candidate_id', 'candidate_id', { unique: false });
        }
      };

      request.onsuccess = async () => {
        const db = request.result;
        await this.seedInitialData(db);
        resolve(db);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  private async seedInitialData(db: IDBDatabase): Promise<void> {
    // Check if questions are already present
    const tx = db.transaction(['questions', 'test_codes', 'candidates', 'responses', 'scores', 'proctor_events'], 'readwrite');
    const qStore = tx.objectStore('questions');
    const tcStore = tx.objectStore('test_codes');
    const cStore = tx.objectStore('candidates');
    const rStore = tx.objectStore('responses');
    const sStore = tx.objectStore('scores');
    const peStore = tx.objectStore('proctor_events');

    const countReq = qStore.count();
    countReq.onsuccess = async () => {
      if (countReq.result === 0) {
        // Seed default questions
        for (const q of DEFAULT_QUESTIONS) {
          qStore.put(q);
        }

        // Seed initial test codes
        const initialCodes: TestCode[] = [
          {
            id: 'tc_start1',
            code: 'DE-START1',
            candidate_name: 'Test Candidate',
            used: false,
            created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
          },
          {
            id: 'tc_exam88',
            code: 'DE-EXAM88',
            candidate_name: 'John Miller',
            used: false,
            created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
          },
          {
            id: 'tc_demo01',
            code: 'DE-DEMO01',
            candidate_name: 'Sarah Jenkins',
            used: true,
            used_by_candidate_id: 'cand_demo_01',
            created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
          },
          {
            id: 'tc_demo02',
            code: 'DE-DEMO02',
            candidate_name: 'Vikram Rao',
            used: true,
            used_by_candidate_id: 'cand_demo_02',
            created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
          },
        ];

        for (const tc of initialCodes) {
          tcStore.put(tc);
        }

        // Seed Demo Candidate 1: Sarah Jenkins (Completed, scored 88%)
        const demoCandidate1: Candidate = {
          id: 'cand_demo_01',
          full_name: 'Sarah Jenkins',
          email: 'sarah.j@example.com',
          test_code: 'DE-DEMO01',
          status: 'submitted',
          warning_count: 0,
          started_at: new Date(Date.now() - 86400000 * 2 + 600000).toISOString(),
          submitted_at: new Date(Date.now() - 86400000 * 2 + 1800000).toISOString(),
          total_score: 88,
          overall_notes: 'Strong candidate with clear diction and natural cadence. Minor hesitation on story retell but recovered well.',
          current_question_index: 17,
        };
        cStore.put(demoCandidate1);

        // Seed Demo Candidate 2: Vikram Rao (Auto-submitted due to 2 warnings)
        const demoCandidate2: Candidate = {
          id: 'cand_demo_02',
          full_name: 'Vikram Rao',
          email: 'vikram.r@example.com',
          test_code: 'DE-DEMO02',
          status: 'auto_submitted',
          warning_count: 2,
          started_at: new Date(Date.now() - 86400000 * 1).toISOString(),
          submitted_at: new Date(Date.now() - 86400000 * 1 + 650000).toISOString(),
          total_score: 65,
          overall_notes: 'Exited fullscreen twice during section C. Partial test answers saved.',
          current_question_index: 9,
        };
        cStore.put(demoCandidate2);

        // Proctor events for Vikram Rao
        const pe1: ProctorEvent = {
          id: 'pe_1',
          candidate_id: 'cand_demo_02',
          event_type: 'tab_switch',
          question_id: 'q_b3',
          question_order: 6,
          created_at: new Date(Date.now() - 86400000 * 1 + 250000).toISOString(),
          details: 'Window lost focus (switched tab / browser minimized)',
        };
        const pe2: ProctorEvent = {
          id: 'pe_2',
          candidate_id: 'cand_demo_02',
          event_type: 'fullscreen_exit',
          question_id: 'q_c2',
          question_order: 9,
          created_at: new Date(Date.now() - 86400000 * 1 + 550000).toISOString(),
          details: 'Exited fullscreen mode',
        };
        const pe3: ProctorEvent = {
          id: 'pe_3',
          candidate_id: 'cand_demo_02',
          event_type: 'auto_submit',
          question_id: 'q_c2',
          question_order: 9,
          created_at: new Date(Date.now() - 86400000 * 1 + 550100).toISOString(),
          details: 'Reached 2 proctoring warnings. Automated test submission triggered.',
        };
        peStore.put(pe1);
        peStore.put(pe2);
        peStore.put(pe3);

        // Seed responses & scores for Sarah Jenkins for each question
        for (let i = 0; i < DEFAULT_QUESTIONS.length; i++) {
          const q = DEFAULT_QUESTIONS[i];
          const respId = `resp_demo_01_${q.id}`;
          const synthAudio = createSyntheticAudioBlob(
            Math.min(q.time_limit_seconds, 6),
            320 + i * 20,
            `Sarah_${q.order_number}`
          );

          const resp: CandidateResponse = {
            id: respId,
            candidate_id: 'cand_demo_01',
            question_id: q.id,
            question_order: q.order_number,
            section: q.section,
            audio_blob: synthAudio,
            audio_mime_type: 'audio/wav',
            duration_seconds: Math.min(q.time_limit_seconds, 7.5),
            recorded_at: new Date(Date.now() - 86400000 * 2 + 650000 + i * 60000).toISOString(),
          };
          rStore.put(resp);

          // Scores (mostly 4s and 5s for Sarah)
          const p = i % 3 === 0 ? 5 : 4;
          const f = i % 4 === 0 ? 5 : 4;
          const a = 5;
          const c = i % 2 === 0 ? 5 : 4;
          const score: Score = {
            id: `score_demo_01_${q.id}`,
            response_id: respId,
            candidate_id: 'cand_demo_01',
            question_id: q.id,
            pronunciation: p,
            fluency: f,
            accuracy: a,
            content: c,
            notes: i === 0 ? 'Very crisp enunciation and steady rhythm.' : undefined,
            updated_at: new Date().toISOString(),
          };
          sStore.put(score);
        }

        // Responses for Vikram (up to question 9)
        for (let i = 0; i < 9; i++) {
          const q = DEFAULT_QUESTIONS[i];
          const respId = `resp_demo_02_${q.id}`;
          const synthAudio = createSyntheticAudioBlob(5, 260 + i * 15, `Vikram_${q.order_number}`);
          const resp: CandidateResponse = {
            id: respId,
            candidate_id: 'cand_demo_02',
            question_id: q.id,
            question_order: q.order_number,
            section: q.section,
            audio_blob: synthAudio,
            audio_mime_type: 'audio/wav',
            duration_seconds: 5.2,
            recorded_at: new Date(Date.now() - 86400000 * 1 + 50000 + i * 60000).toISOString(),
          };
          rStore.put(resp);

          const score: Score = {
            id: `score_demo_02_${q.id}`,
            response_id: respId,
            candidate_id: 'cand_demo_02',
            question_id: q.id,
            pronunciation: 3,
            fluency: 3,
            accuracy: 4,
            content: 3,
            notes: 'Moderate pace with slight regional accent.',
            updated_at: new Date().toISOString(),
          };
          sStore.put(score);
        }
      }
    };
  }

  // --- Questions ---
  async getQuestions(): Promise<Question[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('questions', 'readonly');
      const store = tx.objectStore('questions');
      const request = store.getAll();
      request.onsuccess = () => {
        const questions: Question[] = request.result || [];
        questions.sort((a, b) => a.order_number - b.order_number);
        resolve(questions);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveQuestion(question: Question): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('questions', 'readwrite');
      const store = tx.objectStore('questions');
      const request = store.put(question);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async resetQuestionsToDefault(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('questions', 'readwrite');
      const store = tx.objectStore('questions');
      store.clear();
      for (const q of DEFAULT_QUESTIONS) {
        store.put(q);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- Test Codes ---
  async getTestCodes(): Promise<TestCode[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('test_codes', 'readonly');
      const store = tx.objectStore('test_codes');
      const request = store.getAll();
      request.onsuccess = () => {
        const list = request.result || [];
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        resolve(list);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async createTestCode(code: string, candidate_name?: string): Promise<TestCode> {
    const db = await this.getDB();
    const newCode: TestCode = {
      id: 'tc_' + Math.random().toString(36).substring(2, 9),
      code: code.trim().toUpperCase(),
      candidate_name: candidate_name?.trim() || undefined,
      used: false,
      created_at: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction('test_codes', 'readwrite');
      const store = tx.objectStore('test_codes');
      const request = store.add(newCode);
      request.onsuccess = () => resolve(newCode);
      request.onerror = () => reject(new Error('This test code already exists. Please choose a unique code.'));
    });
  }

  async deleteTestCode(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('test_codes', 'readwrite');
      const store = tx.objectStore('test_codes');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async validateTestCode(codeStr: string): Promise<{ valid: boolean; codeRecord?: TestCode; message?: string }> {
    const codes = await this.getTestCodes();
    const cleanCode = codeStr.trim().toUpperCase();
    const found = codes.find((c) => c.code === cleanCode);

    if (!found) {
      return { valid: false, message: 'Invalid test code. Please check with Dimension Education.' };
    }
    if (found.used) {
      return { valid: false, message: 'This test code has already been used. Please request a new one.' };
    }
    return { valid: true, codeRecord: found };
  }

  async markCodeUsed(codeStr: string, candidateId: string): Promise<void> {
    const db = await this.getDB();
    const cleanCode = codeStr.trim().toUpperCase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('test_codes', 'readwrite');
      const store = tx.objectStore('test_codes');
      const index = store.index('code');
      const req = index.get(cleanCode);
      req.onsuccess = () => {
        const item: TestCode = req.result;
        if (item) {
          item.used = true;
          item.used_by_candidate_id = candidateId;
          store.put(item);
        }
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  }

  // --- Candidates ---
  async getCandidates(): Promise<Candidate[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('candidates', 'readonly');
      const store = tx.objectStore('candidates');
      const request = store.getAll();
      request.onsuccess = () => {
        const list = request.result || [];
        list.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
        resolve(list);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getCandidateById(id: string): Promise<Candidate | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('candidates', 'readonly');
      const store = tx.objectStore('candidates');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async createCandidate(candidate: Candidate): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('candidates', 'readwrite');
      const store = tx.objectStore('candidates');
      const request = store.add(candidate);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateCandidate(candidate: Candidate): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('candidates', 'readwrite');
      const store = tx.objectStore('candidates');
      const request = store.put(candidate);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteCandidateData(candidateId: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['candidates', 'responses', 'scores', 'proctor_events'], 'readwrite');
      const cStore = tx.objectStore('candidates');
      const rStore = tx.objectStore('responses');
      const sStore = tx.objectStore('scores');
      const peStore = tx.objectStore('proctor_events');

      cStore.delete(candidateId);

      // Clean responses
      const rIndex = rStore.index('candidate_id');
      const rReq = rIndex.getAllKeys(candidateId);
      rReq.onsuccess = () => {
        for (const key of rReq.result) {
          rStore.delete(key);
        }
      };

      // Clean scores
      const sIndex = sStore.index('candidate_id');
      const sReq = sIndex.getAllKeys(candidateId);
      sReq.onsuccess = () => {
        for (const key of sReq.result) {
          sStore.delete(key);
        }
      };

      // Clean events
      const peIndex = peStore.index('candidate_id');
      const peReq = peIndex.getAllKeys(candidateId);
      peReq.onsuccess = () => {
        for (const key of peReq.result) {
          peStore.delete(key);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- Responses ---
  async getResponsesForCandidate(candidateId: string): Promise<CandidateResponse[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('responses', 'readonly');
      const store = tx.objectStore('responses');
      const index = store.index('candidate_id');
      const request = index.getAll(candidateId);
      request.onsuccess = () => {
        const list: CandidateResponse[] = request.result || [];
        list.sort((a, b) => a.question_order - b.question_order);
        resolve(list);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveResponse(response: CandidateResponse): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('responses', 'readwrite');
      const store = tx.objectStore('responses');
      const request = store.put(response);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Scores ---
  async getScoresForCandidate(candidateId: string): Promise<Score[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('scores', 'readonly');
      const store = tx.objectStore('scores');
      const index = store.index('candidate_id');
      const request = index.getAll(candidateId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveScore(score: Score): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('scores', 'readwrite');
      const store = tx.objectStore('scores');
      const request = store.put(score);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Calculate & update candidate total score
  async recalculateCandidateTotalScore(candidateId: string): Promise<number> {
    const scores = await this.getScoresForCandidate(candidateId);
    if (!scores.length) return 0;

    let sum = 0;
    let count = 0;
    for (const s of scores) {
      const avgOfResponse = (s.pronunciation + s.fluency + s.accuracy + s.content) / 4;
      sum += avgOfResponse;
      count++;
    }

    // Convert 1-5 scale average to a percentage (e.g. 5.0 -> 100%, 1.0 -> 20%)
    const overallAvgOutOf5 = sum / count;
    const totalPercentage = Math.round((overallAvgOutOf5 / 5) * 100);

    const cand = await this.getCandidateById(candidateId);
    if (cand) {
      cand.total_score = totalPercentage;
      await this.updateCandidate(cand);
    }
    return totalPercentage;
  }

  // --- Proctor Events ---
  async getProctorEventsForCandidate(candidateId: string): Promise<ProctorEvent[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('proctor_events', 'readonly');
      const store = tx.objectStore('proctor_events');
      const index = store.index('candidate_id');
      const request = index.getAll(candidateId);
      request.onsuccess = () => {
        const events: ProctorEvent[] = request.result || [];
        events.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        resolve(events);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async logProctorEvent(event: ProctorEvent): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('proctor_events', 'readwrite');
      const store = tx.objectStore('proctor_events');
      const request = store.add(event);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const dbService = new IndexedDatabase();
