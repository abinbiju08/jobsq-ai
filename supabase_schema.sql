-- Run this in Supabase SQL Editor

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  company TEXT,
  location TEXT,
  job_type TEXT,
  salary TEXT,
  category TEXT,
  description TEXT,
  source TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved jobs table
CREATE TABLE IF NOT EXISTS saved_jobs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id BIGINT,
  job_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, job_id)
);

-- User profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  skills TEXT[],
  experience_years INT,
  preferred_category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage own saved jobs" ON saved_jobs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own profile" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Jobs are public" ON jobs FOR SELECT USING (true);
