import React, { useState } from 'react';
import PerformanceCharts from './PerformanceCharts';
import './Results.css';

export default function Results({ results, onBackToDashboard }) {
  const {
    name,
    email,
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
    terminated,
    violations
  } = results;

  const [expandedQuestionId, setExpandedQuestionId] = useState(null);

  const toggleExpandQuestion = (id) => {
    setExpandedQuestionId(prev => (prev === id ? null : id));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="results-container animate-fade-in">
      <header className="results-header">
        <h1>EXAMINATION ANALYTICS</h1>
        <p>Comprehensive Performance & Security Audit Log</p>
      </header>

      {/* Main Score & Metrics Row */}
      <section className="score-summary-grid">
        {/* Score Radial Grade Card */}
        <div className={`glass-panel score-radial-card ${passed ? 'passed' : 'failed'}`}>
          <div className="large-score-bubble">{score}%</div>
          <span className={`status-badge-large ${passed ? 'passed' : 'failed'}`}>
            {passed ? 'Passed' : 'Failed'}
          </span>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Candidate: <strong>{name}</strong> <br /> ({email})
          </p>
        </div>

        {/* Audit Details */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '18px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px', marginBottom: '15px' }}>
              Performance Metrics
            </h3>
            <div className="metrics-summary-list">
              <div className="metric-item">
                <span className="metric-title">Test Category</span>
                <span className="metric-data">{category}</span>
              </div>
              <div className="metric-item">
                <span className="metric-title">Duration Limit</span>
                <span className="metric-data">{duration} Mins</span>
              </div>
              <div className="metric-item">
                <span className="metric-title">Correct Answers</span>
                <span className="metric-data success">{correctCount} / {totalCount}</span>
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

      {/* Visual Analytics Graphs */}
      <section className="glass-panel">
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
