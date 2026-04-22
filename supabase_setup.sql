-- =============================================
-- HR ATTENDANCE APP — SUPABASE SETUP SCRIPT
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. EMPLOYEES TABLE
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  employee_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NOT NULL REFERENCES public.employees(employee_id) ON DELETE CASCADE,
  date DATE NOT NULL,
  day TEXT NOT NULL,
  check_in_time TIME,
  check_out_time TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on both tables
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- EMPLOYEES policies
-- Users can view their own record
CREATE POLICY "employees_select_own" ON public.employees
  FOR SELECT USING (auth.uid() = id);

-- Users can insert their own record (during signup)
CREATE POLICY "employees_insert_own" ON public.employees
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update their own record
CREATE POLICY "employees_update_own" ON public.employees
  FOR UPDATE USING (auth.uid() = id);

-- ATTENDANCE policies
-- Users can view their own attendance records
CREATE POLICY "attendance_select_own" ON public.attendance
  FOR SELECT USING (
    employee_id IN (
      SELECT employee_id FROM public.employees WHERE id = auth.uid()
    )
  );

-- Users can insert their own attendance records
CREATE POLICY "attendance_insert_own" ON public.attendance
  FOR INSERT WITH CHECK (
    employee_id IN (
      SELECT employee_id FROM public.employees WHERE id = auth.uid()
    )
  );

-- Users can update their own attendance records (for check-out)
CREATE POLICY "attendance_update_own" ON public.attendance
  FOR UPDATE USING (
    employee_id IN (
      SELECT employee_id FROM public.employees WHERE id = auth.uid()
    )
  );

-- =============================================
-- OPTIONAL: Allow reading employee_id by email
-- (needed for Employee ID login lookup)
-- This policy lets the app look up email from employee_id
-- during login BEFORE the user is authenticated.
-- We use a separate public lookup function for this.
-- =============================================

-- Function to look up email by employee_id (for login)
-- Called before authentication, so uses SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_email_by_employee_id(emp_id TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM public.employees WHERE employee_id = emp_id LIMIT 1;
$$;

-- Grant execute to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_email_by_employee_id TO anon, authenticated;
