CREATE TABLE artist_categories (
  slug TEXT PRIMARY KEY,
  label TEXT NOT NULL UNIQUE
) STRICT;

INSERT INTO artist_categories(slug,label) VALUES
  ('musician','Musician'),('dj','DJ'),('band','Band'),('vocalist','Vocalist'),
  ('comedian','Comedian'),('dancer','Dancer'),('mc','MC / Host'),('performer','Other performer');

CREATE TABLE artists (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  professional_name TEXT NOT NULL CHECK(length(professional_name) BETWEEN 2 AND 100),
  artist_type TEXT NOT NULL CHECK(artist_type IN ('individual','group')),
  biography TEXT NOT NULL DEFAULT '' CHECK(length(biography) <= 1800),
  base_city TEXT NOT NULL DEFAULT '' CHECK(length(base_city) <= 80),
  years_experience INTEGER CHECK(years_experience BETWEEN 0 AND 80),
  publication_status TEXT NOT NULL DEFAULT 'draft' CHECK(publication_status IN ('draft','published')),
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE INDEX artists_public_city ON artists(publication_status,base_city,created_at DESC);
CREATE INDEX artists_by_organization ON artists(organization_id,created_at DESC);
CREATE UNIQUE INDEX artists_org_professional_name ON artists(organization_id,professional_name COLLATE NOCASE);

CREATE TABLE artist_profile_categories (
  artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  category_slug TEXT NOT NULL REFERENCES artist_categories(slug) ON DELETE RESTRICT,
  PRIMARY KEY(artist_id,category_slug)
) STRICT;

CREATE TABLE artist_genres (
  artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  genre TEXT NOT NULL CHECK(length(genre) BETWEEN 2 AND 40),
  PRIMARY KEY(artist_id,genre)
) STRICT;

CREATE VIRTUAL TABLE artist_search USING fts5(artist_id UNINDEXED, professional_name, biography, base_city, tokenize='unicode61 remove_diacritics 2');
