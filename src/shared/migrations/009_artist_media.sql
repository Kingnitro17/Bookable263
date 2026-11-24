CREATE TABLE artist_media_assets (
  id TEXT PRIMARY KEY,
  artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK(media_type IN ('photo','video')),
  storage_key TEXT,
  source_url TEXT,
  caption TEXT NOT NULL DEFAULT '' CHECK(length(caption)<=300),
  visibility TEXT NOT NULL CHECK(visibility IN ('public','private')) DEFAULT 'public',
  submitted_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  CHECK((media_type='photo' AND storage_key IS NOT NULL AND source_url IS NULL) OR (media_type='video' AND storage_key IS NULL AND source_url IS NOT NULL))
) STRICT;
CREATE INDEX artist_media_gallery ON artist_media_assets(artist_id,visibility,created_at);
