import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import './Dashboard.css';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function formatTime(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':');
  const date = new Date();
  date.setHours(parseInt(h), parseInt(m));
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}


function getDayName(date) {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

function getFullDateDisplay(date) {
  return date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getCurrentTimeString() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export default function Dashboard({ employee, onSignOut }) {
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkOutLoading, setCheckOutLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const today = new Date();
  const todayISO = toISODate(today);

  const fetchTodayAttendance = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employee.employee_id)
        .eq('date', todayISO)
        .maybeSingle();

      if (error) throw error;
      setAttendance(data);
    } catch (err) {
      console.error('Error fetching attendance:', err);
    } finally {
      setLoading(false);
    }
  }, [employee.employee_id, todayISO]);

  useEffect(() => {
    fetchTodayAttendance();
  }, [fetchTodayAttendance]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  function showMessage(text, type = 'success') {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  }

  async function handleCheckIn() {
    if (attendance?.check_in_time) return;

    setCheckInLoading(true);
    try {
      const now = new Date();
      const timeStr = getCurrentTimeString();
      const dateStr = todayISO;
      const dayStr = getDayName(now);

      const { data, error } = await supabase
        .from('attendance')
        .insert({
          employee_id: employee.employee_id,
          date: dateStr,
          day: dayStr,
          check_in_time: timeStr
        })
        .select()
        .single();

      if (error) throw error;
      setAttendance(data);
      showMessage(`Checked in at ${formatTime(timeStr)}`, 'success');
    } catch (err) {
      showMessage(err.message || 'Check-in failed. Please try again.', 'error');
    } finally {
      setCheckInLoading(false);
    }
  }

  async function handleCheckOut() {
    if (!attendance?.check_in_time) {
      showMessage('Please check in first before checking out.', 'error');
      return;
    }
    if (attendance?.check_out_time) return;

    setCheckOutLoading(true);
    try {
      const timeStr = getCurrentTimeString();

      const { data, error } = await supabase
        .from('attendance')
        .update({ check_out_time: timeStr })
        .eq('id', attendance.id)
        .select()
        .single();

      if (error) throw error;
      setAttendance(data);
      showMessage(`Checked out at ${formatTime(timeStr)}`, 'success');
    } catch (err) {
      showMessage(err.message || 'Check-out failed. Please try again.', 'error');
    } finally {
      setCheckOutLoading(false);
    }
  }

  const checkedIn = Boolean(attendance?.check_in_time);
  const checkedOut = Boolean(attendance?.check_out_time);

  const liveTime = currentTime.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true
  });

  function getStatusBadge() {
    if (!checkedIn) return { label: 'Not Checked In', cls: 'badge-pending' };
    if (!checkedOut) return { label: 'Currently Working', cls: 'badge-active' };
    return { label: 'Day Complete', cls: 'badge-done' };
  }

  const status = getStatusBadge();

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="dash-header-left">
          <div className="dash-logo">HR</div>
          <span className="dash-title">Attendance</span>
        </div>
        <button className="signout-btn" onClick={onSignOut} title="Sign out">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign Out
        </button>
      </header>

      <main className="dash-main">
        {message && (
          <div className={`toast toast-${message.type}`}>
            <span className="toast-icon">{message.type === 'success' ? '✓' : '!'}</span>
            {message.text}
          </div>
        )}

        <section className="greeting-section">
          <p className="greeting-text">{getGreeting()},</p>
          <h1 className="greeting-name">{employee.name.split(' ')[0]}</h1>
          <div className="emp-badge">
            <span className="emp-badge-label">Employee ID</span>
            <span className="emp-badge-id">{employee.employee_id}</span>
          </div>
        </section>

        <section className="date-section">
          <div className="date-card">
            <div className="date-left">
              <p className="date-full">{getFullDateDisplay(today)}</p>
              <span className={`status-badge ${status.cls}`}>{status.label}</span>
            </div>
            <div className="live-clock">{liveTime}</div>
          </div>
        </section>

        {loading ? (
          <div className="loading-box">
            <div className="spinner spinner-dark" />
            <p>Loading today's record...</p>
          </div>
        ) : (
          <>
            <section className="time-cards">
              <div className={`time-card ${checkedIn ? 'time-card-filled' : ''}`}>
                <div className="time-card-icon check-in-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <div>
                  <p className="time-card-label">Check In</p>
                  <p className="time-card-value">
                    {checkedIn ? formatTime(attendance.check_in_time) : '—'}
                  </p>
                </div>
              </div>
              <div className={`time-card ${checkedOut ? 'time-card-filled' : ''}`}>
                <div className="time-card-icon check-out-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 8 14"/>
                  </svg>
                </div>
                <div>
                  <p className="time-card-label">Check Out</p>
                  <p className="time-card-value">
                    {checkedOut ? formatTime(attendance.check_out_time) : '—'}
                  </p>
                </div>
              </div>
            </section>

            {checkedIn && checkedOut && (
              <div className="duration-card">
                <p className="duration-label">Total Hours Today</p>
                <p className="duration-value">{calcDuration(attendance.check_in_time, attendance.check_out_time)}</p>
              </div>
            )}

            <section className="action-section">
              <button
                className={`action-btn check-in-btn ${checkedIn ? 'btn-done' : ''}`}
                onClick={handleCheckIn}
                disabled={checkedIn || checkInLoading}
              >
                {checkInLoading ? (
                  <span className="spinner" />
                ) : checkedIn ? (
                  <>
                    <span className="btn-check">✓</span> Checked In
                  </>
                ) : (
                  <>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/>
                      <polyline points="10 17 15 12 10 7"/>
                      <line x1="15" y1="12" x2="3" y2="12"/>
                    </svg>
                    Check In
                  </>
                )}
              </button>

              <button
                className={`action-btn check-out-btn ${checkedOut ? 'btn-done' : ''} ${!checkedIn ? 'btn-locked' : ''}`}
                onClick={handleCheckOut}
                disabled={!checkedIn || checkedOut || checkOutLoading}
              >
                {checkOutLoading ? (
                  <span className="spinner" />
                ) : checkedOut ? (
                  <>
                    <span className="btn-check">✓</span> Checked Out
                  </>
                ) : (
                  <>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                      <polyline points="16 17 21 12 16 7"/>
                      <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    Check Out
                  </>
                )}
              </button>
            </section>

            {!checkedIn && (
              <p className="hint-text">Tap <strong>Check In</strong> to start your workday</p>
            )}
            {checkedIn && !checkedOut && (
              <p className="hint-text">Have a productive day! Tap <strong>Check Out</strong> when done.</p>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function calcDuration(checkIn, checkOut) {
  if (!checkIn || !checkOut) return '';
  const [ih, im, is_] = checkIn.split(':').map(Number);
  const [oh, om, os] = checkOut.split(':').map(Number);
  const inSec = ih * 3600 + im * 60 + (is_ || 0);
  const outSec = oh * 3600 + om * 60 + (os || 0);
  const diff = outSec - inSec;
  if (diff <= 0) return '0h 0m';
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  return `${hours}h ${minutes}m`;
}
