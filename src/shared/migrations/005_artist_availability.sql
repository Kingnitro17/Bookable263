CREATE TABLE artist_availability_days (
  artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  local_date TEXT NOT NULL CHECK(length(local_date)=10 AND date(local_date)=local_date),
  time_zone TEXT NOT NULL CHECK(length(time_zone) BETWEEN 1 AND 80),
  status TEXT NOT NULL CHECK(status IN ('available','unavailable')),
  updated_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(artist_id,local_date)
) STRICT;

CREATE INDEX artist_availability_search ON artist_availability_days(local_date,time_zone,status,artist_id);
