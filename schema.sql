-- Money Book D1 Schema
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  denomination TEXT NOT NULL,
  series_year TEXT NOT NULL,
  serial_number TEXT DEFAULT '',
  treasurer_signature TEXT DEFAULT '',
  secretary_signature TEXT DEFAULT '',
  friedberg_number TEXT DEFAULT '',
  is_star_note INTEGER DEFAULT 0,
  fancy_serials TEXT DEFAULT '[]',
  errors TEXT DEFAULT '[]',
  grade TEXT DEFAULT '',
  grader TEXT DEFAULT '',
  cert_number TEXT DEFAULT '',
  grading_comments TEXT DEFAULT '',
  estimated_value TEXT DEFAULT '',
  cost_paid TEXT DEFAULT '',
  photo_key TEXT DEFAULT '',
  flags TEXT DEFAULT '[]',
  user_notes TEXT DEFAULT '',
  date_added TEXT NOT NULL
);
