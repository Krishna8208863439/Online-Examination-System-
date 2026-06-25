import React, { useState, useEffect } from 'react';
import './AdminPortal.css';

const API_BASE = 'http://localhost:5001/api';
const CATEGORIES = ['JavaScript', 'React Development', 'CSS & Layout', 'General Web Architecture', 'Custom'];

export default function AdminPortal({ onGoToStudent }) {
  const [activeTab, setActiveTab] = useState('builder'); // builder | audit
  
  // ── Question Builder State ─────────────────────────────────────────────────
  const [customQuestions, setCustomQuestions] = useState([]);
  const [questionText, setQuestionText] = useState('');
  const [category, setCategory] = useState('Custom');
  const [explanation, setExplanation] = useState('');
  const [options, setOptions] = useState([
    { option_id: 'A', text: '' },
    { option_id: 'B', text: '' },
    { option_id: 'C', text: '' },
    { option_id: 'D', text: '' }
  ]);
  const [correctOptionId, setCorrectOptionId] = useState('A');
  const [marks, setMarks] = useState(1);
  const [subject, setSubject] = useState('General');
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [saveStatus, setSaveStatus] = useState(''); // '', 'saving', 'saved', 'error'

  // ── Audit Log State ────────────────────────────────────────────────────────
  const [examSessions, setExamSessions] = useState([]);
  const [expandedSession, setExpandedSession] = useState(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [apiOnline, setApiOnline] = useState(true);

  // ── Question Analytics State ───────────────────────────────────────────────
  const [analyticsData, setAnalyticsData] = useState([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');

  useEffect(() => {
    loadCustomQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === 'audit') loadExamSessions();
    if (activeTab === 'analytics') loadQuestionAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ── API Calls ──────────────────────────────────────────────────────────────
  const loadCustomQuestions = async () => {
    try {
      const res = await fetch(`${API_BASE}/questions`);
      const data = await res.json();
      if (data.success) setCustomQuestions(data.questions);
      setApiOnline(true);
    } catch {
      setApiOnline(false);
    }
  };

  const loadExamSessions = async () => {
    setLoadingAudit(true);
    try {
      const res = await fetch(`${API_BASE}/exams`);
      const data = await res.json();
      if (data.success) setExamSessions(data.sessions);
      setApiOnline(true);
    } catch {
      setApiOnline(false);
    } finally {
      setLoadingAudit(false);
    }
  };

  const loadQuestionAnalytics = async () => {
    setLoadingAnalytics(true);
    setAnalyticsError('');
    try {
      const token = sessionStorage.getItem('authToken');
      const res = await fetch(`${API_BASE}/analytics/question-performance`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setAnalyticsData(data.analytics);
      } else {
        setAnalyticsError(data.error || 'Failed to retrieve analytics.');
      }
      setApiOnline(true);
    } catch {
      setAnalyticsError('API server is offline. Run server.js to view analytics.');
      setApiOnline(false);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // ── Question Builder ───────────────────────────────────────────────────────
  const handleOptionTextChange = (idx, text) => {
    setOptions(prev => prev.map((o, i) => i === idx ? { ...o, text } : o));
  };

  const resetForm = () => {
    setQuestionText('');
    setExplanation('');
    setOptions([
      { option_id: 'A', text: '' },
      { option_id: 'B', text: '' },
      { option_id: 'C', text: '' },
      { option_id: 'D', text: '' }
    ]);
    setCorrectOptionId('A');
    setMarks(1);
    setSubject('General');
    setEditingQuestionId(null);
  };

  const handleSaveQuestion = async () => {
    if (!questionText.trim()) { alert('Please enter a question.'); return; }
    const emptyOptions = options.filter(o => !o.text.trim());
    if (emptyOptions.length > 0) { alert('Please fill in all option texts.'); return; }

    setSaveStatus('saving');
    const questionPayload = {
      question_text: questionText,
      options,
      correct_option_id: correctOptionId,
      category,
      explanation,
      marks: parseInt(marks) || 1,
      subject: subject || category
    };

    try {
      const token = sessionStorage.getItem('authToken');
      let res, data;
      if (editingQuestionId) {
        // Edit mode (UPDATE)
        res = await fetch(`${API_BASE}/questions/${editingQuestionId}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(questionPayload)
        });
        data = await res.json();
        if (data.success) {
          setSaveStatus('saved');
          setCustomQuestions(prev => prev.map(q => q.question_id === editingQuestionId ? data.question : q));
          resetForm();
        }
      } else {
        // Create mode (CREATE)
        res = await fetch(`${API_BASE}/questions`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(questionPayload)
        });
        data = await res.json();
        if (data.success) {
          setSaveStatus('saved');
          setCustomQuestions(prev => [...prev, data.question]);
          resetForm();
        }
      }

      if (!data.success) {
        setSaveStatus('error');
        alert(data.error || 'Failed to save question.');
      }
      setTimeout(() => setSaveStatus(''), 3000);
    } catch {
      setSaveStatus('error');
      alert('API server is offline. Start server.js to save questions.');
      setTimeout(() => setSaveStatus(''), 2000);
    }
  };

  const handleStartEdit = (q) => {
    setQuestionText(q.question_text);
    setExplanation(q.explanation || '');
    setCategory(q.category || 'Custom');
    setMarks(q.marks || 1);
    setSubject(q.subject || q.category || 'General');
    setCorrectOptionId(q.correct_option_id);
    setOptions(q.options.map(o => ({ option_id: o.option_id, text: o.text })));
    setEditingQuestionId(q.question_id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Delete this custom question?')) return;
    try {
      const token = sessionStorage.getItem('authToken');
      const res = await fetch(`${API_BASE}/questions/${questionId}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setCustomQuestions(prev => prev.filter(q => q.question_id !== questionId));
      } else {
        alert(data.error || 'Failed to delete question.');
      }
    } catch {
      alert('Failed to delete: API offline.');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="admin-container animate-fade-in">
      {/* ─── Admin Header ─────────────────────────────────────────────────── */}
      <header className="admin-header">
        <div>
          <h1>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '10px' }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Teacher Portal
          </h1>
          <p>Question Builder & Security Audit Control Center</p>
        </div>
        <button className="btn-danger" onClick={onGoToStudent} style={{ fontSize: '13px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Logout Admin
        </button>
      </header>

      {/* API offline notice */}
      {!apiOnline && (
        <div className="api-offline-banner">
          ⚠️ <strong>API Server Offline</strong> — Run <code>node server.js</code> in your terminal to enable question saving and audit logs. Data shown may be incomplete.
        </div>
      )}

      {/* ─── Tab Switcher ─────────────────────────────────────────────────── */}
      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'builder' ? 'active' : ''}`}
          onClick={() => setActiveTab('builder')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Question Builder
        </button>
        <button
          className={`admin-tab ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          Security Audit Logs
          {examSessions.length > 0 && <span className="tab-badge">{examSessions.length}</span>}
        </button>
        <button
          className={`admin-tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          Question Analytics
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* QUESTION BUILDER TAB                                               */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'builder' && (
        <div className="admin-content">
          {/* Builder Form */}
          <section className="glass-panel builder-form">
            <h2 className="section-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
              {editingQuestionId ? `Edit Question (ID: ${editingQuestionId})` : 'Add New Question'}
            </h2>

            <div className="form-group">
              <label>Question Text <span className="required-star">*</span></label>
              <textarea
                rows={3}
                placeholder="Enter your question here…"
                value={questionText}
                onChange={e => setQuestionText(e.target.value)}
                className="admin-textarea"
              />
            </div>

            <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label>Marks / Points Allocation <span className="required-star">*</span></label>
                <input
                  type="number"
                  min="1"
                  value={marks}
                  onChange={e => setMarks(Math.max(1, parseInt(e.target.value) || 1))}
                  className="admin-select"
                  style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', color: '#fff', borderRadius: 'var(--radius-sm)' }}
                  required
                />
              </div>
              <div>
                <label>Category / Subject Group</label>
                <select value={category} onChange={e => { setCategory(e.target.value); setSubject(e.target.value); }} className="admin-select" style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', color: '#fff', borderRadius: 'var(--radius-sm)' }}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Specific Subject / Tag <span className="label-hint">(e.g. JavaScript Arrays, React Hooks)</span></label>
              <input
                type="text"
                placeholder="e.g. JavaScript Variables"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="admin-select"
                style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', color: '#fff', borderRadius: 'var(--radius-sm)' }}
              />
            </div>

            {/* Options with radio single-correct enforcement */}
            <div className="form-group">
              <label>
                Answer Options <span className="required-star">*</span>
                <span className="label-hint"> — Select the radio button next to the correct answer</span>
              </label>
              <div className="options-builder">
                {options.map((opt, idx) => (
                  <div key={opt.option_id} className={`option-builder-row ${correctOptionId === opt.option_id ? 'correct' : ''}`}>
                    <input
                      type="radio"
                      id={`correct_${opt.option_id}`}
                      name="correct_answer"
                      value={opt.option_id}
                      checked={correctOptionId === opt.option_id}
                      onChange={() => setCorrectOptionId(opt.option_id)}
                      className="correct-radio"
                    />
                    <label htmlFor={`correct_${opt.option_id}`} className="option-letter-label" title="Mark as correct">
                      {opt.option_id}
                    </label>
                    <input
                      type="text"
                      placeholder={`Option ${opt.option_id} text…`}
                      value={opt.text}
                      onChange={e => handleOptionTextChange(idx, e.target.value)}
                      className="option-text-input"
                    />
                    {correctOptionId === opt.option_id && (
                      <span className="correct-badge">✓ Correct</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Explanation <span className="label-hint">(shown to students after exam)</span></label>
              <textarea
                rows={2}
                placeholder="Explain why the correct answer is right…"
                value={explanation}
                onChange={e => setExplanation(e.target.value)}
                className="admin-textarea"
              />
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
              <button
                className={`btn-primary save-btn ${saveStatus === 'saving' ? 'saving' : ''}`}
                onClick={handleSaveQuestion}
                disabled={saveStatus === 'saving'}
                style={{ flex: 1 }}
              >
                {saveStatus === 'saving' && <span className="btn-spinner"></span>}
                {saveStatus === '' && (editingQuestionId ? '✓ Update Question' : '+ Save Question')}
                {saveStatus === 'saving' && 'Saving…'}
                {saveStatus === 'saved' && (editingQuestionId ? '✓ Question Updated!' : '✓ Question Saved!')}
                {saveStatus === 'error' && '✗ Save Failed'}
              </button>

              {editingQuestionId && (
                <button onClick={resetForm} className="btn-outline" style={{ flex: 0.3 }}>
                  Cancel Edit
                </button>
              )}
            </div>
          </section>

          {/* Existing Custom Questions List */}
          <section className="glass-panel">
            <h2 className="section-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
              Custom Question Bank ({customQuestions.length})
            </h2>

            {customQuestions.length === 0 ? (
              <div className="empty-state">
                <span style={{ fontSize: '40px', opacity: 0.4 }}>📋</span>
                <p>No custom questions yet. Use the builder above to add your first one.</p>
              </div>
            ) : (
              <div className="question-list">
                {customQuestions.map((q, idx) => (
                  <div key={q.question_id} className="question-list-item">
                    <div className="question-list-header">
                      <div>
                        <span className="question-list-num">Q{idx + 1}</span>
                        <span className="question-list-category">{q.category}</span>
                        <span className="question-list-category" style={{ marginLeft: '10px', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-primary)' }}>{q.marks || 1} Pt{parseInt(q.marks || 1) > 1 ? 's' : ''}</span>
                        {q.subject && q.subject !== q.category && (
                          <span className="question-list-category" style={{ marginLeft: '10px', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-secondary)' }}>{q.subject}</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button
                          className="edit-btn"
                          onClick={() => handleStartEdit(q)}
                          title="Edit question"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px' }}
                        >
                          ✏️
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => handleDeleteQuestion(q.question_id)}
                          title="Delete question"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px' }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <p className="question-list-text">{q.question_text}</p>
                    <div className="question-list-options">
                      {q.options.map(opt => (
                        <span
                          key={opt.option_id}
                          className={`list-option ${opt.option_id === q.correct_option_id ? 'correct' : ''}`}
                        >
                          <strong>{opt.option_id}.</strong> {opt.text}
                          {opt.option_id === q.correct_option_id && ' ✓'}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* AUDIT LOGS TAB                                                     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'audit' && (
        <div className="admin-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 700 }}>
              All Exam Sessions ({examSessions.length})
            </h2>
            <button className="btn-outline" onClick={loadExamSessions} style={{ fontSize: '13px', padding: '8px 14px' }}>
              🔄 Refresh
            </button>
          </div>

          {loadingAudit ? (
            <div className="glass-panel empty-state">
              <div className="audit-spinner"></div>
              <p>Loading audit records…</p>
            </div>
          ) : examSessions.length === 0 ? (
            <div className="glass-panel empty-state">
              <span style={{ fontSize: '40px', opacity: 0.4 }}>📊</span>
              <p>No exam sessions recorded yet. Sessions appear here after students complete exams.</p>
            </div>
          ) : (
            <div className="audit-list">
              {examSessions.map((session, idx) => {
                const isExpanded = expandedSession === session.session_id;
                const hasViolations = session.violations > 0;
                const mapsUrl = session.geolocation
                  ? `https://www.google.com/maps?q=${session.geolocation.latitude},${session.geolocation.longitude}`
                  : null;

                return (
                  <div key={session.session_id} className={`audit-card glass-panel ${session.terminated ? 'terminated' : ''}`}>
                    {/* Card Header */}
                    <div
                      className="audit-card-header"
                      onClick={() => setExpandedSession(isExpanded ? null : session.session_id)}
                    >
                      <div className="audit-candidate-info">
                        <div className="audit-avatar">
                          {session.candidate_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong className="audit-name">{session.candidate_name}</strong>
                          <span className="audit-email">
                            {session.candidate_email} {session.student_id ? `| ID: ${session.student_id}` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="audit-meta-chips">
                        <span className={`audit-chip score ${session.score >= 40 ? 'pass' : 'fail'}`}>
                          {session.score}% {session.score >= 40 ? '✓' : '✗'}
                        </span>
                        {hasViolations && (
                          <span className="audit-chip violations">
                            ⚠ {session.violations} violation{session.violations > 1 ? 's' : ''}
                          </span>
                        )}
                        {session.terminated && (
                          <span className="audit-chip terminated">
                            🔴 Terminated
                          </span>
                        )}
                        {session.geolocation && (
                          <span className="audit-chip geo">📍 Located</span>
                        )}
                        <span className="audit-chip date">
                          {new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <span className="expand-caret">{isExpanded ? '▲' : '▼'}</span>
                    </div>

                    {/* Expandable Details */}
                    {isExpanded && (
                      <div className="audit-card-body">
                        <div className="audit-detail-grid">
                          {/* Performance Metrics */}
                          <div className="audit-section">
                            <h4>📊 Performance Metrics</h4>
                            <div className="audit-metric-row"><span>Student ID</span><strong>{session.student_id || 'N/A'}</strong></div>
                            <div className="audit-metric-row"><span>Category</span><strong>{session.category}</strong></div>
                            <div className="audit-metric-row"><span>Marks Obtained</span><strong style={{ color: 'var(--accent-primary)' }}>{session.total_marks !== undefined ? `${session.total_marks} / ${session.max_marks}` : `${session.correct_count} / ${session.total_count}`}</strong></div>
                            <div className="audit-metric-row"><span>Correct</span><strong style={{ color: 'var(--accent-success)' }}>{session.correct_count}/{session.total_count} Qs</strong></div>
                            <div className="audit-metric-row"><span>Incorrect</span><strong style={{ color: 'var(--accent-danger)' }}>{session.incorrect_count}</strong></div>
                            <div className="audit-metric-row"><span>Unanswered</span><strong style={{ color: 'var(--accent-warning)' }}>{session.unanswered_count}</strong></div>
                          </div>

                          {/* Geolocation */}
                          <div className="audit-section">
                            <h4>📍 Geolocation Verification</h4>
                            {session.geolocation ? (
                              <>
                                <div className="audit-metric-row">
                                  <span>Latitude</span>
                                  <strong>{session.geolocation.latitude.toFixed(6)}°</strong>
                                </div>
                                <div className="audit-metric-row">
                                  <span>Longitude</span>
                                  <strong>{session.geolocation.longitude.toFixed(6)}°</strong>
                                </div>
                                <div className="audit-metric-row">
                                  <span>Captured</span>
                                  <strong>{new Date(session.geolocation.timestamp).toLocaleTimeString()}</strong>
                                </div>
                                {session.geolocation.accuracy && (
                                  <div className="audit-metric-row">
                                    <span>Accuracy</span>
                                    <strong>±{Math.round(session.geolocation.accuracy)}m</strong>
                                  </div>
                                )}
                                <a
                                  href={mapsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="maps-link"
                                >
                                  🗺 View on Google Maps →
                                </a>
                              </>
                            ) : (
                              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                                No geolocation data recorded (proctoring was set to "None").
                              </p>
                            )}
                          </div>

                          {/* Security Audit */}
                          <div className="audit-section">
                            <h4>🛡 Security Status</h4>
                            <div className="audit-metric-row">
                              <span>Violations</span>
                              <strong style={{ color: hasViolations ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
                                {session.violations}/3
                              </strong>
                            </div>
                            <div className="audit-metric-row">
                              <span>Terminated</span>
                              <strong style={{ color: session.terminated ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
                                {session.terminated ? 'Yes — Auto-submitted' : 'No'}
                              </strong>
                            </div>
                            <div className="audit-metric-row">
                              <span>Integrity</span>
                              <strong style={{ color: !session.terminated && session.violations === 0 ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
                                {!session.terminated && session.violations === 0 ? '✓ Clear' : '⚠ Flagged'}
                              </strong>
                            </div>
                          </div>
                        </div>

                        {/* Proctor Logs Feed */}
                        {session.proctor_logs && session.proctor_logs.length > 0 && (
                          <div className="audit-logs-section">
                            <h4>🖥 AI Proctor Logs ({session.proctor_logs.length} entries)</h4>
                            <div className="audit-logs-console">
                              {session.proctor_logs.map((log, logIdx) => (
                                <div key={logIdx} className={`log-entry ${log.type === 'warn' ? 'warn' : log.type === 'error' ? 'error' : ''}`}>
                                  [{log.timestamp}] {log.text}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Webcam Snapshots Review */}
                        {session.snapshots && session.snapshots.length > 0 && (
                          <div style={{ marginTop: '20px', borderTop: '1px solid var(--glass-border)', paddingTop: '15px' }}>
                            <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>📷 Captured Webcam Snapshots ({session.snapshots.length})</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                              {session.snapshots.map((snap, snapIdx) => (
                                <div key={snapIdx} className="glass-panel" style={{ padding: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                                  <img 
                                    src={snap.url} 
                                    alt={`Violation snapshot ${snapIdx + 1}`} 
                                    style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }} 
                                    onError={(e) => { e.target.src = 'https://placehold.co/180x110/12131c/ffffff?text=Image+Unavailable'; }}
                                  />
                                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-danger)', marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={snap.reason}>{snap.reason}</div>
                                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{snap.timestamp}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* QUESTION ANALYTICS TAB                                            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'analytics' && (
        <div className="admin-content animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header Description */}
          <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--glass-border)' }}>
            <h2 style={{ fontSize: '18px', color: '#fff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
              Question Bank Analytics Engine
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.5 }}>
              This module uses an aggregation pipeline query to cross-reference student responses with the question bank. It identifies which concepts have the lowest success rates so you can tailor your teaching and review sessions.
            </p>
          </div>

          {analyticsError && (
            <div className="api-offline-banner">
              ⚠️ {analyticsError}
            </div>
          )}

          {loadingAnalytics ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
              <span className="login-spinner" style={{ display: 'inline-block', marginRight: '10px' }}></span>
              Aggregating response metrics from SQLite database...
            </div>
          ) : !analyticsError && analyticsData.length === 0 ? (
            <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No student submissions found in database. Analytics will populate once students submit exams.
            </div>
          ) : !analyticsError && (
            <>
              {/* Summary Metrics Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' }}>
                {(() => {
                  const attemptedQuestions = analyticsData.filter(q => q.total_attempts > 0);
                  const totalAttempts = attemptedQuestions.reduce((acc, curr) => acc + curr.total_attempts, 0);
                  const avgSuccess = attemptedQuestions.length > 0 
                    ? Math.round(attemptedQuestions.reduce((acc, curr) => acc + (curr.success_rate || 0), 0) / attemptedQuestions.length)
                    : 0;
                  
                  // Find weakest subject
                  const subjectStats = {};
                  attemptedQuestions.forEach(q => {
                    if (!subjectStats[q.subject]) subjectStats[q.subject] = { correct: 0, total: 0 };
                    subjectStats[q.subject].correct += q.correct_count;
                    subjectStats[q.subject].total += q.total_attempts;
                  });
                  let weakestSubject = 'N/A';
                  let lowestRate = 100;
                  Object.entries(subjectStats).forEach(([sub, stats]) => {
                    const rate = (stats.correct / stats.total) * 100;
                    if (rate < lowestRate) {
                      lowestRate = rate;
                      weakestSubject = sub;
                    }
                  });

                  // Needs attention count (success rate < 40% with at least 1 attempt)
                  const attentionCount = attemptedQuestions.filter(q => (q.success_rate || 0) < 40).length;

                  return (
                    <>
                      <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Classroom Success Average</span>
                        <strong style={{ fontSize: '26px', color: avgSuccess < 50 ? 'var(--accent-danger)' : avgSuccess < 75 ? 'var(--accent-warning)' : 'var(--accent-success)' }}>
                          {attemptedQuestions.length > 0 ? `${avgSuccess}%` : 'N/A'}
                        </strong>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Across {attemptedQuestions.length} questions ({totalAttempts} attempts)</span>
                      </div>
                      <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Weakest Concept Group</span>
                        <strong style={{ fontSize: '20px', color: 'var(--accent-danger)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {weakestSubject}
                        </strong>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {weakestSubject !== 'N/A' ? `Lowest success rate of ${Math.round(lowestRate)}%` : 'No responses registered'}
                        </span>
                      </div>
                      <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Topics Needing Re-Teaching</span>
                        <strong style={{ fontSize: '26px', color: attentionCount > 0 ? 'var(--accent-warning)' : 'var(--accent-success)' }}>
                          {attentionCount}
                        </strong>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Questions with success rate &lt; 40%</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Aggregated Performance List */}
              <div className="glass-panel" style={{ border: '1px solid var(--glass-border)', padding: '20px' }}>
                <h3 style={{ fontSize: '15px', color: '#fff', marginBottom: '15px' }}>Question Bank Performance List</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {analyticsData.map((item, idx) => {
                    const hasAttempts = item.total_attempts > 0;
                    const successRate = hasAttempts ? item.success_rate : null;
                    
                    let statusColor = 'rgba(255,255,255,0.4)';
                    let statusBg = 'rgba(255,255,255,0.05)';
                    let statusText = 'No attempts';
                    let barColor = 'rgba(255,255,255,0.1)';

                    if (hasAttempts) {
                      if (successRate < 40) {
                        statusColor = 'var(--accent-danger)';
                        statusBg = 'rgba(239, 68, 68, 0.1)';
                        statusText = 'Critical: Re-teach';
                        barColor = 'var(--accent-danger)';
                      } else if (successRate < 70) {
                        statusColor = 'var(--accent-warning)';
                        statusBg = 'rgba(245, 158, 11, 0.1)';
                        statusText = 'Needs Review';
                        barColor = 'var(--accent-warning)';
                      } else {
                        statusColor = 'var(--accent-success)';
                        statusBg = 'rgba(16, 185, 129, 0.1)';
                        statusText = 'Excellent';
                        barColor = 'var(--accent-success)';
                      }
                    }

                    return (
                      <div key={item.question_id} className="glass-panel" style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '15px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                              <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                                {item.subject}
                              </span>
                              <span style={{ fontSize: '11px', background: item.difficulty === 'Hard' ? 'rgba(239,68,68,0.1)' : item.difficulty === 'Medium' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', color: item.difficulty === 'Hard' ? 'var(--accent-danger)' : item.difficulty === 'Medium' ? 'var(--accent-warning)' : 'var(--accent-success)', padding: '2px 8px', borderRadius: '10px' }}>
                                {item.difficulty}
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                ID: {item.question_id}
                              </span>
                            </div>
                            <h4 style={{ fontSize: '14px', color: '#fff', fontWeight: 500, lineHeight: 1.4, marginTop: '5px' }}>
                              {item.question_text}
                            </h4>
                          </div>

                          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Success Rate</span>
                            <strong style={{ fontSize: '18px', color: statusColor }}>
                              {hasAttempts ? `${successRate}%` : 'N/A'}
                            </strong>
                            <span style={{ fontSize: '10px', color: statusColor, padding: '2px 6px', borderRadius: '4px', background: statusBg, fontWeight: 700 }}>
                              {statusText}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        {hasAttempts && (
                          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${successRate}%`, height: '100%', background: barColor, borderRadius: '3px', transition: 'width 0.4s ease' }}></div>
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          <span>Attempts: <strong>{item.total_attempts}</strong> (Correct: <strong>{item.correct_count}</strong>)</span>
                          {hasAttempts && successRate < 70 && (
                            <span style={{ color: 'var(--accent-warning)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>💡</span> Recommendation: Teach {item.subject} again before the next exam.
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
