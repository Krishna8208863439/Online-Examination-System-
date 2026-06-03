import React, { useState, useEffect } from 'react';
import './Dashboard.css';

export default function Dashboard({ onStartExam, onViewResults }) {
  // Candidate Details
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);

  // Exam Configurations
  const [category, setCategory] = useState('All');
  const [duration, setDuration] = useState(10); // in minutes
  const [proctoring, setProctoring] = useState('standard'); // none, standard, strict

  // History and Stats
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({
    totalExams: 0,
    avgScore: 0,
    highScore: 0,
    passRate: 0
  });

  useEffect(() => {
    // Load student profile if exists
    const storedName = localStorage.getItem('aero_student_name');
    const storedEmail = localStorage.getItem('aero_student_email');
    if (storedName && storedEmail) {
      setName(storedName);
      setEmail(storedEmail);
      setIsRegistered(true);
    }

    // Load exam history
    const storedHistory = localStorage.getItem('aero_exam_history');
    if (storedHistory) {
      const parsedHistory = JSON.parse(storedHistory);
      // Sort by date descending
      parsedHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
      setHistory(parsedHistory);
      calculateStats(parsedHistory);
    }
  }, []);

  const calculateStats = (records) => {
    if (records.length === 0) return;
    
    const total = records.length;
    let sum = 0;
    let max = 0;
    let passes = 0;

    records.forEach(r => {
      sum += r.score;
      if (r.score > max) max = r.score;
      if (r.passed) passes++;
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
    if (!name.trim() || !email.trim()) return;

    localStorage.setItem('aero_student_name', name);
    localStorage.setItem('aero_student_email', email);
    setIsRegistered(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('aero_student_name');
    localStorage.removeItem('aero_student_email');
    setName('');
    setEmail('');
    setIsRegistered(false);
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear your exam history? This cannot be undone.")) {
      localStorage.removeItem('aero_exam_history');
      setHistory([]);
      setStats({
        totalExams: 0,
        avgScore: 0,
        highScore: 0,
        passRate: 0
      });
    }
  };

  const handleStart = () => {
    if (!isRegistered) return;
    onStartExam({
      candidateName: name,
      candidateEmail: email,
      category,
      duration,
      proctoring
    });
  };

  return (
    <div className="dashboard-container animate-fade-in">
      <header className="dashboard-header">
        <h1>AERO GRADE</h1>
        <p>Advanced Examination & Real-Time Performance Analytics System</p>
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

      <div className="dashboard-grid">
        {/* Left Column: Register or Setup */}
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
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn-primary start-btn">
                Register & Continue
              </button>
            </form>
          ) : (
            <div className="animate-slide-up">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Welcome, {name}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{email}</p>
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
                  <button
                    type="button"
                    className={`proctor-btn ${proctoring === 'none' ? 'active' : ''}`}
                    onClick={() => setProctoring('none')}
                  >
                    None
                  </button>
                  <button
                    type="button"
                    className={`proctor-btn ${proctoring === 'standard' ? 'active' : ''}`}
                    onClick={() => setProctoring('standard')}
                  >
                    Standard
                  </button>
                  <button
                    type="button"
                    className={`proctor-btn ${proctoring === 'strict' ? 'active' : ''}`}
                    onClick={() => setProctoring('strict')}
                  >
                    Strict
                  </button>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: '1.4' }}>
                  {proctoring === 'none' && '🔒 No browser restrictions or proctor logging active.'}
                  {proctoring === 'standard' && '🛡️ Tracks tab changes/minimization and triggers warnings.'}
                  {proctoring === 'strict' && '🔥 Strictly terminates and auto-submits exam upon 3 focus/tab violations.'}
                </p>
              </div>

              <button onClick={handleStart} className="btn-primary start-btn" style={{ marginTop: '15px' }}>
                Launch Exam System
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
              </button>
            </div>
          )}
        </section>

        {/* Right Column: History list */}
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
              <button onClick={handleClearHistory} className="clear-btn">
                Clear All
              </button>
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
                        <span className={`badge ${record.passed ? 'badge-success' : 'badge-danger'}`}>
                          {record.passed ? 'Passed' : 'Failed'}
                        </span>
                        {record.terminated && (
                          <span className="badge badge-warning" style={{ marginLeft: '5px' }}>
                            Flagged
                          </span>
                        )}
                      </td>
                      <td>
                        {new Date(record.date).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td>
                        <span className="action-link" onClick={() => onViewResults(record)}>
                          View Analytics
                        </span>
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
