CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_salt TEXT NOT NULL,
  password_digest TEXT NOT NULL,
  created_at TEXT NOT NULL
) STRICT;

CREATE TABLE user_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL CHECK(length(full_name) BETWEEN 2 AND 80),
  display_name TEXT,
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE user_roles (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('artist','manager','organizer','venue_staff','platform_admin')),
  assigned_at TEXT NOT NULL,
  PRIMARY KEY(user_id,role)
) STRICT;

CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 2 AND 100),
  type TEXT NOT NULL CHECK(type IN ('artist','agency','venue','promoter','other')),
  created_at TEXT NOT NULL
) STRICT;

CREATE TABLE organization_members (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('owner','admin','member')),
  created_at TEXT NOT NULL,
  UNIQUE(organization_id,user_id)
) STRICT;

CREATE INDEX organization_members_by_user ON organization_members(user_id,organization_id);

CREATE TABLE member_permissions (
  membership_id TEXT NOT NULL REFERENCES organization_members(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  granted_at TEXT NOT NULL,
  PRIMARY KEY(membership_id,permission)
) STRICT;

CREATE TABLE auth_sessions (
  token_hash TEXT PRIMARY KEY,
  csrf_hash TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
) STRICT;

CREATE INDEX auth_sessions_expiry ON auth_sessions(expires_at);

CREATE TABLE legacy_imports (
  source TEXT PRIMARY KEY,
  imported_at TEXT NOT NULL
) STRICT;
