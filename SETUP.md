# HR Attendance App — Setup Guide

## 1. Supabase Project Setup

1. Go to https://supabase.com and create a new project
2. Once the project is ready, go to **SQL Editor**
3. Paste and run the entire contents of `supabase_setup.sql`
4. Go to **Project Settings → API** and copy:
   - **Project URL** → `REACT_APP_SUPABASE_URL`
   - **anon / public key** → `REACT_APP_SUPABASE_ANON_KEY`

## 2. Google OAuth (optional but recommended)

1. In Supabase, go to **Authentication → Providers → Google**
2. Enable it and follow the instructions to create a Google OAuth App
3. Add your site URL to the redirect list in both Google Console and Supabase

## 3. Local Development

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env and fill in your Supabase URL and key

# Start dev server
npm start
```

## 4. Deploy to Netlify

1. Push code to GitHub
2. Connect repo to Netlify
3. Set build command: `npm run build`
4. Set publish directory: `build`
5. Add environment variables in Netlify dashboard:
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`
6. Add your Netlify site URL to Supabase → Authentication → URL Configuration → Site URL & Redirect URLs

## 5. Deploy to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Add the same environment variables
4. Add Vercel URL to Supabase allowed redirect URLs

## Database Schema

### employees
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, matches auth.users.id |
| name | text | Full name |
| email | text | Unique |
| employee_id | text | Auto-generated e.g. B1105 |
| created_at | timestamptz | Auto |

### attendance
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| employee_id | text | FK → employees.employee_id |
| date | date | YYYY-MM-DD |
| day | text | Monday, Tuesday etc. |
| check_in_time | time | HH:MM:SS |
| check_out_time | time | Nullable |
| created_at | timestamptz | Auto |
