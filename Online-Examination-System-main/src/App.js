import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import Exam from './components/Exam';
import Results from './components/Results';
import AdminPortal from './components/AdminPortal';
import AdminLogin from './components/AdminLogin';

export default function App() {
  const [screen, setScreen] = useState('dashboard'); // dashboard, exam, results, admin, admin-login
  const [examConfig, setExamConfig] = useState(null);
  const [activeResults, setActiveResults] = useState(null);

  // Authentication State
  // eslint-disable-next-line no-unused-vars
  const [user, setUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem('authUser');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

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

  const handleGoToAdmin = () => {
    const authUserStr = sessionStorage.getItem('authUser');
    if (authUserStr) {
      const authUser = JSON.parse(authUserStr);
      if (authUser.role === 'Admin' || authUser.role === 'Teacher') {
        setScreen('admin');
        return;
      }
    }
    setScreen('admin-login');
  };

  const handleGoToStudent = () => {
    sessionStorage.removeItem('adminToken');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('authUser');
    setUser(null);
    setScreen('dashboard');
  };

  const handleAdminLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    if (loggedInUser.role === 'Admin' || loggedInUser.role === 'Teacher') {
      setScreen('admin');
    } else {
      // Auto-register student profile details
      localStorage.setItem('aero_student_name', loggedInUser.full_name);
      localStorage.setItem('aero_student_email', loggedInUser.email || `${loggedInUser.username}@sgi.edu`);
      localStorage.setItem('aero_student_id', loggedInUser.student_id_card || loggedInUser.user_id);
      setScreen('dashboard');
    }
  };

  const handleAdminLoginCancel = () => {
    setScreen('dashboard');
  };

  // Safe Guard against direct state modifications/manipulations
  const renderScreen = () => {
    switch (screen) {
      case 'dashboard':
        return (
          <Dashboard
            onStartExam={handleStartExam}
            onViewResults={handleViewHistoricResults}
            onGoToAdmin={handleGoToAdmin}
          />
        );
      case 'exam':
        return (
          <Exam
            config={examConfig}
            onSubmitExam={handleExamSubmitted}
          />
        );
      case 'results':
        return (
          <Results
            results={activeResults}
            onBackToDashboard={handleBackToDashboard}
          />
        );
      case 'admin-login':
        return (
          <AdminLogin
            onLoginSuccess={handleAdminLoginSuccess}
            onCancel={handleAdminLoginCancel}
          />
        );
      case 'admin':
        const token = sessionStorage.getItem('authToken');
        const authUser = JSON.parse(sessionStorage.getItem('authUser') || '{}');
        if (!token || (authUser.role !== 'Admin' && authUser.role !== 'Teacher')) {
          // Force back to login if token is manipulated or missing
          setTimeout(() => setScreen('admin-login'), 0);
          return null;
        }
        return (
          <AdminPortal
            onGoToStudent={handleGoToStudent}
          />
        );
      default:
        return <Dashboard onStartExam={handleStartExam} onViewResults={handleViewHistoricResults} onGoToAdmin={handleGoToAdmin} />;
    }
  };

  return (
    <div className="app-layout">
      {renderScreen()}
    </div>
  );
}
