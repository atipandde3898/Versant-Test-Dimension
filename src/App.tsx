/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Candidate, Question } from './types';
import { dbService } from './services/db';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { MobileWarningBanner } from './components/MobileWarningBanner';

// Candidate views
import { CandidateWelcome } from './components/candidate/CandidateWelcome';
import { CandidateInstructions } from './components/candidate/CandidateInstructions';
import { CandidateTestScreen } from './components/candidate/CandidateTestScreen';
import { CandidateThankYou } from './components/candidate/CandidateThankYou';

// Admin views
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { CandidateDetail } from './components/admin/CandidateDetail';
import { TestCodesManager } from './components/admin/TestCodesManager';
import { QuestionsManager } from './components/admin/QuestionsManager';

type CandidateStep = 'welcome' | 'instructions' | 'test' | 'thank_you';
type AdminStep = 'dashboard' | 'candidate_detail' | 'test_codes' | 'questions';

export default function App() {
  const [currentView, setCurrentView] = useState<'candidate' | 'admin'>('candidate');

  // Candidate State
  const [candidateStep, setCandidateStep] = useState<CandidateStep>('welcome');
  const [activeCandidate, setActiveCandidate] = useState<Candidate | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  // Admin State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return sessionStorage.getItem('dimension_edu_admin_session') === 'true';
  });
  const [adminStep, setAdminStep] = useState<AdminStep>('dashboard');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  // Check URL query parameters for direct admin navigation or prefilled test code
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === 'true') {
      setCurrentView('admin');
    }

    // Load active questions
    dbService.getQuestions().then((list) => {
      setQuestions(list.filter((q) => q.active));
    });

    // Check if there is an active candidate session stored
    const storedCandId = localStorage.getItem('dimension_edu_active_candidate_id');
    if (storedCandId) {
      dbService.getCandidateById(storedCandId).then((cand) => {
        if (cand && (cand.status === 'in_progress' || cand.status === 'not_started')) {
          setActiveCandidate(cand);
          setCandidateStep('test');
        }
      });
    }
  }, []);

  // Sync active candidate to localStorage for mid-test refresh recovery
  const handleCandidateStartInstructions = (candidate: Candidate) => {
    setActiveCandidate(candidate);
    localStorage.setItem('dimension_edu_active_candidate_id', candidate.id);
    setCandidateStep('instructions');
  };

  const handleStartCandidateTest = () => {
    setCandidateStep('test');
  };

  const handleCompleteCandidateTest = (candidate: Candidate) => {
    localStorage.removeItem('dimension_edu_active_candidate_id');
    setActiveCandidate(candidate);
    setCandidateStep('thank_you');
  };

  const handleAutoSubmitCandidateTest = (candidate: Candidate) => {
    localStorage.removeItem('dimension_edu_active_candidate_id');
    setActiveCandidate(candidate);
    setCandidateStep('thank_you');
  };

  const handleResetCandidate = () => {
    localStorage.removeItem('dimension_edu_active_candidate_id');
    setActiveCandidate(null);
    setCandidateStep('welcome');
  };

  // Admin Navigation Handlers
  const handleAdminLoginSuccess = () => {
    sessionStorage.setItem('dimension_edu_admin_session', 'true');
    setIsAdminLoggedIn(true);
    setAdminStep('dashboard');
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('dimension_edu_admin_session');
    setIsAdminLoggedIn(false);
  };

  const handleSelectCandidateToScore = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setAdminStep('candidate_detail');
  };

  const inCandidateLiveTest = currentView === 'candidate' && candidateStep === 'test';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Banner for Mobile Devices */}
      {!inCandidateLiveTest && <MobileWarningBanner />}

      {/* Main Header */}
      <Header
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          if (view === 'admin') {
            setAdminStep('dashboard');
          }
        }}
        candidateName={activeCandidate?.full_name}
        inTestMode={inCandidateLiveTest}
        warningsCount={activeCandidate?.warning_count || 0}
      />

      {/* Main Container */}
      <main className="flex-1 flex flex-col">
        {currentView === 'candidate' ? (
          /* --- Candidate Flow --- */
          <>
            {candidateStep === 'welcome' && (
              <CandidateWelcome onSuccess={handleCandidateStartInstructions} />
            )}

            {candidateStep === 'instructions' && activeCandidate && (
              <CandidateInstructions
                candidate={activeCandidate}
                onStartTest={handleStartCandidateTest}
              />
            )}

            {candidateStep === 'test' && activeCandidate && questions.length > 0 && (
              <CandidateTestScreen
                candidate={activeCandidate}
                questions={questions}
                onComplete={handleCompleteCandidateTest}
                onAutoSubmit={handleAutoSubmitCandidateTest}
              />
            )}

            {candidateStep === 'thank_you' && activeCandidate && (
              <CandidateThankYou
                candidate={activeCandidate}
                onReset={handleResetCandidate}
                onGoToAdmin={() => {
                  setCurrentView('admin');
                  setAdminStep('dashboard');
                }}
              />
            )}
          </>
        ) : (
          /* --- Admin Flow --- */
          <>
            {!isAdminLoggedIn ? (
              <AdminLogin onLoginSuccess={handleAdminLoginSuccess} />
            ) : adminStep === 'dashboard' ? (
              <AdminDashboard
                onSelectCandidate={handleSelectCandidateToScore}
                onLogout={handleAdminLogout}
                onNavigateToCodes={() => setAdminStep('test_codes')}
                onNavigateToQuestions={() => setAdminStep('questions')}
              />
            ) : adminStep === 'candidate_detail' && selectedCandidate ? (
              <CandidateDetail
                candidate={selectedCandidate}
                onBack={() => setAdminStep('dashboard')}
                onCandidateDeleted={() => {
                  setSelectedCandidate(null);
                  setAdminStep('dashboard');
                }}
                onCandidateUpdated={(updated) => setSelectedCandidate(updated)}
              />
            ) : adminStep === 'test_codes' ? (
              <TestCodesManager onBack={() => setAdminStep('dashboard')} />
            ) : adminStep === 'questions' ? (
              <QuestionsManager onBack={() => setAdminStep('dashboard')} />
            ) : (
              <AdminDashboard
                onSelectCandidate={handleSelectCandidateToScore}
                onLogout={handleAdminLogout}
                onNavigateToCodes={() => setAdminStep('test_codes')}
                onNavigateToQuestions={() => setAdminStep('questions')}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      {!inCandidateLiveTest && <Footer />}
    </div>
  );
}
