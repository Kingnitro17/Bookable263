CREATE TABLE booking_requests (
  id TEXT PRIMARY KEY,
  organizer_organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE RESTRICT,
  requested_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  performance_date TEXT NOT NULL CHECK(length(performance_date)=10 AND date(performance_date)=performance_date),
  start_time TEXT NOT NULL CHECK(length(start_time)=5),
  time_zone TEXT NOT NULL CHECK(length(time_zone) BETWEEN 1 AND 80),
  duration_minutes INTEGER CHECK(duration_minutes IS NULL OR duration_minutes BETWEEN 1 AND 1440),
  event_type TEXT NOT NULL CHECK(length(event_type) BETWEEN 2 AND 60),
  location TEXT NOT NULL CHECK(length(location) BETWEEN 1 AND 120),
  budget_currency TEXT CHECK(budget_currency IS NULL OR length(budget_currency)=3),
  budget_minor INTEGER CHECK(budget_minor IS NULL OR budget_minor>=0),
  requirements TEXT NOT NULL DEFAULT '' CHECK(length(requirements)<=2000),
  notes TEXT NOT NULL DEFAULT '' CHECK(length(notes)<=2000),
  state TEXT NOT NULL CHECK(state IN ('requested','declined','quoted','negotiating','terms_agreed','confirmed','completed','cancelled')) DEFAULT 'requested',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK((budget_currency IS NULL)=(budget_minor IS NULL))
) STRICT;
CREATE INDEX booking_requests_artist_state ON booking_requests(artist_id,state,created_at);
CREATE INDEX booking_requests_org_state ON booking_requests(organizer_organization_id,state,created_at);
CREATE TABLE booking_status_history (
  id TEXT PRIMARY KEY,
  booking_request_id TEXT NOT NULL REFERENCES booking_requests(id) ON DELETE RESTRICT,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  from_state TEXT,
  to_state TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '' CHECK(length(note)<=1000),
  created_at TEXT NOT NULL
) STRICT;
CREATE TABLE booking_quotes (
  id TEXT PRIMARY KEY,
  booking_request_id TEXT NOT NULL REFERENCES booking_requests(id) ON DELETE RESTRICT,
  version INTEGER NOT NULL CHECK(version>0),
  currency_code TEXT NOT NULL CHECK(length(currency_code)=3),
  performance_fee_minor INTEGER NOT NULL CHECK(performance_fee_minor>=0),
  transport_minor INTEGER NOT NULL DEFAULT 0 CHECK(transport_minor>=0),
  accommodation_minor INTEGER NOT NULL DEFAULT 0 CHECK(accommodation_minor>=0),
  equipment_minor INTEGER NOT NULL DEFAULT 0 CHECK(equipment_minor>=0),
  deposit_minor INTEGER NOT NULL DEFAULT 0 CHECK(deposit_minor>=0),
  terms TEXT NOT NULL DEFAULT '' CHECK(length(terms)<=3000),
  valid_until TEXT NOT NULL,
  submitted_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  UNIQUE(booking_request_id,version)
) STRICT;
CREATE INDEX booking_quotes_request ON booking_quotes(booking_request_id,version DESC);
