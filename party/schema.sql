-- Party Planning D1 Schema

-- Key/value table for party-wide settings (party name, date, venue headline, etc.)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

-- Task list: things to get done before the party
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  notes TEXT DEFAULT '',
  due_date TEXT DEFAULT '',
  assignee TEXT DEFAULT '',       -- 'him' | 'wife' | 'vendor' | free text
  status TEXT DEFAULT 'open',     -- 'open' | 'done'
  created_at TEXT NOT NULL
);

-- Vendors and contacts (venue, caterer, DJ, florist, bakery, etc.)
CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT DEFAULT '',       -- 'venue' | 'caterer' | 'dj' | 'florist' | 'bakery' | ...
  contact_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  website TEXT DEFAULT '',
  deposit_amount REAL DEFAULT 0,
  balance_amount REAL DEFAULT 0,
  deposit_paid INTEGER DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL
);

-- Budget line items (estimated vs. actual, optional soft-FK to vendors)
CREATE TABLE IF NOT EXISTS budget_items (
  id TEXT PRIMARY KEY,
  category TEXT DEFAULT '',       -- 'venue' | 'food' | 'decor' | 'music' | 'other'
  description TEXT NOT NULL,
  estimated_cost REAL DEFAULT 0,
  actual_cost REAL DEFAULT 0,
  paid INTEGER DEFAULT 0,
  vendor_id TEXT,                 -- nullable soft-FK -> vendors.id
  created_at TEXT NOT NULL
);

-- Shopping list (decor, groceries, supplies)
CREATE TABLE IF NOT EXISTS shopping_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  store TEXT DEFAULT '',
  quantity TEXT DEFAULT '',
  purchased INTEGER DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL
);

-- Menu planner (courses, dishes, dietary notes)
CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY,
  course TEXT DEFAULT '',         -- 'appetizer' | 'main' | 'side' | 'dessert' | 'drink'
  name TEXT NOT NULL,
  serving_count INTEGER DEFAULT 0,
  dietary_notes TEXT DEFAULT '',  -- free text: 'GF, vegan', etc.
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL
);

-- Inspiration notes (theme, decor, outfit ideas, with optional photo)
CREATE TABLE IF NOT EXISTS inspiration_notes (
  id TEXT PRIMARY KEY,
  title TEXT DEFAULT '',
  body TEXT DEFAULT '',
  photo_key TEXT DEFAULT '',      -- R2 object key: 'inspiration/<id>.jpg'
  created_at TEXT NOT NULL
);

-- Seed default settings rows (idempotent)
INSERT OR IGNORE INTO settings (key, value) VALUES ('party_name', "40th Birthday Party");
INSERT OR IGNORE INTO settings (key, value) VALUES ('party_date', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('venue_headline', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('guest_count_goal', '');
