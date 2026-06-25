import React, { useState } from 'react';
import PerformanceCharts from './PerformanceCharts';
import './Results.css';

export default function Results({ results, onBackToDashboard }) {
  const {
    name,
    email,
    studentId,
    category,
    duration,
    proctoring,
    score,
    correctCount,
    incorrectCount,
    unansweredCount,
    totalCount,
    totalMarks,
    maxMarks,
    answers,
    questions,
    terminated,
    violations,
    date
  } = results;

  const [expandedQuestionId, setExpandedQuestionId] = useState(null);

  const toggleExpandQuestion = (id) => {
    setExpandedQuestionId(prev => (prev === id ? null : id));
  };

  const handlePrint = () => {
    window.print();
  };

  const examDate = date ? new Date(date).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : new Date().toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const isPassed = score >= 40;

  // Group by category/subject for section breakdown
  const breakdown = {};
  questions.forEach(q => {
    const cat = q.category || 'General';
    if (!breakdown[cat]) {
      breakdown[cat] = { correct: 0, total: 0, marks: 0, maxMarks: 0 };
    }
    const chosenIndex = answers[q.id];
    const isCorrect = chosenIndex === q.answerIndex;
    const qMarks = q.marks ? parseInt(q.marks) : 1;
    breakdown[cat].total++;
    breakdown[cat].maxMarks += qMarks;
    if (chosenIndex !== undefined && isCorrect) {
      breakdown[cat].correct++;
      breakdown[cat].marks += qMarks;
    }
  });

  // Default marks values if legacy record
  const calculatedTotalMarks = totalMarks !== undefined ? totalMarks : correctCount;
  const calculatedMaxMarks = maxMarks !== undefined ? maxMarks : totalCount;

  return (
    <div className="results-container animate-fade-in">
      <header className="results-header">
        <span className="report-inst-badge">SANJAY GHODAWAT INSTITUTE</span>
        <h1>Official Examination Report</h1>
        <p className="report-subtitle">Comprehensive Security & Academic Analytics Sheet</p>
      </header>

      {/* Main Score & Metrics Row */}
      <section className="score-summary-grid">
        {/* Score Radial Grade Card */}
        <div className={`glass-panel score-radial-card ${isPassed ? 'passed' : 'failed'}`}>
          <div className="large-score-bubble">{score}%</div>
          <span className={`status-badge-large ${isPassed ? 'passed' : 'failed'}`}>
            {isPassed ? 'PASSED' : 'FAILED'}
          </span>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            Student Name: <strong>{name}</strong> <br />
            Student ID: <strong>{studentId || 'N/A'}</strong> <br />
            Email: <strong>{email}</strong>
          </p>
        </div>

        {/* Audit Details */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '18px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px', marginBottom: '15px' }}>
              Academic Performance
            </h3>
            <div className="metrics-summary-list">
              <div className="metric-item">
                <span className="metric-title">Test Category</span>
                <span className="metric-data">{category}</span>
              </div>
              <div className="metric-item">
                <span className="metric-title">Exam Date</span>
                <span className="metric-data" style={{ fontSize: '14px' }}>{examDate}</span>
              </div>
              <div className="metric-item">
                <span className="metric-title">Total Marks Obtained</span>
                <span className={`metric-data ${isPassed ? 'success' : 'danger'}`}>
                  {calculatedTotalMarks} / {calculatedMaxMarks} Marks
                </span>
              </div>
              <div className="metric-item">
                <span className="metric-title">Correct Answers</span>
                <span className="metric-data success">{correctCount} / {totalCount} Qs</span>
              </div>
              <div className="metric-item">
                <span className="metric-title">Incorrect Answers</span>
                <span className="metric-data danger">{incorrectCount}</span>
              </div>
              <div className="metric-item">
                <span className="metric-title">Unanswered Items</span>
                <span className="metric-data warning">{unansweredCount}</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '20px', borderTop: '1px solid var(--glass-border)', paddingTop: '15px' }}>
            <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              🛡️ Proctoring Security Audit
            </h3>
            <p style={{ fontSize: '13px', lineHeight: '1.4', color: 'var(--text-primary)' }}>
              Proctor Level: <strong style={{ textTransform: 'capitalize' }}>{proctoring}</strong> | Focus Violations: <strong style={{ color: violations > 0 ? 'var(--accent-danger)' : 'var(--accent-success)' }}>{violations}</strong>
            </p>
            {terminated ? (
              <p style={{ color: 'var(--accent-danger)', fontSize: '12px', marginTop: '6px', fontWeight: 600 }}>
                ⚠️ SESSION TERMINATED: The exam was auto-submitted due to exceeding security violations.
              </p>
            ) : (
              <p style={{ color: 'var(--accent-success)', fontSize: '12px', marginTop: '6px' }}>
                ✓ Session Integrity: Clear. No termination flags raised.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Subject/Section Breakdown Panel */}
      <section className="glass-panel breakdown-section">
        <h3 className="chart-title">Subject & Category Breakdown</h3>
        <div className="breakdown-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' }}>
          {Object.entries(breakdown).map(([cat, stat]) => {
            const catScore = stat.maxMarks > 0 ? Math.round((stat.marks / stat.maxMarks) * 100) : 0;
            const catPassed = catScore >= 40;
            return (
              <div key={cat} className="glass-panel stat-card" style={{ padding: '15px 20px', borderLeft: `4px solid ${catPassed ? 'var(--accent-success)' : 'var(--accent-danger)'}`, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{cat}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Marks: </span>
                    <strong style={{ fontSize: '14px', color: '#fff' }}>{stat.marks}/{stat.maxMarks}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Ratio: </span>
                    <strong style={{ fontSize: '14px', color: '#fff' }}>{stat.correct}/{stat.total} Qs</strong>
                  </div>
                </div>
                <div style={{ fontSize: '12.5px', color: catPassed ? 'var(--accent-success)' : 'var(--accent-danger)', fontWeight: 600, marginTop: '2px' }}>
                  {catScore}% — {catPassed ? 'PASSED' : 'FAILED'}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Visual Analytics Graphs */}
      <section className="glass-panel charts-section">
        <h3 className="chart-title">Data Visualizations</h3>
        <PerformanceCharts results={results} />
      </section>

      {/* Interactive Item Review */}
      <section className="review-section">
        <div className="review-header-row">
          <h2 style={{ fontSize: '20px', fontWeight: 600 }}>Question-by-Question Review</h2>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Click any question to view explanations</span>
        </div>

        <div>
          {questions.map((q, index) => {
            const isExpanded = expandedQuestionId === q.id;
            const chosenIndex = answers[q.id];
            const isCorrect = chosenIndex === q.answerIndex;
            const alphabet = ['A', 'B', 'C', 'D'];

            let statusClass = 'unanswered';
            let statusText = 'Unanswered';
            if (chosenIndex !== undefined) {
              statusClass = isCorrect ? 'correct' : 'incorrect';
              statusText = isCorrect ? 'Correct' : 'Incorrect';
            }

            return (
              <div key={q.id} className="review-item animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
                {/* Header */}
                <div className="review-item-header" onClick={() => toggleExpandQuestion(q.id)}>
                  <div className="review-q-text">
                    <span style={{ color: 'var(--text-muted)', marginRight: '10px' }}>Q{index + 1}.</span>
                    {q.question}
                    {q.marks && (
                      <span style={{ fontSize: '11px', color: 'var(--accent-secondary)', marginLeft: '10px', background: 'rgba(6, 182, 212, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                        {q.marks} Mark{parseInt(q.marks) > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className={`review-q-status ${statusClass}`}>
                    {statusText}
                  </div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </div>

                {/* Collapsible Details Body */}
                {isExpanded && (
                  <div className="review-item-body">
                    <div className="review-options-grid">
                      {q.options.map((option, optIdx) => {
                        let optionClass = '';
                        if (optIdx === q.answerIndex) {
                          optionClass = 'correct-choice';
                        } else if (optIdx === chosenIndex && !isCorrect) {
                          optionClass = 'incorrect-choice';
                        }

                        return (
                          <div key={optIdx} className={`review-option ${optionClass}`}>
                            <strong>{alphabet[optIdx]}. </strong> {option}
                            {optIdx === q.answerIndex && ' ✓'}
                            {optIdx === chosenIndex && !isCorrect && ' ✗'}
                          </div>
                        );
                      })}
                    </div>

                    <div className="review-explanation">
                      <strong>Detailed Explanation</strong>
                      {q.explanation}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Actions */}
      <footer className="results-actions">
        <button onClick={onBackToDashboard} className="btn-outline">
          Back to Dashboard
        </button>
        <button onClick={handlePrint} className="btn-primary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '5px' }}>
            <polyline points="6 9 6 2 18 2 18 9"></polyline>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
            <rect x="6" y="14" width="12" height="8"></rect>
          </svg>
          Print Score Report
        </button>
      </footer>
    </div>
  );
}
