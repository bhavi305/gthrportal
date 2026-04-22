import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import './AdminDashboard.css';

const MAX_EMPLOYEES = 5;

export default function AdminDashboard({ onSignOut }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchEmployees = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  }

  async function generateNextEmployeeId() {
    const { data } = await supabase
      .from('employees')
      .select('employee_id')
      .order('created_at', { ascending: false })
      .limit(1);

    if (!data || data.length === 0) return 'B1105';
    const num = parseInt(data[0].employee_id.replace('B', ''), 10);
    return `B${num + 1}`;
  }

  async function handleAddEmployee(e) {
    e.preventDefault();
    if (!form.name.trim()) return setError('Please enter a name.');
    if (!form.email.trim()) return setError('Please enter an email.');
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');
    if (employees.length >= MAX_EMPLOYEES) return setError('Maximum 5 employees reached.');

    setAdding(true);
    setError('');

    try {
      // Create a temporary client so admin session is not affected
      const { createClient } = await import('@supabase/supabase-js');
      const tempClient = createClient(
        process.env.REACT_APP_SUPABASE_URL,
        process.env.REACT_APP_SUPABASE_ANON_KEY
      );

      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: form.email.trim(),
        password: form.password,
      });

      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) throw new Error('Failed to create user account.');

      const empId = await generateNextEmployeeId();

      const { error: empError } = await supabase.rpc('create_employee', {
        p_id: userId,
        p_name: form.name.trim(),
        p_email: form.email.trim(),
        p_employee_id: empId
      });

      if (empError) throw empError;

      setSuccess(`Employee added! ID: ${empId} | Email: ${form.email.trim()} | Password: ${form.password}`);
      setForm({ name: '', email: '', password: '' });
      setShowForm(false);
      fetchEmployees();

      setTimeout(() => setSuccess(''), 15000);
    } catch (err) {
      setError(err.message || 'Failed to add employee.');
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(emp) {
    if (!window.confirm(`Remove ${emp.name} (${emp.employee_id})? They will no longer be able to log in.`)) return;

    setDeletingId(emp.id);
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', emp.id);
      if (error) throw error;
      fetchEmployees();
    } catch (err) {
      alert('Failed to remove employee: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  }

  const canAdd = employees.length < MAX_EMPLOYEES;

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-header-left">
          <div className="admin-logo">HR</div>
          <div>
            <span className="admin-title">Admin Panel</span>
            <span className="admin-subtitle">GrowthTemple</span>
          </div>
        </div>
        <button className="signout-btn" onClick={onSignOut}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign Out
        </button>
      </header>

      <main className="admin-main">
        <div className="admin-section-header">
          <div>
            <h2>Employees</h2>
            <p className="admin-count">{employees.length} / {MAX_EMPLOYEES} slots used</p>
          </div>
          {canAdd && (
            <button className="add-btn" onClick={() => { setShowForm(f => !f); setError(''); }}>
              {showForm ? '✕ Cancel' : '+ Add Employee'}
            </button>
          )}
        </div>

        {success && (
          <div className="success-banner">
            <strong>Employee created successfully!</strong>
            <p>{success}</p>
            <p className="success-note">Share these credentials with your employee. This message disappears in 15 seconds.</p>
          </div>
        )}

        {showForm && (
          <form onSubmit={handleAddEmployee} className="add-form">
            <h3>New Employee</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="John Doe"
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
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="text"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Min. 6 characters"
                  required
                />
              </div>
            </div>
            {error && <div className="form-error">{error}</div>}
            <button type="submit" className="submit-btn" disabled={adding}>
              {adding ? <><span className="spinner spinner-sm" /> Creating...</> : 'Create Employee Account'}
            </button>
          </form>
        )}

        {loading ? (
          <div className="admin-loading">
            <div className="spinner spinner-dark" />
          </div>
        ) : employees.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👤</div>
            <p>No employees yet. Add your first employee above.</p>
          </div>
        ) : (
          <div className="employee-list">
            {employees.map((emp, i) => (
              <div key={emp.id} className="employee-card">
                <div className="emp-avatar">{emp.name.charAt(0).toUpperCase()}</div>
                <div className="emp-info">
                  <p className="emp-name">{emp.name}</p>
                  <p className="emp-email">{emp.email}</p>
                </div>
                <div className="emp-id-tag">{emp.employee_id}</div>
                <button
                  className="delete-btn"
                  onClick={() => handleDelete(emp)}
                  disabled={deletingId === emp.id}
                  title="Remove employee"
                >
                  {deletingId === emp.id ? <span className="spinner spinner-sm spinner-dark" /> : '✕'}
                </button>
              </div>
            ))}
          </div>
        )}

        {!canAdd && !loading && (
          <p className="max-reached">Maximum of 5 employees reached. Remove one to add another.</p>
        )}
      </main>
    </div>
  );
}
