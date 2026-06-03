import React, { useState, useEffect } from 'react';
import './Timer.css';

export default function Timer({ durationMinutes, onTimeExpired }) {
  const totalSeconds = durationMinutes * 60;
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);

  useEffect(() => {
    setSecondsLeft(totalSeconds);
  }, [totalSeconds]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onTimeExpired();
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft, onTimeExpired]);

  // Formatter
  const formatTime = () => {
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Radial Circle Calculations
  const radius = 20;
  const circumference = 2 * Math.PI * radius; // ~125.66
  const progressRatio = secondsLeft / totalSeconds;
  const strokeDashoffset = circumference - progressRatio * circumference;

  // Determine Warning Level
  let warningClass = '';
  if (secondsLeft <= 60) {
    warningClass = 'critical';
  } else if (secondsLeft <= 120) {
    warningClass = 'warning';
  }

  return (
    <div className="timer-container">
      {/* SVG Radial Gauge */}
      <div className="timer-radial-wrapper">
        <svg className="timer-radial-svg">
          <circle
            cx="24"
            cy="24"
            r={radius}
            className="timer-radial-bg"
          />
          <circle
            cx="24"
            cy="24"
            r={radius}
            className={`timer-radial-progress ${warningClass}`}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        <div className="timer-text-overlay">
          <svg className={`timer-bell-icon ${warningClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      {/* Digital Timer */}
      <div className="timer-digital-display">
        <span className="timer-label">Time Remaining</span>
        <span className={`timer-digits ${warningClass}`}>
          {formatTime()}
        </span>
      </div>
    </div>
  );
}
