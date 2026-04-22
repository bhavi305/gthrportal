-- Drop the old insert policy
DROP POLICY IF EXISTS "employees_insert_own" ON public.employees;

-- Create a SECURITY DEFINER function to insert employee records
-- This runs with elevated privileges so RLS doesn't block the initial insert
CREATE OR REPLACE FUNCTION public.create_employee(
  p_id UUID,
  p_name TEXT,
  p_email TEXT,
  p_employee_id TEXT
)
RETURNS public.employees
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.employees;
BEGIN
  INSERT INTO public.employees (id, name, email, employee_id)
  VALUES (p_id, p_name, p_email, p_employee_id)
  RETURNING * INTO result;
  RETURN result;
END;
$$;

-- Grant execute to authenticated and anon
GRANT EXECUTE ON FUNCTION public.create_employee TO anon, authenticated;
