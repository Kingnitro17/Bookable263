CREATE TABLE venues (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 2 AND 120),
  city TEXT NOT NULL CHECK(length(city) BETWEEN 1 AND 80),
  address TEXT NOT NULL DEFAULT '' CHECK(length(address)<=240),
  capacity INTEGER CHECK(capacity IS NULL OR capacity BETWEEN 1 AND 1000000),
  description TEXT NOT NULL DEFAULT '' CHECK(length(description)<=1800),
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;
CREATE INDEX venues_city ON venues(city);
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  venue_id TEXT REFERENCES venues(id) ON DELETE SET NULL,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 2 AND 140),
  event_type TEXT NOT NULL CHECK(length(event_type) BETWEEN 2 AND 60),
  starts_at TEXT NOT NULL,
  time_zone TEXT NOT NULL CHECK(length(time_zone) BETWEEN 1 AND 80),
  city TEXT NOT NULL CHECK(length(city) BETWEEN 1 AND 80),
  requirements TEXT NOT NULL DEFAULT '' CHECK(length(requirements)<=2000),
  budget_currency TEXT CHECK(budget_currency IS NULL OR length(budget_currency)=3),
  budget_minor INTEGER CHECK(budget_minor IS NULL OR budget_minor>=0),
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK((budget_currency IS NULL)=(budget_minor IS NULL))
) STRICT;
CREATE INDEX events_org_date ON events(organization_id,starts_at);
