import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';

const ADMIN_EMAIL = process.env.REACT_APP_ADMIN_EMAIL;

export default function App() {
  const [session, setSession] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) init(session);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        await init(session);
      } else {
        setEmployee(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function init(session) {
    setLoading(true);
    const email = session.user.email;

    if (email === ADMIN_EMAIL) {
      setIsAdmin(true);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setEmployee(data || null);
    } catch (err) {
      console.error('Error fetching employee:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleSignOut() {
    supabase.auth.signOut();
  }

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner spinner-dark" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!session) return <AuthPage />;

  if (isAdmin) return <AdminDashboard onSignOut={handleSignOut} />;

  if (!employee) {
    return (
      <div className="page-loader">
        <div className="spinner spinner-dark" />
        <p>Setting up your account...</p>
      </div>
    );
  }

  return <Dashboard employee={employee} onSignOut={handleSignOut} />;
}
