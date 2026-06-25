import React, { useState, useEffect, useRef, useCallback } from 'react';
import Timer from './Timer';
import { questions as staticQuestions } from '../data/questions';
import './Exam.css';

const API_BASE = 'http://localhost:5001/api';

// ── Constants ────────────────────────────────────────────────────────────────
const MAX_VIOLATIONS = 3;
const FACE_AWAY_THRESHOLD_MS = 2000; // 2 seconds before warning triggers
const YAW_THRESHOLD = 0.20;   // head turn left/right (fraction of face width)
const PITCH_THRESHOLD = 0.22; // head tilt up/down (fraction of face height)

export default function Exam({ config, onSubmitExam }) {
  const { candidateName, candidateEmail, studentId, category, duration, proctoring, geolocation, resume = false, autosave = null } = config;

  // Unique session ID for the exam run
  const [sessionId] = useState(() => (resume && autosave && autosave.sessionId) ? autosave.sessionId : `sess_${Date.now()}`);

  // ── Questions ──────────────────────────────────────────────────────────────
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(() => (resume && autosave && autosave.currentIndex) ? autosave.currentIndex : 0);
  const [answers, setAnswers] = useState(() => (resume && autosave && autosave.answers) ? autosave.answers : {}); // { questionId: { optionIndex, optionId } }

  // ── Proctoring States ──────────────────────────────────────────────────────
  const [violations, setViolations] = useState(() => (resume && autosave && autosave.violations) ? autosave.violations : 0);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [lastViolationReason, setLastViolationReason] = useState('');
  const [proctorLogs, setProctorLogs] = useState(() => (resume && autosave && autosave.proctorLogs) ? autosave.proctorLogs : []);
  const [cameraActive, setCameraActive] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const [examLocked, setExamLocked] = useState(false);
  const violationsRef = useRef(0);
  const showViolationModalRef = useRef(false);

  // Track webcam snapshots
  const [uploadedSnapshots, setUploadedSnapshots] = useState(() => (resume && autosave && autosave.uploadedSnapshots) ? autosave.uploadedSnapshots : []);
  const [secondsLeftState, setSecondsLeftState] = useState(() => (resume && autosave && autosave.secondsLeft) ? autosave.secondsLeft : duration * 60);

  // ── Face Tracking States ───────────────────────────────────────────────────
  const [faceWarningVisible, setFaceWarningVisible] = useState(false);
  const [faceWarningCountdown, setFaceWarningCountdown] = useState(5);
  const [faceStatus, setFaceStatus] = useState('centered'); // centered | away | missing
  const faceAwayTimerRef = useRef(null);
  const faceWarningIntervalRef = useRef(null);
  const faceStatusRef = useRef('centered');
  const faceWarningVisibleRef = useRef(false);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const logsEndRef = useRef(null);
  const faceMeshRef = useRef(null);
  const cameraRef = useRef(null);
  const submittedRef = useRef(false);

  // ── Sync refs with state ───────────────────────────────────────────────────
  useEffect(() => { violationsRef.current = violations; }, [violations]);
  useEffect(() => { showViolationModalRef.current = showViolationModal; }, [showViolationModal]);
  useEffect(() => { faceWarningVisibleRef.current = faceWarningVisible; }, [faceWarningVisible]);

  // ── Initialize Questions ───────────────────────────────────────────────────
  useEffect(() => {
    const loadQuestions = async () => {
      let filtered = staticQuestions;
      try {
        const res = await fetch(`${API_BASE}/questions`);
        const data = await res.json();
        if (data.success && data.questions.length > 0) {
          // Convert API questions to match app format
          const apiQs = data.questions.map((q, i) => ({
            id: q.question_id,
            question: q.question_text,
            options: q.options.map(o => o.text),
            optionIds: q.options.map(o => o.option_id),
            answerIndex: q.options.findIndex(o => o.option_id === q.correct_option_id),
            correctOptionId: q.correct_option_id,
            category: q.category,
            explanation: q.explanation,
            isCustom: true
          }));
          if (category === 'Custom') {
            filtered = apiQs;
          } else if (category === 'All') {
            filtered = [...staticQuestions, ...apiQs];
          } else {
            filtered = staticQuestions.filter(q => q.category === category);
          }
        } else if (category !== 'All' && category !== 'Custom') {
          filtered = staticQuestions.filter(q => q.category === category);
        }
      } catch {
        if (category !== 'All') {
          filtered = staticQuestions.filter(q => q.category === category);
        }
      }
      setQuestions(filtered);
    };

    loadQuestions();
    addProctorLog('Proctoring engine initialized.');
    addProctorLog(`Student ID verified: ${candidateName}`);

    if (proctoring !== 'none') {
      addProctorLog(`Security Mode: ${proctoring.toUpperCase()} active.`);
      if (geolocation) {
        addProctorLog(`📍 Location verified: ${geolocation.latitude.toFixed(5)}°, ${geolocation.longitude.toFixed(5)}°`);
      }
      startCamera();
      requestFullscreen();
    } else {
      addProctorLog('Security Mode: NONE. Focus monitoring disabled.');
    }

    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  // ── Tab/Focus Violation Tracking & Security Lockdown ───────────────────────
  useEffect(() => {
    if (proctoring === 'none') return;

    const handleVisibilityChange = () => {
      if (document.hidden) triggerViolation('Tab Switch Detected (Leaving Exam Window)');
    };
    const handleWindowBlur = () => {
      triggerViolation('Focus Lost (Browser Window De-activated)');
    };
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) triggerViolation('Fullscreen Exited');
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      addProctorLog('Right-Click Context Menu Access Blocked', 'warn');
    };

    const handleCopyCutPaste = (e) => {
      e.preventDefault();
      addProctorLog(`Keyboard/Mouse ${e.type.toUpperCase()} Action Blocked`, 'warn');
    };

    const handleLockdownKeyDown = (e) => {
      const isCtrlKey = e.ctrlKey || e.metaKey;
      
      // F12 Developer Tools
      if (e.key === 'F12') {
        e.preventDefault();
        addProctorLog('F12 Developer Tools Access Blocked', 'warn');
        return;
      }

      // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (Inspect Element)
      if (isCtrlKey && e.shiftKey && ['i', 'I', 'j', 'J', 'c', 'C'].includes(e.key)) {
        e.preventDefault();
        addProctorLog('Developer Tools Shortcut Blocked', 'warn');
        return;
      }

      // Ctrl+C, Ctrl+V, Ctrl+X (Copy, Paste, Cut)
      if (isCtrlKey && ['c', 'C', 'v', 'V', 'x', 'X'].includes(e.key)) {
        e.preventDefault();
        addProctorLog(`Keyboard Ctrl+${e.key.toUpperCase()} Command Blocked`, 'warn');
        return;
      }

      // Ctrl+S (Save), Ctrl+U (View Source), Ctrl+P (Print)
      if (isCtrlKey && ['s', 'S', 'u', 'U', 'p', 'P'].includes(e.key)) {
        e.preventDefault();
        addProctorLog(`Keyboard Command Ctrl+${e.key.toUpperCase()} Blocked`, 'warn');
        return;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopyCutPaste);
    document.addEventListener('cut', handleCopyCutPaste);
    document.addEventListener('paste', handleCopyCutPaste);
    window.addEventListener('keydown', handleLockdownKeyDown, { capture: true });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopyCutPaste);
      document.removeEventListener('cut', handleCopyCutPaste);
      document.removeEventListener('paste', handleCopyCutPaste);
      window.removeEventListener('keydown', handleLockdownKeyDown, { capture: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proctoring]);

  // ── Scroll logs to bottom ──────────────────────────────────────────────────
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [proctorLogs]);

  // ── Keyboard nav ───────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showViolationModalRef.current || examLocked) return;
      if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === 'ArrowRight') handleNext();
      else if (['1', '2', '3', '4'].includes(e.key)) {
        const optIdx = parseInt(e.key) - 1;
        const q = questions[currentIndex];
        if (q && optIdx < q.options.length) handleSelectOption(q, optIdx);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, questions, examLocked]);

  const [randomCheckVisible, setRandomCheckVisible] = useState(false);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const addProctorLog = (text, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setProctorLogs(prev => [...prev, { timestamp, text, type }]);
  };

  // Webcam silent snapshot capture
  const captureSnapshot = async (reason) => {
    const video = videoRef.current;
    if (!video || !cameraActive) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

      const res = await fetch(`${API_BASE}/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          image_base64: dataUrl,
          timestamp: new Date().toLocaleTimeString(),
          reason: reason
        })
      });
      const data = await res.json();
      if (data.success) {
        addProctorLog(`📷 Security snapshot saved: ${reason}`, 'info');
        setUploadedSnapshots(prev => [...prev, {
          timestamp: data.timestamp,
          reason: data.reason,
          url: data.url
        }]);
      }
    } catch (err) {
      console.warn('Failed to capture silent webcam snapshot:', err);
    }
  };

  // Auto-Save Effect (Every 30 seconds)
  useEffect(() => {
    if (submittedRef.current) return;
    const interval = setInterval(() => {
      const autosaveState = {
        sessionId,
        candidateName,
        candidateEmail,
        studentId,
        category,
        duration,
        proctoring,
        geolocation,
        answers,
        currentIndex,
        violations: violationsRef.current,
        proctorLogs,
        secondsLeft: secondsLeftState,
        uploadedSnapshots
      };
      localStorage.setItem('aero_exam_autosave', JSON.stringify(autosaveState));
      addProctorLog('Candidate progress auto-saved.', 'info');
    }, 30000);

    return () => clearInterval(interval);
  }, [answers, currentIndex, proctorLogs, secondsLeftState, uploadedSnapshots, sessionId]);

  // Randomized Integrity Checks Effect
  useEffect(() => {
    if (proctoring === 'none' || !cameraActive) return;

    const triggerRandomCheck = () => {
      if (submittedRef.current) return;
      setRandomCheckVisible(true);
      addProctorLog('AI Proctor: Running randomized integrity check.', 'warn');
      
      // Dismiss toast warning after 3.5s and silently capture snapshot
      setTimeout(() => {
        setRandomCheckVisible(false);
        captureSnapshot('Random Gaze Integrity Check');
      }, 3500);
    };

    const scheduleNextCheck = () => {
      const delay = (45 + Math.random() * 45) * 1000; // 45s - 90s
      return setTimeout(() => {
        triggerRandomCheck();
        randomTimer = scheduleNextCheck();
      }, delay);
    };

    let randomTimer = scheduleNextCheck();
    return () => clearTimeout(randomTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraActive, proctoring]);

  // ── Camera & MediaPipe FaceMesh ────────────────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current._stream = stream;
      }
      setCameraActive(true);
      addProctorLog('Camera feed connected. Initializing FaceMesh engine…');
      initFaceMesh();
    } catch (err) {
      addProctorLog('Webcam access denied or unavailable. Face tracking disabled.', 'warn');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (cameraRef.current) {
      try { cameraRef.current.stop(); } catch {}
      cameraRef.current = null;
    }
    if (videoRef.current && videoRef.current._stream) {
      videoRef.current._stream.getTracks().forEach(t => t.stop());
    }
    if (faceMeshRef.current) {
      try { faceMeshRef.current.close(); } catch {}
      faceMeshRef.current = null;
    }
  };

  const initFaceMesh = () => {
    // MediaPipe FaceMesh is loaded globally from CDN in index.html
    if (typeof window.FaceMesh === 'undefined') {
      addProctorLog('FaceMesh library not loaded. Face tracking unavailable.', 'warn');
      return;
    }

    const faceMesh = new window.FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    faceMesh.onResults(onFaceMeshResults);
    faceMeshRef.current = faceMesh;

    if (typeof window.Camera !== 'undefined' && videoRef.current) {
      const camera = new window.Camera(videoRef.current, {
        onFrame: async () => {
          if (faceMeshRef.current && videoRef.current) {
            await faceMeshRef.current.send({ image: videoRef.current });
          }
        },
        width: 320,
        height: 240
      });
      camera.start();
      cameraRef.current = camera;
      addProctorLog('AI Face tracking engine active. Monitoring gaze…', 'info');
    }
  };

  const onFaceMeshResults = useCallback((results) => {
    if (showViolationModalRef.current || proctoring === 'none') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      // No face detected
      handleFaceAway('No face detected in frame');
      setFaceStatus('missing');
      faceStatusRef.current = 'missing';
      return;
    }

    const landmarks = results.multiFaceLandmarks[0];

    // ── Head Pose Estimation via key landmarks ──────────────────────────────
    // Nose tip: 1, Left eye outer: 33, Right eye outer: 263
    // Chin: 152, Forehead: 10
    const noseTip = landmarks[1];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const chin = landmarks[152];
    const forehead = landmarks[10];

    // Face center
    const faceCenterX = (leftEye.x + rightEye.x) / 2;
    const faceCenterY = (forehead.y + chin.y) / 2;

    // Yaw: horizontal deviation of nose from eye midpoint (normalized)
    const eyeWidth = Math.abs(rightEye.x - leftEye.x);
    const yaw = (noseTip.x - faceCenterX) / (eyeWidth || 0.1);

    // Pitch: vertical deviation (nose above/below eye-chin midpoint)
    const faceHeight = Math.abs(chin.y - forehead.y);
    const pitch = (noseTip.y - faceCenterY) / (faceHeight || 0.1);

    // Draw simple gaze indicator on canvas overlay
    ctx.save();
    ctx.strokeStyle = Math.abs(yaw) > YAW_THRESHOLD || Math.abs(pitch) > PITCH_THRESHOLD
      ? 'rgba(239, 68, 68, 0.8)'
      : 'rgba(16, 185, 129, 0.8)';
    ctx.lineWidth = 2;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    ctx.beginPath();
    ctx.arc(cx + yaw * canvas.width * 0.5, cy + pitch * canvas.height * 0.5, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    const isLookingAway = Math.abs(yaw) > YAW_THRESHOLD || Math.abs(pitch) > PITCH_THRESHOLD;

    if (isLookingAway) {
      handleFaceAway(`Gaze deviation detected (yaw: ${(yaw * 100).toFixed(0)}%, pitch: ${(pitch * 100).toFixed(0)}%)`);
      setFaceStatus('away');
      faceStatusRef.current = 'away';
    } else {
      // Face is centered — clear any pending away timer
      if (faceAwayTimerRef.current) {
        clearTimeout(faceAwayTimerRef.current);
        faceAwayTimerRef.current = null;
      }
      if (faceWarningVisibleRef.current) {
        setFaceWarningVisible(false);
        if (faceWarningIntervalRef.current) {
          clearInterval(faceWarningIntervalRef.current);
          faceWarningIntervalRef.current = null;
        }
      }
      setFaceStatus('centered');
      faceStatusRef.current = 'centered';
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proctoring]);

  const handleFaceAway = (reason) => {
    // If already counting down, don't restart
    if (faceAwayTimerRef.current) return;
    if (faceWarningVisibleRef.current) return;
    if (showViolationModalRef.current) return;

    // Start 2-second countdown before triggering warning
    faceAwayTimerRef.current = setTimeout(() => {
      // Show non-blocking face warning overlay with countdown
      if (faceStatusRef.current !== 'centered') {
        setFaceWarningVisible(true);
        faceWarningVisibleRef.current = true;
        setFaceWarningCountdown(5);

        let count = 5;
        faceWarningIntervalRef.current = setInterval(() => {
          count--;
          setFaceWarningCountdown(count);
          if (count <= 0) {
            clearInterval(faceWarningIntervalRef.current);
            faceWarningIntervalRef.current = null;
            setFaceWarningVisible(false);
            faceWarningVisibleRef.current = false;
            triggerViolation(reason || 'Looking away from screen for extended period');
          }
        }, 1000);
      }
      faceAwayTimerRef.current = null;
    }, FACE_AWAY_THRESHOLD_MS);
  };

  const requestFullscreen = () => {
    try {
      const docElm = document.documentElement;
      if (docElm.requestFullscreen) docElm.requestFullscreen();
      else if (docElm.mozRequestFullScreen) docElm.mozRequestFullScreen();
      else if (docElm.webkitRequestFullScreen) docElm.webkitRequestFullScreen();
      else if (docElm.msRequestFullscreen) docElm.msRequestFullscreen();
    } catch (err) {
      console.warn('Fullscreen blocked.', err);
    }
  };

  const triggerViolation = (reason) => {
    if (submittedRef.current) return;
    if (showViolationModalRef.current) return;

    const newCount = violationsRef.current + 1;
    setViolations(newCount);
    violationsRef.current = newCount;
    setLastViolationReason(reason);
    addProctorLog(`⚠️ SECURITY WARNING [${newCount}/${MAX_VIOLATIONS}]: ${reason}`, 'error');

    // Pause timer & lock screen
    setTimerPaused(true);
    setExamLocked(true);

    if (newCount >= MAX_VIOLATIONS) {
      addProctorLog('🔴 CRITICAL: Violation limit reached. Terminating session.', 'error');
      setTimeout(() => handleFinalSubmit(true), 1500);
      return;
    }

    setShowViolationModal(true);
    showViolationModalRef.current = true;
  };

  const handleDismissViolation = () => {
    setShowViolationModal(false);
    showViolationModalRef.current = false;
    setTimerPaused(false);
    setExamLocked(false);
    
    // Capture snapshot immediately after warning modal disappears
    captureSnapshot(lastViolationReason || 'Violation Warning Dismissed');

    if (proctoring !== 'none') {
      requestFullscreen();
      addProctorLog('Candidate resumed examination.', 'info');
    }
  };

  const handleDismissFaceWarning = () => {
    setFaceWarningVisible(false);
    faceWarningVisibleRef.current = false;
    if (faceWarningIntervalRef.current) {
      clearInterval(faceWarningIntervalRef.current);
      faceWarningIntervalRef.current = null;
    }
    if (faceAwayTimerRef.current) {
      clearTimeout(faceAwayTimerRef.current);
      faceAwayTimerRef.current = null;
    }
    addProctorLog('Student acknowledged face-away warning.', 'warn');

    // Capture snapshot immediately after gaze warning disappears
    captureSnapshot('Gaze Warning Dismissed ("I\'m Here")');
  };

  // ── Question Interaction ───────────────────────────────────────────────────
  const handleSelectOption = (question, optIdx) => {
    if (examLocked) return;
    const optionId = question.optionIds ? question.optionIds[optIdx] : ['A', 'B', 'C', 'D'][optIdx];
    setAnswers(prev => ({ ...prev, [question.id]: { optionIndex: optIdx, optionId } }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex(prev => prev + 1);
  };
  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  };
  const handleJumpToQuestion = (index) => setCurrentIndex(index);

  // ── Final Submission ───────────────────────────────────────────────────────
  const handleFinalSubmit = async (terminated = false) => {
    if (submittedRef.current) return;
    submittedRef.current = true;

    // Instantly lock screen inputs
    setExamLocked(true);

    // Clear autosave
    localStorage.removeItem('aero_exam_autosave');

    let correctCount = 0, unansweredCount = 0, incorrectCount = 0;
    let totalMarks = 0;
    let maxMarks = 0;
    const answersForSave = {};

    questions.forEach(q => {
      const qMarks = q.marks ? parseInt(q.marks) : 1;
      maxMarks += qMarks;

      const chosen = answers[q.id];
      if (!chosen) {
        unansweredCount++;
      } else if (chosen.optionIndex === q.answerIndex) {
        correctCount++;
        totalMarks += qMarks;
      } else {
        incorrectCount++;
      }
      if (chosen) answersForSave[q.id] = chosen.optionId;
    });

    const totalCount = questions.length;
    const score = maxMarks > 0 ? Math.round((totalMarks / maxMarks) * 100) : 0;
    const passed = score >= 40; // 40% passing threshold

    const examResult = {
      session_id: sessionId,
      name: candidateName,
      email: candidateEmail,
      studentId: studentId,
      category, duration, proctoring,
      score, passed,
      correctCount, incorrectCount, unansweredCount, totalCount,
      totalMarks, maxMarks,
      answers: Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, v.optionIndex])),
      questions,
      date: new Date().toISOString(),
      terminated, violations: violationsRef.current,
      geolocation,
      snapshots: uploadedSnapshots
    };

    // Save to localStorage history list
    const storedHistory = localStorage.getItem('aero_exam_history');
    const historyList = storedHistory ? JSON.parse(storedHistory) : [];
    historyList.push(examResult);
    localStorage.setItem('aero_exam_history', JSON.stringify(historyList));

    // POST to backend API
    try {
      await fetch(`${API_BASE}/exams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          candidate_name: candidateName,
          candidate_email: candidateEmail,
          student_id: studentId,
          category, duration, proctoring,
          score, passed,
          correct_count: correctCount,
          incorrect_count: incorrectCount,
          unanswered_count: unansweredCount,
          total_count: totalCount,
          total_marks: totalMarks,
          max_marks: maxMarks,
          date: examResult.date,
          terminated,
          violations: violationsRef.current,
          geolocation,
          proctor_logs: proctorLogs,
          answers: answersForSave,
          snapshots: uploadedSnapshots
        })
      });
    } catch {
      console.warn('Could not save exam to backend. Data saved locally.');
    }

    // Cleanup
    stopCamera();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    onSubmitExam(examResult);
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (questions.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <h2 style={{ color: 'var(--text-secondary)' }}>Loading Exam Assets…</h2>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const progressPercent = Math.round((answeredCount / questions.length) * 100);
  const alphabet = ['A', 'B', 'C', 'D'];

  const handleTimerTick = (sec) => {
    setSecondsLeftState(sec);
  };

  return (
    <div className="exam-layout animate-fade-in">
      {/* SGI Branding Header */}
      <header className="exam-branding-header" style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(18, 19, 28, 0.7)', borderBottom: '1px solid var(--glass-border)', padding: '15px 30px', borderRadius: 'var(--radius-md)', marginBottom: '10px', backdropFilter: 'var(--glass-blur)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ padding: '4px 10px', background: 'linear-gradient(135deg, var(--accent-secondary) 0%, var(--accent-primary) 100%)', color: '#fff', fontSize: '11px', fontWeight: 800, borderRadius: '4px', letterSpacing: '1px' }}>SGI</span>
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0, letterSpacing: '0.5px' }}>SANJAY GHODAWAT INSTITUTE</h1>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Session ID: <strong style={{ color: 'var(--accent-secondary)' }}>{sessionId}</strong>
        </div>
      </header>

      {/* ─── Left Sidebar ─────────────────────────────────────────────────── */}
      <aside className="exam-sidebar">
        {/* AI Proctor Feed */}
        <section className="glass-panel proctor-panel">
          <div className="proctor-header">
            <span className={`status-dot ${violations > 0 ? 'danger' : ''}`}></span>
            AI Proctor Feed
            {proctoring !== 'none' && (
              <span style={{
                marginLeft: 'auto', fontSize: '10px', padding: '2px 6px',
                borderRadius: '4px', background: faceStatus === 'centered'
                  ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                color: faceStatus === 'centered' ? 'var(--accent-success)' : 'var(--accent-danger)',
                fontWeight: 700, textTransform: 'uppercase'
              }}>
                {faceStatus === 'centered' ? '● Centered' : faceStatus === 'away' ? '⚠ Away' : '✗ No Face'}
              </span>
            )}
          </div>

          <div className="webcam-container" style={{ position: 'relative' }}>
            {cameraActive ? (
              <>
                <video ref={videoRef} autoPlay playsInline muted className="webcam-video" />
                <canvas
                  ref={canvasRef}
                  width={320} height={240}
                  style={{
                    position: 'absolute', top: 0, left: 0,
                    width: '100%', height: '100%', pointerEvents: 'none'
                  }}
                />
              </>
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
            Violations: <strong style={{ color: violations > 0 ? 'var(--accent-danger)' : '#fff' }}>{violations}/{MAX_VIOLATIONS}</strong>
            {geolocation && (
              <span style={{ display: 'block', marginTop: '4px', color: 'var(--accent-success)', fontSize: '11px' }}>
                📍 {geolocation.latitude.toFixed(4)}°, {geolocation.longitude.toFixed(4)}°
              </span>
            )}
          </div>

          {/* Proctor Logs Console */}
          <div className="proctor-logs">
            {proctorLogs.map((log, index) => (
              <div key={index} className={`log-entry ${log.type === 'warn' ? 'warn' : log.type === 'error' ? 'error' : ''}`}>
                [{log.timestamp}] {log.text}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </section>

        {/* Question Nav Grid */}
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

      {/* ─── Main Exam Panel ───────────────────────────────────────────────── */}
      <main className="exam-main">
        {/* Status Bar */}
        <div className="glass-panel exam-status-bar">
          <div className="candidate-badge">
            Candidate: <strong>{candidateName}</strong> <span style={{ opacity: 0.6 }}>({studentId})</span>
          </div>
          <Timer
            durationMinutes={duration}
            initialSeconds={secondsLeftState}
            paused={timerPaused}
            onTimeExpired={() => handleFinalSubmit(false)}
            onTick={handleTimerTick}
          />
        </div>

        {/* Progress Bar */}
        <div className="progress-bar-container">
          <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
        </div>

        {/* Question Box */}
        <section className="glass-panel question-container">
          <div className="question-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="question-category">{currentQuestion.category}</span>
              {currentQuestion.marks && (
                <span className="question-category" style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-primary)' }}>{currentQuestion.marks} Mark{parseInt(currentQuestion.marks) > 1 ? 's' : ''}</span>
              )}
            </div>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Question <strong>{currentIndex + 1}</strong> of <strong>{questions.length}</strong>
            </span>
          </div>

          <h2 className="question-text">{currentQuestion.question}</h2>

          {/* ── Radio Button Options ─────────────────────────────────────── */}
          <div className="options-stack" role="radiogroup" aria-label={`Question ${currentIndex + 1} options`}>
            {currentQuestion.options.map((option, optIdx) => {
              const optId = currentQuestion.optionIds ? currentQuestion.optionIds[optIdx] : alphabet[optIdx];
              const isSelected = answers[currentQuestion.id]?.optionIndex === optIdx;
              const radioName = `question_${currentQuestion.id}`;

              return (
                <label
                  key={optIdx}
                  htmlFor={`opt_${currentQuestion.id}_${optIdx}`}
                  className={`option-item ${isSelected ? 'selected' : ''}`}
                  style={{ cursor: examLocked ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
                >
                  <input
                    type="radio"
                    id={`opt_${currentQuestion.id}_${optIdx}`}
                    name={radioName}
                    value={optId}
                    checked={isSelected}
                    onChange={() => handleSelectOption(currentQuestion, optIdx)}
                    disabled={examLocked}
                    style={{ display: 'none' }} // visually hidden — styled via label
                  />
                  <span className="option-index">{alphabet[optIdx]}</span>
                  <span className="option-text">{option}</span>
                </label>
              );
            })}
          </div>

          {/* Navigation */}
          <div className="exam-navigation">
            <button onClick={handlePrev} disabled={currentIndex === 0 || examLocked} className="btn-outline" style={{ padding: '10px 18px', fontSize: '14px' }}>
              ← Previous
            </button>

            {currentIndex < questions.length - 1 ? (
              <button onClick={handleNext} disabled={examLocked} className="btn-outline" style={{ padding: '10px 18px', fontSize: '14px' }}>
                Next →
              </button>
            ) : (
              <button
                onClick={() => { if (window.confirm('Are you sure you want to submit your exam now?')) handleFinalSubmit(false); }}
                disabled={examLocked}
                className="btn-primary"
                style={{ padding: '10px 24px', fontSize: '14px' }}
              >
                Submit Exam
              </button>
            )}
          </div>
        </section>
      </main>

      {/* ─── Face Away Warning (Non-blocking) ────────────────────────────── */}
      {faceWarningVisible && (
        <div className="face-warning-toast animate-slide-up">
          <div className="face-warning-content">
            <span style={{ fontSize: '28px' }}>👁️</span>
            <div>
              <strong>Warning: Please look at the screen!</strong>
              <p>Continuous movement away from the screen will auto-submit your exam.</p>
              <div className="face-warning-countdown">
                Auto-flagging in <strong style={{ color: 'var(--accent-danger)' }}>{faceWarningCountdown}s</strong>
              </div>
            </div>
            <button className="btn-outline" onClick={handleDismissFaceWarning} style={{ fontSize: '12px', padding: '6px 12px', whiteSpace: 'nowrap' }}>
              I'm Here
            </button>
          </div>
        </div>
      )}

      {/* ─── Random Gaze Integrity Check Toast (Non-blocking) ────────────────────────────── */}
      {randomCheckVisible && (
        <div className="face-warning-toast animate-slide-up" style={{ bottom: '150px' }}>
          <div className="face-warning-content" style={{ borderColor: 'var(--accent-warning)', boxShadow: '0 8px 32px rgba(245, 158, 11, 0.2)' }}>
            <span style={{ fontSize: '28px' }}>🤖</span>
            <div>
              <strong>Random Gaze Verification</strong>
              <p>AI Gaze integrity check in progress. Please look straight at the camera.</p>
              <div className="face-warning-countdown" style={{ color: 'var(--accent-warning)' }}>
                Verifying system alignment…
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Tab/Focus Violation Modal ────────────────────────────────────── */}
      {showViolationModal && (
        <div className="violation-overlay">
          <div className="glass-panel violation-card">
            <span className="violation-icon">⚠️</span>
            <h3>Security Violation Detected</h3>
            <p>
              The AI Proctoring engine flagged an event:<br />
              <strong style={{ color: 'var(--accent-danger)' }}>{lastViolationReason}</strong>
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Please maintain focus on the exam tab. In Strict Mode, <strong>{MAX_VIOLATIONS} violations</strong> will terminate the exam.<br />
              Current Count: <strong style={{ color: 'var(--accent-danger)' }}>{violations}/{MAX_VIOLATIONS}</strong>
            </p>
            <button onClick={handleDismissViolation} className="btn-danger" style={{ width: '100%', marginTop: '10px' }}>
              I Understand & Resume
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
