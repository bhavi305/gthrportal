import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './AuthPage.css';

const MODES = { LOGIN: 'login', SIGNUP: 'signup' };

export default function AuthPage({ onEmployeeCreated }) {
  const [mode, setMode] = useState(MODES.LOGIN);
  const [form, setForm] = useState({ name: '', email: '', password: '', employeeId: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newEmployee, setNewEmployee] = useState(null);

  useEffect(() => {
    setError('');
    setForm({ name: '', email: '', password: '', employeeId: '' });
  }, [mode]);

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  }

  async function generateEmployeeId() {
    const { data, error } = await supabase
      .from('employees')
      .select('employee_id')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (!data || data.length === 0) return 'B1105';

    const last = data[0].employee_id;
    const num = parseInt(last.replace('B', ''), 10);
    return `B${num + 1}`;
  }

  async function handleSignUp(e) {
    e.preventDefault();
    if (!form.name.trim()) return setError('Please enter your full name.');
    if (!form.email.trim()) return setError('Please enter your email.');
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');

    setLoading(true);
    setError('');

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: { data: { full_name: form.name.trim() } }
      });

      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) throw new Error('Account created — please check your email to confirm, then log in.');

      const empId = await generateEmployeeId();

      const { data: empData, error: empError } = await supabase
        .from('employees')
        .insert({ id: userId, name: form.name.trim(), email: form.email.trim(), employee_id: empId })
        .select()
        .single();

      if (empError) throw empError;

      setNewEmployee(empData);
      onEmployeeCreated(empData);
    } catch (err) {
      setError(err.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    if (!form.password) return setError('Please enter your password.');

    const isEmployeeId = /^B\d+$/i.test(form.employeeId.trim());
    const loginEmail = isEmployeeId ? null : form.email.trim();

    setLoading(true);
    setError('');

    try {
      let emailToUse = loginEmail;

      if (isEmployeeId) {
        const { data, error } = await supabase
          .rpc('get_email_by_employee_id', { emp_id: form.employeeId.trim().toUpperCase() });

        if (error || !data) throw new Error('Employee ID not found.');
        emailToUse = data;
      }

      if (!emailToUse) return setError('Please enter your email or Employee ID.');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password: form.password
      });

      if (signInError) throw signInError;
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message || 'Google sign-in failed.');
      setLoading(false);
    }
  }

  if (newEmployee) {
    return (
      <div className="auth-page">
        <div className="auth-card success-card">
          <div className="success-icon">✓</div>
          <h2>Welcome aboard!</h2>
          <p className="success-subtitle">Your account has been created successfully.</p>
          <div className="emp-id-box">
            <p className="emp-id-label">Your Employee ID</p>
            <p className="emp-id-value">{newEmployee.employee_id}</p>
            <p className="emp-id-note">Save this ID — you can use it to log in</p>
          </div>
          <p className="success-redirect">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">HR</div>
          <h1>Attendance Portal</h1>
          <p className="auth-tagline">Track your work, every day</p>
        </div>

        <div className="auth-tabs">
          <button
            className={`tab-btn ${mode === MODES.LOGIN ? 'active' : ''}`}
            onClick={() => setMode(MODES.LOGIN)}
          >
            Sign In
          </button>
          <button
            className={`tab-btn ${mode === MODES.SIGNUP ? 'active' : ''}`}
            onClick={() => setMode(MODES.SIGNUP)}
          >
            Create Account
          </button>
        </div>

        <button className="google-btn" onClick={handleGoogleSignIn} disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div className="divider"><span>or</span></div>

        {mode === MODES.SIGNUP ? (
          <form onSubmit={handleSignUp} className="auth-form">
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="John Doe"
                autoComplete="name"
                required
              />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="john@example.com"
                autoComplete="email"
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Min. 6 characters"
                autoComplete="new-password"
                required
              />
            </div>
            {error && <div className="auth-error">{error}</div>}
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Create Account'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="auth-form">
            <div className="form-group">
              <label>Employee ID or Email</label>
              <input
                type="text"
                name="employeeId"
                value={form.employeeId}
                onChange={e => {
                  const val = e.target.value;
                  const isEmpId = /^B/i.test(val.trim());
                  setForm(f => ({
                    ...f,
                    employeeId: val,
                    email: isEmpId ? '' : val
                  }));
                  setError('');
                }}
                placeholder="B1105 or email@example.com"
                autoComplete="username"
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Your password"
                autoComplete="current-password"
                required
              />
            </div>
            {error && <div className="auth-error">{error}</div>}
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Sign In'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
