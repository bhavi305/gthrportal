import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard';

export default function App() {
  const [session, setSession] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchEmployee(session.user);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        await fetchEmployee(session.user);
      } else {
        setEmployee(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchEmployee(user) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setEmployee(data || null);
    } catch (err) {
      console.error('Error fetching employee:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleEmployeeCreated(emp) {
    setEmployee(emp);
  }

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner spinner-dark" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!session) {
    return <AuthPage onEmployeeCreated={handleEmployeeCreated} />;
  }

  if (!employee) {
    return (
      <div className="page-loader">
        <div className="spinner spinner-dark" />
        <p>Setting up your account...</p>
      </div>
    );
  }

  return (
    <Dashboard
      employee={employee}
      session={session}
      onSignOut={() => supabase.auth.signOut()}
    />
  );
}
