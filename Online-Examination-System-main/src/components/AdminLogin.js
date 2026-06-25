import React, { useState } from 'react';
import './AdminLogin.css';

const API_BASE = 'http://localhost:5001/api';

export default function AdminLogin({ onLoginSuccess, onCancel }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('Student'); // Student | Teacher | Admin
  const [studentIdCard, setStudentIdCard] = useState('');
  const [department, setDepartment] = useState('');
  
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (isRegister) {
      if (!username.trim() || !password.trim() || !email.trim() || !fullName.trim()) {
        setError('Please fill in all required fields.');
        return;
      }
      setLoading(true);
      try {
        const payload = {
          username: username.trim(),
          password: password.trim(),
          email: email.trim(),
          role,
          full_name: fullName.trim(),
          student_id_card: role === 'Student' ? studentIdCard.trim() : undefined,
          department: role !== 'Student' ? department.trim() : undefined
        };

        const res = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (res.ok && data.success) {
          setMessage('Registration successful! Please login with your credentials.');
          setIsRegister(false);
          setPassword('');
        } else {
          setError(data.error || 'Registration failed.');
        }
      } catch (err) {
        setError('API server offline. Run server.js to register.');
      } finally {
        setLoading(false);
      }
    } else {
      if (!username.trim() || !password.trim()) {
        setError('Please fill in all fields.');
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
          sessionStorage.setItem('authToken', data.token);
          sessionStorage.setItem('authUser', JSON.stringify(data.user));
          
          // Legacy Compatibility if logging in as admin
          if (data.user.role === 'Admin') {
            sessionStorage.setItem('adminToken', 'sgi_token_secure_access_2026');
          }

          onLoginSuccess(data.user);
        } else {
          setError(data.error || 'Invalid credentials.');
        }
      } catch (err) {
        // Fallback to legacy static login for offline development
        if (username === 'admin' && password === 'sgi@admin123') {
          sessionStorage.setItem('adminToken', 'sgi_token_secure_access_2026');
          const legacyAdmin = { user_id: 'u_admin', username: 'admin', role: 'Admin', full_name: 'Administrator' };
          sessionStorage.setItem('authToken', 'sgi_token_secure_access_2026');
          sessionStorage.setItem('authUser', JSON.stringify(legacyAdmin));
          onLoginSuccess(legacyAdmin);
        } else {
          setError('API server offline. Run server.js to log in.');
        }
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="login-container animate-fade-in">
      <div className="glass-panel login-card animate-slide-up" style={{ maxWidth: '480px' }}>
        {/* Branding Header */}
        <div className="login-branding">
          <span className="inst-badge">SGI</span>
          <h2>Sanjay Ghodawat Institute</h2>
          <p className="inst-sub">Official Online Examination System</p>
        </div>

        <div className="login-header">
          <h3>{isRegister ? 'Create Portal Account' : 'Portal Secure Login'}</h3>
          <p>{isRegister ? 'Register as Student, Teacher, or Administrator' : 'Provide credentials to access your dashboard'}</p>
        </div>

        {error && (
          <div className="login-error-banner">
            <span>⚠️</span> {error}
          </div>
        )}

        {message && (
          <div className="login-success-banner" style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: '15px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>✓</span> {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <div className="form-group">
                <label>Full Name <span className="required-star">*</span></label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email Address <span className="required-star">*</span></label>
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group">
                <label>Portal Role <span className="required-star">*</span></label>
                <select 
                  value={role} 
                  onChange={(e) => setRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="Student" style={{ background: '#12131a' }}>Student</option>
                  <option value="Teacher" style={{ background: '#12131a' }}>Teacher</option>
                  <option value="Admin" style={{ background: '#12131a' }}>Administrator</option>
                </select>
              </div>

              {role === 'Student' ? (
                <div className="form-group">
                  <label>Student ID / Roll Number</label>
                  <input
                    type="text"
                    placeholder="e.g. SGI-2026-089"
                    value={studentIdCard}
                    onChange={(e) => setStudentIdCard(e.target.value)}
                    disabled={loading}
                  />
                </div>
              ) : (
                <div className="form-group">
                  <label>Academic Department</label>
                  <input
                    type="text"
                    placeholder="e.g. Computer Engineering"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    disabled={loading}
                  />
                </div>
              )}
            </>
          )}

          <div className="form-group">
            <label>Username <span className="required-star">*</span></label>
            <input
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label>Password <span className="required-star">*</span></label>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button type="submit" className="btn-primary login-btn" disabled={loading} style={{ marginTop: '10px' }}>
            {loading ? (
              <>
                <span className="login-spinner"></span>
                Processing…
              </>
            ) : (
              isRegister ? 'Create Account' : 'Secure Login'
            )}
          </button>
        </form>

        <div className="toggle-auth-mode" style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
          {isRegister ? (
            <span>
              Already have an account?{' '}
              <button 
                onClick={() => { setIsRegister(false); setError(''); }} 
                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', textDecoration: 'underline', cursor: 'pointer', padding: '0' }}
              >
                Login here
              </button>
            </span>
          ) : (
            <span>
              Need an account?{' '}
              <button 
                onClick={() => { setIsRegister(true); setError(''); }} 
                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', textDecoration: 'underline', cursor: 'pointer', padding: '0' }}
              >
                Register here
              </button>
            </span>
          )}
        </div>

        <button onClick={onCancel} className="btn-outline back-btn" disabled={loading} style={{ marginTop: '15px' }}>
          ← Back to Main Portal
        </button>
      </div>
    </div>
  );
}
