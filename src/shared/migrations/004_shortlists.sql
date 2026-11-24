CREATE TABLE shortlists (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 2 AND 80),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id,name COLLATE NOCASE)
) STRICT;

CREATE INDEX shortlists_by_user ON shortlists(user_id,updated_at DESC);

CREATE TABLE shortlist_artists (
  shortlist_id TEXT NOT NULL REFERENCES shortlists(id) ON DELETE CASCADE,
  artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  added_at TEXT NOT NULL,
  PRIMARY KEY(shortlist_id,artist_id)
) STRICT;

CREATE INDEX shortlist_artists_by_artist ON shortlist_artists(artist_id,shortlist_id);

CREATE TABLE artist_comparisons (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 2 AND 80),
  created_at TEXT NOT NULL,
  UNIQUE(user_id,name COLLATE NOCASE)
) STRICT;

CREATE TABLE comparison_artists (
  comparison_id TEXT NOT NULL REFERENCES artist_comparisons(id) ON DELETE CASCADE,
  artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL CHECK(sort_order BETWEEN 0 AND 3),
  PRIMARY KEY(comparison_id,artist_id),
  UNIQUE(comparison_id,sort_order)
) STRICT;
