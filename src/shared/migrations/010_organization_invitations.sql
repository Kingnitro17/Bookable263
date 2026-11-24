CREATE TABLE organization_invitations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL COLLATE NOCASE,
  invited_role TEXT NOT NULL CHECK(invited_role IN ('admin','member')),
  permissions_json TEXT NOT NULL DEFAULT '[]',
  token_hash TEXT NOT NULL UNIQUE,
  invited_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  expires_at INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending','accepted','revoked','expired')) DEFAULT 'pending',
  accepted_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  accepted_at TEXT
) STRICT;
CREATE INDEX organization_invitations_org_status ON organization_invitations(organization_id,status,created_at);
