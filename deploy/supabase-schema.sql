-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- TemperaMap database schema + seed data

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL DEFAULT '',
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'user',
  provider TEXT DEFAULT 'local',
  provider_id TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS passcodes (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  test_type TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  used_at TIMESTAMPTZ,
  used_by TEXT
);

CREATE TABLE IF NOT EXISTS testimonials (
  id TEXT PRIMARY KEY,
  author_name TEXT NOT NULL,
  company TEXT DEFAULT '',
  text TEXT NOT NULL,
  rating INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS faqs (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS features (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT DEFAULT 'star',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS test_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user_email TEXT,
  user_name TEXT,
  test_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  paid BOOLEAN DEFAULT false,
  answers JSONB,
  results JSONB,
  primary_temp TEXT,
  secondary_temp TEXT,
  blend TEXT,
  passcode_used TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_passcodes_code_status ON passcodes (code, status);
CREATE INDEX IF NOT EXISTS idx_test_sessions_user_id ON test_sessions (user_id);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Users (password_hash is empty; app hashes on first run)
INSERT INTO users (id, email, password_hash, first_name, last_name, role, created_at)
VALUES
  ('u-001', 'alice@example.com', '', 'Alice', 'Park', 'admin', '2026-05-15T08:00:00.000Z'),
  ('u-002', 'bob@example.com', '', 'Bob', 'Reyes', 'user', '2026-06-01T12:00:00.000Z'),
  ('u-003', 'carla@example.com', '', 'Carla', 'Nguyen', 'user', '2026-06-20T09:00:00.000Z'),
  ('u-004', 'derek@example.com', '', 'Derek', 'Wilson', 'user', '2026-07-01T15:00:00.000Z'),
  ('u-005', 'emma@example.com', '', 'Emma', 'Santos', 'admin', '2026-06-10T11:00:00.000Z')
ON CONFLICT (id) DO NOTHING;

-- Passcodes
INSERT INTO passcodes (code, test_type, status, created_at, used_at, used_by)
VALUES
  ('TM-AB12CD', 'single_test', 'active', '2026-05-15T08:00:00.000Z', NULL, NULL),
  ('TM-EF34GH', 'couple_test', 'used',   '2026-05-15T08:00:00.000Z', '2026-06-15T10:30:00.000Z', 'u-002'),
  ('TM-JK56LM', 'single_test', 'active', '2026-05-15T08:00:00.000Z', NULL, NULL),
  ('TM-NP78QR', 'group_test',  'active', '2026-05-15T08:00:00.000Z', NULL, NULL)
ON CONFLICT (code) DO NOTHING;

-- Testimonials
INSERT INTO testimonials (id, author_name, company, text, rating, created_at)
VALUES
  ('t-001', 'Sarah Chen',    'Mindful Labs',   'This test completely changed how I understand my temperamento. Highly recommended!', 5, '2026-05-20T10:00:00.000Z'),
  ('t-002', 'James Okafor',  'Breathe Co.',    'Our team used the group test and it improved communication overnight.',                  5, '2026-06-05T14:00:00.000Z'),
  ('t-003', 'Maria Lopez',   '',                'Accurate, insightful, and easy to share with my partner. We loved the couple test.',        4, '2026-06-18T09:00:00.000Z'),
  ('t-004', 'David Kim',     'Pulse Fitness',  'Finally a temperament tool that feels scientific yet accessible. Five stars.',              5, '2026-07-02T16:00:00.000Z')
ON CONFLICT (id) DO NOTHING;

-- FAQs
INSERT INTO faqs (id, question, answer, sort_order, created_at)
VALUES
  ('f-001', 'What is TemperaMap?',             'TemperaMap is an online temperament assessment that helps individuals and teams understand their unique blend of the four classical temperaments.', 0, '2026-05-15T08:00:00.000Z'),
  ('f-002', 'How long does the test take?',    'Most users complete the assessment in 5-10 minutes. The questions are straightforward and designed to be intuitive.',                                                                     1, '2026-05-15T08:00:00.000Z'),
  ('f-003', 'Can I retake the test?',          'Yes! You can retake the test at any time using a valid passcode. Your results are saved so you can track changes over time.',                                                            2, '2026-05-15T08:00:00.000Z'),
  ('f-004', 'What is a passcode?',             'A passcode is a unique code that grants access to a specific test type (single, couple, or group). You can obtain one from your organization admin or through our website.', 3, '2026-05-15T08:00:00.000Z'),
  ('f-005', 'Is my data private?',             'Absolutely. We never share personal data with third parties. Your results are encrypted and only accessible to you and anyone you explicitly share them with.',                    4, '2026-05-15T08:00:00.000Z')
ON CONFLICT (id) DO NOTHING;

-- Features
INSERT INTO features (id, title, description, icon, sort_order, created_at)
VALUES
  ('v-001', 'Four Temperaments',       'Discover your unique blend of Sanguine, Choleric, Melancholic, and Phlegmatic temperaments.', 'layers',     0, '2026-05-15T08:00:00.000Z'),
  ('v-002', 'Couple Analysis',         'Compare temperaments side-by-side to strengthen your closest relationships.',               'heart',      1, '2026-05-15T08:00:00.000Z'),
  ('v-003', 'Team Dashboard',          'Get a bird''s-eye view of your entire team''s temperament composition.',                     'users',      2, '2026-05-15T08:00:00.000Z'),
  ('v-004', 'PDF Reports',             'Download beautifully designed, shareable PDF reports of your results.',                     'file-text',  3, '2026-05-15T08:00:00.000Z'),
  ('v-005', 'Secure & Private',        'Your data is encrypted and never shared with third parties.',                              'shield',     4, '2026-05-15T08:00:00.000Z')
ON CONFLICT (id) DO NOTHING;

-- Test Sessions
INSERT INTO test_sessions (id, user_id, user_email, user_name, test_type, status, paid, primary_temp, secondary_temp, blend, passcode_used, created_at, completed_at)
VALUES
  ('ts-001', 'u-002', 'bob@example.com',      'Bob Reyes',      'single_test', 'completed', true,  'choleric',  'sanguine',  'Choleric-Sanguine',  'TM-EF34GH', '2026-06-15T10:30:00.000Z', '2026-06-15T10:40:00.000Z'),
  ('ts-002', 'u-003', 'carla@example.com',     'Carla Nguyen',   'single_test', 'completed', true,  'melancholic','phlegmatic','Melancholic-Phlegmatic','TM-AB12CD', '2026-06-20T09:15:00.000Z', '2026-06-20T09:25:00.000Z'),
  ('ts-003', 'u-004', 'derek@example.com',     'Derek Wilson',   'single_test', 'pending',   false, NULL,         NULL,        NULL,               NULL,        '2026-07-01T15:00:00.000Z', NULL),
  ('ts-004', 'u-002', 'bob@example.com',       'Bob Reyes',      'couple_test', 'completed', true,  'sanguine',   'melancholic','Sanguine-Melancholic','TM-EF34GH', '2026-06-22T18:00:00.000Z', '2026-06-22T18:12:00.000Z'),
  ('ts-005', 'u-003', 'carla@example.com',     'Carla Nguyen',   'single_test', 'completed', false, 'phlegmatic', 'choleric',  'Phlegmatic-Choleric','TM-JK56LM', '2026-07-05T11:00:00.000Z', '2026-07-05T11:08:00.000Z'),
  ('ts-006', 'u-001', 'alice@example.com',     'Alice Park',     'group_test',  'completed', true,  'choleric',   'melancholic','Choleric-Melancholic','TM-NP78QR', '2026-07-08T09:00:00.000Z', '2026-07-08T09:15:00.000Z')
ON CONFLICT (id) DO NOTHING;

-- Corporate Teams
CREATE TABLE IF NOT EXISTS corporate_teams (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  name TEXT NOT NULL,
  member_session_ids JSONB NOT NULL DEFAULT '[]',
  report JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MIGRATION: Run this if your test_sessions table already exists
-- without answers/results columns
-- ============================================================
-- ALTER TABLE test_sessions ADD COLUMN IF NOT EXISTS answers JSONB;
-- ALTER TABLE test_sessions ADD COLUMN IF NOT EXISTS results JSONB;
