CREATE TABLE performances (
  id TEXT PRIMARY KEY,
  booking_request_id TEXT NOT NULL UNIQUE REFERENCES booking_requests(id) ON DELETE RESTRICT,
  artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE RESTRICT,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  performance_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending','verified','rejected')) DEFAULT 'pending',
  submitted_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  verification_source TEXT CHECK(verification_source IS NULL OR verification_source IN ('organizer_confirmed','artist_confirmed')),
  verified_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  verified_at TEXT,
  created_at TEXT NOT NULL
) STRICT;
CREATE TABLE performance_evidence (
  id TEXT PRIMARY KEY,
  performance_id TEXT NOT NULL REFERENCES performances(id) ON DELETE RESTRICT,
  submitted_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  evidence_url TEXT NOT NULL CHECK(length(evidence_url)<=1000),
  caption TEXT NOT NULL DEFAULT '' CHECK(length(caption)<=500),
  created_at TEXT NOT NULL
) STRICT;
CREATE TABLE performance_reviews (
  id TEXT PRIMARY KEY,
  performance_id TEXT NOT NULL REFERENCES performances(id) ON DELETE RESTRICT,
  reviewer_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reviewee_artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE RESTRICT,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  body TEXT NOT NULL DEFAULT '' CHECK(length(body)<=1500),
  created_at TEXT NOT NULL,
  UNIQUE(performance_id,reviewer_user_id)
) STRICT;
CREATE INDEX performances_artist_verified ON performances(artist_id,status,performance_date);
CREATE INDEX reviews_artist ON performance_reviews(reviewee_artist_id,created_at);
