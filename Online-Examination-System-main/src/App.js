import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import Exam from './components/Exam';
import Results from './components/Results';

export default function App() {
  const [screen, setScreen] = useState('dashboard'); // dashboard, exam, results
  const [examConfig, setExamConfig] = useState(null);
  const [activeResults, setActiveResults] = useState(null);

  const handleStartExam = (config) => {
    setExamConfig(config);
    setScreen('exam');
  };

  const handleExamSubmitted = (resultsData) => {
    setActiveResults(resultsData);
    setScreen('results');
  };

  const handleViewHistoricResults = (resultsData) => {
    setActiveResults(resultsData);
    setScreen('results');
  };

  const handleBackToDashboard = () => {
    setActiveResults(null);
    setExamConfig(null);
    setScreen('dashboard');
  };

  return (
    <div className="app-layout">
      {screen === 'dashboard' && (
        <Dashboard
          onStartExam={handleStartExam}
          onViewResults={handleViewHistoricResults}
        />
      )}

      {screen === 'exam' && (
        <Exam
          config={examConfig}
          onSubmitExam={handleExamSubmitted}
        />
      )}

      {screen === 'results' && (
        <Results
          results={activeResults}
          onBackToDashboard={handleBackToDashboard}
        />
      )}
    </div>
  );
}
