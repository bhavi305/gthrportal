import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import './AuthPage.css';

export default function AuthPage() {
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  }

  async function handleLogin(e) {
    e.preventDefault();
    if (!form.identifier.trim()) return setError('Please enter your Employee ID or email.');
    if (!form.password) return setError('Please enter your password.');

    setLoading(true);
    setError('');

    try {
      const isEmployeeId = /^B\d+$/i.test(form.identifier.trim());
      let emailToUse = form.identifier.trim();

      if (isEmployeeId) {
        const { data, error } = await supabase
          .rpc('get_email_by_employee_id', { emp_id: form.identifier.trim().toUpperCase() });
        if (error || !data) throw new Error('Employee ID not found.');
        emailToUse = data;
      }

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

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">HR</div>
          <h1>Attendance Portal</h1>
          <p className="auth-tagline">Track your work, every day</p>
        </div>

        <form onSubmit={handleLogin} className="auth-form">
          <div className="form-group">
            <label>Employee ID or Email</label>
            <input
              type="text"
              name="identifier"
              value={form.identifier}
              onChange={handleChange}
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

        <p className="auth-footer">Contact your admin if you need access.</p>
      </div>
    </div>
  );
}
