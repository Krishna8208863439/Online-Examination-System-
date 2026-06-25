import React, { useState, useEffect } from 'react';
import './Dashboard.css';

export default function Dashboard({ onStartExam, onViewResults, onGoToAdmin }) {
  // Candidate Details
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);

  // Exam Configurations
  const [category, setCategory] = useState('All');
  const [duration, setDuration] = useState(10);
  const [proctoring, setProctoring] = useState('standard');

  // Geolocation states
  const [geoStatus, setGeoStatus] = useState('idle'); // idle | loading | granted | denied | error
  const [geoData, setGeoData] = useState(null);
  const [geoError, setGeoError] = useState('');

  // History and Stats
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({
    totalExams: 0,
    avgScore: 0,
    highScore: 0,
    passRate: 0
  });

  // Autosave Check
  const [autosaveData, setAutosaveData] = useState(null);

  useEffect(() => {
    const storedName = localStorage.getItem('aero_student_name');
    const storedEmail = localStorage.getItem('aero_student_email');
    const storedStudentId = localStorage.getItem('aero_student_id');
    if (storedName && storedEmail && storedStudentId) {
      setName(storedName);
      setEmail(storedEmail);
      setStudentId(storedStudentId);
      setIsRegistered(true);
    }

    const storedHistory = localStorage.getItem('aero_exam_history');
    if (storedHistory) {
      const parsedHistory = JSON.parse(storedHistory);
      parsedHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
      setHistory(parsedHistory);
      calculateStats(parsedHistory);
    }

    const storedAutosave = localStorage.getItem('aero_exam_autosave');
    if (storedAutosave) {
      try {
        setAutosaveData(JSON.parse(storedAutosave));
      } catch (e) {
        console.error("Failed to parse autosave data", e);
      }
    }
  }, []);

  const calculateStats = (records) => {
    if (records.length === 0) return;
    const total = records.length;
    let sum = 0, max = 0, passes = 0;
    records.forEach(r => {
      sum += r.score;
      if (r.score > max) max = r.score;
      if (r.score >= 40) passes++; // 40% passing threshold
    });
    setStats({
      totalExams: total,
      avgScore: Math.round(sum / total),
      highScore: max,
      passRate: Math.round((passes / total) * 100)
    });
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !studentId.trim()) return;
    localStorage.setItem('aero_student_name', name);
    localStorage.setItem('aero_student_email', email);
    localStorage.setItem('aero_student_id', studentId);
    setIsRegistered(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('aero_student_name');
    localStorage.removeItem('aero_student_email');
    localStorage.removeItem('aero_student_id');
    setName(''); setEmail(''); setStudentId(''); setIsRegistered(false);
    setGeoStatus('idle'); setGeoData(null);
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear your exam history? This cannot be undone.")) {
      localStorage.removeItem('aero_exam_history');
      setHistory([]);
      setStats({ totalExams: 0, avgScore: 0, highScore: 0, passRate: 0 });
    }
  };

  // ─── Geolocation Logic ───────────────────────────────────────────────────────
  const requestGeolocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('error');
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    setGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoData({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        });
        setGeoStatus('granted');
      },
      (err) => {
        setGeoStatus('denied');
        setGeoError(
          err.code === 1
            ? 'Location access is mandatory to verify exam integrity. Please enable location permissions in your browser settings and try again.'
            : 'Unable to retrieve your location. Please ensure location services are enabled.'
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleStart = () => {
    if (!isRegistered) return;
    if (proctoring !== 'none' && geoStatus !== 'granted') {
      requestGeolocation();
      return;
    }
    onStartExam({
      candidateName: name,
      candidateEmail: email,
      studentId: studentId,
      category,
      duration,
      proctoring,
      geolocation: geoData
    });
  };

  // When geolocation is granted, auto-proceed to exam
  useEffect(() => {
    if (geoStatus === 'granted' && geoData && isRegistered) {
      onStartExam({
        candidateName: name,
        candidateEmail: email,
        studentId: studentId,
        category,
        duration,
        proctoring,
        geolocation: geoData
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoStatus, geoData]);

  return (
    <div className="dashboard-container animate-fade-in">
      <header className="dashboard-header">
        <div>
          <h1 style={{ letterSpacing: '1px' }}>SANJAY GHODAWAT INSTITUTE</h1>
          <p>Official Online Examination & Analytics Portal</p>
        </div>
        <button
          className="btn-outline"
          onClick={onGoToAdmin}
          style={{ fontSize: '13px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          Teacher Portal
        </button>
      </header>

      {/* Stats Cards */}
      <section className="stats-grid">
        <div className="glass-panel stat-card">
          <div className="stat-label">Total Exams Taken</div>
          <div className="stat-value">{stats.totalExams}</div>
        </div>
        <div className="glass-panel stat-card">
          <div className="stat-label">Average Score</div>
          <div className="stat-value">{stats.avgScore}%</div>
        </div>
        <div className="glass-panel stat-card">
          <div className="stat-label">High Score</div>
          <div className="stat-value">{stats.highScore}%</div>
        </div>
        <div className="glass-panel stat-card">
          <div className="stat-label">Pass Rate</div>
          <div className="stat-value">{stats.passRate}%</div>
        </div>
      </section>

      {/* Geolocation Error Banner */}
      {geoStatus === 'denied' && (
        <div className="geo-error-banner animate-slide-up">
          <span style={{ fontSize: '22px' }}>📍</span>
          <div>
            <strong>Location Access Required</strong>
            <p style={{ fontSize: '13px', marginTop: '4px', lineHeight: '1.5', color: 'var(--text-secondary)' }}>{geoError}</p>
          </div>
          <button className="btn-primary" onClick={requestGeolocation} style={{ fontSize: '13px', padding: '8px 16px', whiteSpace: 'nowrap' }}>
            Try Again
          </button>
        </div>
      )}

      {geoStatus === 'loading' && (
        <div className="geo-loading-banner animate-slide-up">
          <div className="geo-spinner"></div>
          <span>Fetching your live location to verify exam integrity…</span>
        </div>
      )}

      {geoStatus === 'granted' && geoData && (
        <div className="geo-success-banner animate-slide-up">
          <span style={{ fontSize: '20px' }}>✅</span>
          <span>Location verified — <strong>{geoData.latitude.toFixed(5)}°N, {geoData.longitude.toFixed(5)}°E</strong> — Launching exam…</span>
        </div>
      )}

      {/* Autosave Resume Alert Banner */}
      {autosaveData && (
        <div className="geo-success-banner animate-slide-up" style={{ background: 'rgba(139, 92, 246, 0.15)', borderColor: 'rgba(139, 92, 246, 0.3)', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>📝</span>
            <div style={{ textAlign: 'left' }}>
              <strong style={{ color: '#fff', fontSize: '15px' }}>In-Progress Exam Attempt Detected</strong>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Candidate: <strong>{autosaveData.candidateName}</strong> ({autosaveData.studentId}) | Category: <strong>{autosaveData.category}</strong> | Remaining: {Math.floor(autosaveData.secondsLeft / 60)}m {autosaveData.secondsLeft % 60}s
              </p>
            </div>
          </div>
          <button 
            className="btn-primary" 
            onClick={() => {
              // Auto-restore details
              localStorage.setItem('aero_student_name', autosaveData.candidateName);
              localStorage.setItem('aero_student_email', autosaveData.candidateEmail);
              localStorage.setItem('aero_student_id', autosaveData.studentId);
              setName(autosaveData.candidateName);
              setEmail(autosaveData.candidateEmail);
              setStudentId(autosaveData.studentId);
              setIsRegistered(true);
              
              onStartExam({
                candidateName: autosaveData.candidateName,
                candidateEmail: autosaveData.candidateEmail,
                studentId: autosaveData.studentId,
                category: autosaveData.category,
                duration: autosaveData.duration,
                proctoring: autosaveData.proctoring,
                geolocation: autosaveData.geolocation,
                resume: true,
                autosave: autosaveData
              });
            }} 
            style={{ fontSize: '13px', padding: '8px 16px', background: 'linear-gradient(135deg, var(--accent-primary) 0%, #7c3aed 100%)' }}
          >
            Resume Exam Attempt →
          </button>
        </div>
      )}

      <div className="dashboard-grid">
        {/* Left Column */}
        <section className="glass-panel">
          {!isRegistered ? (
            <form onSubmit={handleRegister} className="animate-slide-up">
              <h2 className="config-title">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                Candidate Login
              </h2>
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Student ID / Roll Number</label>
                <input type="text" placeholder="Enter your Student ID (e.g. SGI2026101)" value={studentId} onChange={(e) => setStudentId(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <button type="submit" className="btn-primary start-btn">Register & Continue</button>
            </form>
          ) : (
            <div className="animate-slide-up">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Welcome, {name}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>ID: {studentId} | {email}</p>
                </div>
                <button onClick={handleLogout} className="clear-btn" style={{ textDecoration: 'underline' }}>
                  Switch Profile
                </button>
              </div>

              <h2 className="config-title" style={{ marginTop: '20px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                Exam Configurations
              </h2>

              <div className="form-group">
                <label>Select Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="All">All Categories (Mixed)</option>
                  <option value="JavaScript">JavaScript Core</option>
                  <option value="React Development">React Development</option>
                  <option value="CSS & Layout">CSS & Layout</option>
                  <option value="General Web Architecture">General Web Architecture</option>
                  <option value="Custom">Custom Questions</option>
                </select>
              </div>

              <div className="form-group">
                <label>Duration</label>
                <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                  <option value={3}>3 Minutes (Quick Test)</option>
                  <option value={5}>5 Minutes</option>
                  <option value={10}>10 Minutes</option>
                  <option value={15}>15 Minutes</option>
                  <option value={20}>20 Minutes</option>
                </select>
              </div>

              <div className="form-group">
                <label>AI Proctoring Security Level</label>
                <div className="proctor-options">
                  {['none', 'standard', 'strict'].map(level => (
                    <button key={level} type="button" className={`proctor-btn ${proctoring === level ? 'active' : ''}`} onClick={() => setProctoring(level)}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: '1.4' }}>
                  {proctoring === 'none' && '🔒 No browser restrictions or proctor logging active.'}
                  {proctoring === 'standard' && '🛡️ Camera face tracking + tab/focus monitoring. Warnings issued.'}
                  {proctoring === 'strict' && '🔥 Strict face & tab tracking. Auto-submit after 3 violations. Live location required.'}
                </p>
              </div>

              {/* Geo requirements note */}
              {proctoring !== 'none' && (
                <div className="geo-info-note">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-warning)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <span>Live location access is <strong>required</strong> when proctoring is active. You will be prompted on launch.</span>
                </div>
              )}

              <button
                onClick={handleStart}
                className="btn-primary start-btn"
                style={{ marginTop: '15px' }}
                disabled={geoStatus === 'loading'}
              >
                {geoStatus === 'loading' ? 'Fetching Location…' : 'Launch Exam System'}
                {geoStatus !== 'loading' && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                )}
              </button>
            </div>
          )}
        </section>

        {/* Right Column: History */}
        <section className="glass-panel history-card">
          <div className="history-header">
            <h2 className="history-title">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 8v4l3 3"></path>
                <circle cx="12" cy="12" r="9"></circle>
              </svg>
              Recent Examinations
            </h2>
            {history.length > 0 && (
              <button onClick={handleClearHistory} className="clear-btn">Clear All</button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="empty-history animate-fade-in">
              <span className="empty-icon">📂</span>
              <h3>No Exam Records Found</h3>
              <p>Your recent attempts and visual analytics reports will appear here once you take an exam.</p>
            </div>
          ) : (
            <div className="history-table-container animate-fade-in">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Report</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((record, index) => (
                    <tr key={index}>
                      <td>
                        <strong style={{ display: 'block' }}>{record.category}</strong>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          Proctor: <span style={{ textTransform: 'capitalize' }}>{record.proctoring}</span>
                        </span>
                      </td>
                      <td>
                        <strong style={{ fontSize: '16px' }}>{record.score}%</strong>
                        <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>
                          {record.correctCount}/{record.totalCount} correct
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${record.score >= 40 ? 'badge-success' : 'badge-danger'}`}>
                          {record.score >= 40 ? 'Passed' : 'Failed'}
                        </span>
                        {record.terminated && (
                          <span className="badge badge-warning" style={{ marginLeft: '5px' }}>Flagged</span>
                        )}
                      </td>
                      <td>
                        {new Date(record.date).toLocaleDateString(undefined, {
                          month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td>
                        <span className="action-link" onClick={() => onViewResults(record)}>View Analytics</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
