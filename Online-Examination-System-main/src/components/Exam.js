import React, { useState, useEffect, useRef } from 'react';
import Timer from './Timer';
import { questions as allQuestions } from '../data/questions';
import './Exam.css';

export default function Exam({ config, onSubmitExam }) {
  const { candidateName, candidateEmail, category, duration, proctoring } = config;

  // Filter questions based on configuration
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionId: optionIndex }
  
  // Proctoring States
  const [violations, setViolations] = useState(0);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [lastViolationReason, setLastViolationReason] = useState('');
  const [proctorLogs, setProctorLogs] = useState([]);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);

  // Refs
  const videoRef = useRef(null);
  const logsEndRef = useRef(null);

  // Initialize Questions
  useEffect(() => {
    let filtered = allQuestions;
    if (category !== 'All') {
      filtered = allQuestions.filter(q => q.category === category);
    }
    // Shuffle questions slightly or just use them
    setQuestions(filtered);

    // Initialize proctor logs
    addProctorLog('Proctoring engine initialized.');
    addProctorLog(`Student ID verified: ${candidateName}`);
    if (proctoring !== 'none') {
      addProctorLog(`Security Mode: ${proctoring.toUpperCase()} active.`);
      startCamera();
      requestFullscreen();
    } else {
      addProctorLog('Security Mode: NONE. Focus monitoring disabled.');
    }

    return () => {
      // Clean up camera stream on unmount
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  // Handle Tab Switch & Window Focus Loss
  useEffect(() => {
    if (proctoring === 'none') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation('Tab Switch Detected (Leaving Exam Window)');
      }
    };

    const handleWindowBlur = () => {
      triggerViolation('Focus Lost (Browser Window De-activated)');
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        triggerViolation('Fullscreen Exited (Standard view mode)');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [violations, proctoring, showViolationModal]);

  // Mock real-time proctor surveillance logs
  useEffect(() => {
    if (proctoring === 'none') return;

    const mockSurveillanceMessages = [
      'Gaze tracking: Focused on screen.',
      'Face count: 1 face detected.',
      'Audio environment: Normal levels.',
      'Biometrics matched: 100% confidence.',
      'Keyboard activity: Stable.',
      'gaze status: Centered.',
      'No secondary screen detected.'
    ];

    const interval = setInterval(() => {
      if (showViolationModal) return;
      const randomMessage = mockSurveillanceMessages[Math.floor(Math.random() * mockSurveillanceMessages.length)];
      addProctorLog(randomMessage);
    }, 12000);

    return () => clearInterval(interval);
  }, [proctoring, showViolationModal]);

  // Scroll proctor logs to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [proctorLogs]);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showViolationModal) return;

      if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        const optionIdx = parseInt(e.key) - 1;
        const currentQuestion = questions[currentIndex];
        if (currentQuestion && optionIdx < currentQuestion.options.length) {
          handleSelectOption(optionIdx);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, questions, showViolationModal]);

  const addProctorLog = (text, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setProctorLogs(prev => [...prev, { timestamp, text, type }]);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      addProctorLog('Camera feed connected. Gaze/Face tracking started.', 'info');
    } catch (err) {
      addProctorLog('Webcam access blocked or unavailable. Falling back to wireframe scan.', 'warn');
      setCameraActive(false);
    }
  };

  const requestFullscreen = () => {
    try {
      const docElm = document.documentElement;
      if (docElm.requestFullscreen) {
        docElm.requestFullscreen();
      } else if (docElm.mozRequestFullScreen) {
        docElm.mozRequestFullScreen();
      } else if (docElm.webkitRequestFullScreen) {
        docElm.webkitRequestFullScreen();
      } else if (docElm.msRequestFullscreen) {
        docElm.msRequestFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen request blocked by browser policy.', err);
    }
  };

  const triggerViolation = (reason) => {
    if (showViolationModal) return; // Prevent multiple overlaps instantly

    const newViolationCount = violations + 1;
    setViolations(newViolationCount);
    setLastViolationReason(reason);
    addProctorLog(`SECURITY WARNING: ${reason}`, 'error');

    if (proctoring === 'strict' && newViolationCount >= 3) {
      addProctorLog('CRITICAL: Violation limit reached. Terminating session.', 'error');
      // Submit immediately
      setTimeout(() => {
        handleFinalSubmit(true); // pass true for terminated
      }, 1500);
      return;
    }

    setShowViolationModal(true);
  };

  const handleDismissViolation = () => {
    setShowViolationModal(false);
    if (proctoring !== 'none') {
      requestFullscreen();
      addProctorLog('Candidate resumed examination.', 'info');
    }
  };

  const handleSelectOption = (optionIndex) => {
    const q = questions[currentIndex];
    setAnswers(prev => ({
      ...prev,
      [q.id]: optionIndex
    }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleJumpToQuestion = (index) => {
    setCurrentIndex(index);
  };

  const handleFinalSubmit = (terminated = false) => {
    // Calculate grade
    let correctCount = 0;
    let unansweredCount = 0;
    let incorrectCount = 0;

    questions.forEach(q => {
      const chosen = answers[q.id];
      if (chosen === undefined) {
        unansweredCount++;
      } else if (chosen === q.answerIndex) {
        correctCount++;
      } else {
        incorrectCount++;
      }
    });

    const totalCount = questions.length;
    const score = Math.round((correctCount / totalCount) * 100);
    const passed = score >= 60; // 60% passing mark

    const examResult = {
      name: candidateName,
      email: candidateEmail,
      category,
      duration,
      proctoring,
      score,
      passed,
      correctCount,
      incorrectCount,
      unansweredCount,
      totalCount,
      answers,
      questions,
      date: new Date().toISOString(),
      terminated,
      violations
    };

    // Save to LocalStorage history
    const storedHistory = localStorage.getItem('aero_exam_history');
    const historyList = storedHistory ? JSON.parse(storedHistory) : [];
    historyList.push(examResult);
    localStorage.setItem('aero_exam_history', JSON.stringify(historyList));

    // Release camera stream
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }

    // Exit fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(err => console.log(err));
    }

    onSubmitExam(examResult);
  };

  if (questions.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <h2 style={{ color: 'var(--text-secondary)' }}>Loading Exam Assets...</h2>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const progressPercent = Math.round((answeredCount / questions.length) * 100);

  return (
    <div className="exam-layout animate-fade-in">
      {/* Left Sidebar: Proctor & Nav Circles */}
      <aside className="exam-sidebar">
        {/* Real-time Proctor Panel */}
        <section className="glass-panel proctor-panel">
          <div className="proctor-header">
            <span className={`status-dot ${violations > 0 ? 'danger' : ''}`}></span>
            AI Proctor Feed
          </div>

          <div className="webcam-container">
            {cameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="webcam-video"
              />
            ) : (
              <div className="webcam-fallback">
                <div className="scanner-overlay"></div>
                <svg className="face-wireframe" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" strokeWidth="1.5">
                  <path d="M12 2a5 5 0 0 0-5 5v3a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5z"></path>
                  <path d="M4 19a8 8 0 0 1 16 0"></path>
                  <circle cx="9" cy="8" r="1" fill="currentColor"></circle>
                  <circle cx="15" cy="8" r="1" fill="currentColor"></circle>
                  <path d="M12 12v2"></path>
                </svg>
              </div>
            )}
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
            Violations: <strong style={{ color: violations > 0 ? 'var(--accent-danger)' : '#fff' }}>{violations}/3</strong>
          </div>

          {/* Scrolling System Console Logs */}
          <div className="proctor-logs">
            {proctorLogs.map((log, index) => (
              <div key={index} className={`log-entry ${log.type === 'warn' ? 'warn' : log.type === 'error' ? 'error' : ''}`}>
                [{log.timestamp}] {log.text}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </section>

        {/* Quick Question Selector */}
        <section className="glass-panel">
          <h3 style={{ fontSize: '15px', marginBottom: '15px', fontWeight: 600 }}>Exam Progress</h3>
          <div className="question-grid">
            {questions.map((q, idx) => (
              <button
                key={idx}
                className={`question-nav-dot ${currentIndex === idx ? 'active' : ''} ${answers[q.id] !== undefined ? 'answered' : ''}`}
                onClick={() => handleJumpToQuestion(idx)}
              >
                {idx + 1}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '15px' }}>
            <span>● Unanswered</span>
            <span style={{ color: 'var(--accent-primary)' }}>● Answered</span>
          </div>
        </section>
      </aside>

      {/* Right Main Panel: Active Question */}
      <main className="exam-main">
        {/* Status Bar */}
        <div className="glass-panel exam-status-bar">
          <div className="candidate-badge">
            Candidate: <strong>{candidateName}</strong> <span style={{ opacity: 0.6 }}>({candidateEmail})</span>
          </div>
          <Timer
            durationMinutes={duration}
            onTimeExpired={() => handleFinalSubmit(false)}
          />
        </div>

        {/* Progress Fill */}
        <div className="progress-bar-container">
          <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
        </div>

        {/* Active Question Box */}
        <section className="glass-panel question-container">
          <div className="question-header">
            <span className="question-category">{currentQuestion.category}</span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Question <strong>{currentIndex + 1}</strong> of <strong>{questions.length}</strong>
            </span>
          </div>

          <h2 className="question-text">{currentQuestion.question}</h2>

          {/* Options List */}
          <div className="options-stack">
            {currentQuestion.options.map((option, optIdx) => {
              const alphabet = ['A', 'B', 'C', 'D'];
              const isSelected = answers[currentQuestion.id] === optIdx;

              return (
                <div
                  key={optIdx}
                  className={`option-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectOption(optIdx)}
                >
                  <span className="option-index">{alphabet[optIdx]}</span>
                  <span className="option-text">{option}</span>
                </div>
              );
            })}
          </div>

          {/* Navigation & Submit controls */}
          <div className="exam-navigation">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="btn-outline"
              style={{ padding: '10px 18px', fontSize: '14px' }}
            >
              ← Previous
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={handleNext}
                className="btn-outline"
                style={{ padding: '10px 18px', fontSize: '14px' }}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={() => {
                  if (window.confirm("Are you sure you want to submit your exam now?")) {
                    handleFinalSubmit(false);
                  }
                }}
                className="btn-primary"
                style={{ padding: '10px 24px', fontSize: '14px' }}
              >
                Submit Exam
              </button>
            )}
          </div>
        </section>
      </main>

      {/* Focus Loss Warning Overlay modal */}
      {showViolationModal && (
        <div className="violation-overlay">
          <div className="glass-panel violation-card">
            <span className="violation-icon">⚠️</span>
            <h3>Security Violation Detected</h3>
            <p>
              The AI Proctoring engine flagged an event: <br />
              <strong style={{ color: 'var(--accent-danger)' }}>{lastViolationReason}</strong>
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Please maintain focus on the exam tab. In Strict Mode, <strong>3 violations</strong> will terminate the exam. <br />
              Current Count: <strong style={{ color: 'var(--accent-danger)' }}>{violations}/3</strong>
            </p>
            <button
              onClick={handleDismissViolation}
              className="btn-danger"
              style={{ width: '100%', marginTop: '10px' }}
            >
              I Understand & Resume
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
