CREATE TABLE artist_rate_cards (
  id TEXT PRIMARY KEY,
  artist_id TEXT NOT NULL UNIQUE REFERENCES artists(id) ON DELETE CASCADE,
  currency_code TEXT NOT NULL CHECK(currency_code GLOB '[A-Z][A-Z][A-Z]'),
  amount_minor INTEGER,
  custom_quote INTEGER NOT NULL CHECK(custom_quote IN (0,1)),
  price_basis TEXT NOT NULL CHECK(price_basis IN ('per_performance','per_hour','per_event')),
  expected_duration_minutes INTEGER CHECK(expected_duration_minutes BETWEEN 1 AND 1440),
  visibility TEXT NOT NULL CHECK(visibility IN ('public','private')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK((custom_quote=1 AND amount_minor IS NULL) OR (custom_quote=0 AND amount_minor IS NOT NULL AND amount_minor >= 0))
) STRICT;
