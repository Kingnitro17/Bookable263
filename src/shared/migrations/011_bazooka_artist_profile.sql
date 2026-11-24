CREATE TABLE artist_public_profiles (
  artist_id TEXT PRIMARY KEY REFERENCES artists(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE COLLATE NOCASE,
  country TEXT NOT NULL CHECK(length(country) BETWEEN 2 AND 80),
  image_url TEXT CHECK(image_url IS NULL OR length(image_url)<=500),
  profile_status TEXT NOT NULL CHECK(profile_status IN ('demo','claimed')),
  verification_status TEXT NOT NULL CHECK(verification_status IN ('awaiting_confirmation','pending','verified')),
  booking_model TEXT NOT NULL CHECK(booking_model IN ('request_quote','fixed_rate')),
  booking_currency TEXT NOT NULL CHECK(length(booking_currency)=3),
  booking_approval TEXT NOT NULL CHECK(length(booking_approval)<=200),
  availability_note TEXT NOT NULL CHECK(length(availability_note)<=300),
  claimed INTEGER NOT NULL DEFAULT 0 CHECK(claimed IN (0,1))
) STRICT;

CREATE TABLE artist_aliases (
  artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  alias TEXT NOT NULL CHECK(length(alias) BETWEEN 2 AND 120),
  PRIMARY KEY(artist_id,alias)
) STRICT;
CREATE INDEX artist_aliases_by_value ON artist_aliases(alias COLLATE NOCASE);

CREATE VIRTUAL TABLE artist_discovery_terms USING fts5(artist_id UNINDEXED,terms,tokenize='unicode61 remove_diacritics 2');

CREATE TABLE artist_catalogue_tracks (
  id TEXT PRIMARY KEY,
  artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 160),
  main_artist TEXT NOT NULL CHECK(length(main_artist) BETWEEN 1 AND 160),
  featured_artists TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(featured_artists)),
  producer TEXT,
  label TEXT,
  release_date TEXT,
  release_year INTEGER CHECK(release_year IS NULL OR release_year BETWEEN 1900 AND 2200),
  genre TEXT,
  artwork_url TEXT,
  streaming_links TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(streaming_links)),
  source_url TEXT,
  verification_status TEXT NOT NULL CHECK(verification_status IN ('unverified','pending','verified','rejected')),
  visibility TEXT NOT NULL DEFAULT 'public' CHECK(visibility IN ('public','private','hidden')),
  featured INTEGER NOT NULL DEFAULT 0 CHECK(featured IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0
) STRICT;
CREATE INDEX artist_catalogue_public ON artist_catalogue_tracks(artist_id,visibility,sort_order);
CREATE UNIQUE INDEX artist_catalogue_artist_title ON artist_catalogue_tracks(artist_id,title COLLATE NOCASE,main_artist COLLATE NOCASE);

CREATE TABLE artist_social_accounts (
  id TEXT PRIMARY KEY,
  artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK(platform IN ('youtube','audiomack','instagram','facebook','x','tiktok','spotify','apple-music')),
  url TEXT,
  username TEXT,
  verification_status TEXT NOT NULL CHECK(verification_status IN ('unverified','pending','verified')),
  last_checked_at TEXT,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK(visibility IN ('public','private','hidden')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  CHECK(url IS NOT NULL OR username IS NOT NULL)
) STRICT;
CREATE INDEX artist_social_public ON artist_social_accounts(artist_id,visibility,sort_order);
CREATE UNIQUE INDEX artist_social_artist_platform ON artist_social_accounts(artist_id,platform);

CREATE TABLE artist_analytics_snapshots (
  id TEXT PRIMARY KEY,
  artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK(length(platform) BETWEEN 2 AND 40),
  metric TEXT NOT NULL CHECK(length(metric) BETWEEN 2 AND 60),
  value INTEGER NOT NULL CHECK(value>=0),
  collection_date TEXT CHECK(collection_date IS NULL OR (length(collection_date)=10 AND date(collection_date)=collection_date)),
  source_url TEXT,
  verification_status TEXT NOT NULL CHECK(verification_status IN ('unverified','pending','verified')),
  last_updated_at TEXT,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK(visibility IN ('public','private','hidden')),
  sort_order INTEGER NOT NULL DEFAULT 0
) STRICT;
CREATE INDEX artist_analytics_public ON artist_analytics_snapshots(artist_id,visibility,sort_order);

CREATE TABLE artist_performance_history (
  id TEXT PRIMARY KEY,
  artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL CHECK(length(event_name) BETWEEN 2 AND 180),
  venue TEXT,
  city TEXT,
  country TEXT NOT NULL DEFAULT 'Zimbabwe',
  date_label TEXT NOT NULL CHECK(length(date_label) BETWEEN 2 AND 50),
  event_category TEXT,
  promotional_artwork_url TEXT,
  supporting_performers TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(supporting_performers)),
  source_url TEXT,
  verification_status TEXT NOT NULL CHECK(verification_status IN ('unverified','pending','verified')),
  completion_status TEXT NOT NULL CHECK(completion_status IN ('unknown','scheduled','completed_unverified','confirmed')),
  visibility TEXT NOT NULL DEFAULT 'public' CHECK(visibility IN ('public','private','hidden')),
  sort_order INTEGER NOT NULL DEFAULT 0
) STRICT;
CREATE INDEX artist_performance_public ON artist_performance_history(artist_id,visibility,sort_order);

CREATE TABLE artist_booking_profiles (
  artist_id TEXT PRIMARY KEY REFERENCES artists(id) ON DELETE CASCADE,
  pricing_model TEXT NOT NULL CHECK(pricing_model IN ('request_quote','fixed_rate')),
  currency_code TEXT NOT NULL CHECK(length(currency_code)=3),
  current_fee_minor INTEGER CHECK(current_fee_minor IS NULL OR current_fee_minor>=0),
  availability_status TEXT NOT NULL CHECK(availability_status IN ('enquiry_required','available','unavailable')),
  approval_required INTEGER NOT NULL CHECK(approval_required IN (0,1)),
  supported_categories TEXT NOT NULL CHECK(json_valid(supported_categories)),
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE artist_admin_audit_log (
  id TEXT PRIMARY KEY,
  artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE RESTRICT,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK(length(action) BETWEEN 2 AND 80),
  entity_type TEXT NOT NULL CHECK(length(entity_type) BETWEEN 2 AND 60),
  entity_id TEXT,
  created_at TEXT NOT NULL
) STRICT;
CREATE INDEX artist_admin_audit_artist ON artist_admin_audit_log(artist_id,created_at DESC);

INSERT OR IGNORE INTO users(id,email,password_salt,password_digest,created_at)
VALUES('b2630000-0000-4000-8000-000000000002','curated-artist-record@bookable263.invalid','disabled-no-login','',CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO user_profiles(user_id,full_name,updated_at)
VALUES('b2630000-0000-4000-8000-000000000002','Bookable263 Curated Records',CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO organizations(id,name,type,created_at)
VALUES('b2630000-0000-4000-8000-000000000003','Bookable263 Curated Artists','agency',CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO artists(id,organization_id,professional_name,artist_type,biography,base_city,years_experience,publication_status,created_by,created_at,updated_at)
VALUES(
  'b2630000-0000-4000-8000-000000000004',
  'b2630000-0000-4000-8000-000000000003',
  'Bazooka','individual',
  'Bazooka, also known professionally as Bazooker, is a Zimbabwean Zimdancehall artist known for energetic dancehall performances and releases including Kumba Kwedu, Umdala Wethu, Pullo and Ndosimba Iroro. Associated with Zimbabwe''s Zimdancehall scene and the Chillspot Records movement, he has performed across the country and built a catalogue of music that connects with dancehall audiences.',
  'Zimbabwe',NULL,'published','b2630000-0000-4000-8000-000000000002',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO artist_profile_categories(artist_id,category_slug)
VALUES('b2630000-0000-4000-8000-000000000004','musician');
INSERT OR IGNORE INTO artist_genres(artist_id,genre) VALUES
('b2630000-0000-4000-8000-000000000004','Zimdancehall'),
('b2630000-0000-4000-8000-000000000004','Dancehall'),
('b2630000-0000-4000-8000-000000000004','Reggae');
INSERT OR IGNORE INTO artist_public_profiles(artist_id,slug,country,image_url,profile_status,verification_status,booking_model,booking_currency,booking_approval,availability_note,claimed)
VALUES('b2630000-0000-4000-8000-000000000004','bazooka','Zimbabwe','/img/bazooker.png','demo','awaiting_confirmation','request_quote','USD','Artist or authorized management confirmation required.','Enquiry required; availability not confirmed.',0);
INSERT OR IGNORE INTO artist_aliases(artist_id,alias) VALUES
('b2630000-0000-4000-8000-000000000004','Bazooker'),
('b2630000-0000-4000-8000-000000000004','Bazooka Zimbabwe'),
('b2630000-0000-4000-8000-000000000004','Bazooker Zimbabwe');
INSERT INTO artist_search(artist_id,professional_name,biography,base_city)
SELECT 'b2630000-0000-4000-8000-000000000004','Bazooka','Zimbabwean Zimdancehall artist','Zimbabwe'
WHERE NOT EXISTS(SELECT 1 FROM artist_search WHERE artist_id='b2630000-0000-4000-8000-000000000004');
INSERT INTO artist_discovery_terms(artist_id,terms)
SELECT 'b2630000-0000-4000-8000-000000000004',
  'Bazooka Bazooker Bazooka Zimbabwe Bazooker Zimbabwe Zimdancehall Dancehall Reggae Chillspot Records Kumba Kwedu Umdala Wethu Mababy Akawanda Handiridi Ndogona Pullo Ndosimba Iroro Imari Radzvova Mudhuze Tenacity Zvonetsa Juliana Mafia Love Valentine Zimbabwe Abujah Havandigone Kana Zvanaka Batisisa Favour Tatenda Mahachi Babe Ndiwe Wandinoda ZimKhaled'
WHERE NOT EXISTS(SELECT 1 FROM artist_discovery_terms WHERE artist_id='b2630000-0000-4000-8000-000000000004');

INSERT OR IGNORE INTO artist_catalogue_tracks(id,artist_id,title,main_artist,featured_artists,verification_status,featured,sort_order) VALUES
('b2630000-0000-4000-8001-000000000001','b2630000-0000-4000-8000-000000000004','Kumba Kwedu','Bazooka','[]','unverified',1,1),
('b2630000-0000-4000-8001-000000000002','b2630000-0000-4000-8000-000000000004','Umdala Wethu','Bazooka','[]','unverified',1,2),
('b2630000-0000-4000-8001-000000000003','b2630000-0000-4000-8000-000000000004','Mababy Akawanda','Bazooka','[]','unverified',0,3),
('b2630000-0000-4000-8001-000000000004','b2630000-0000-4000-8000-000000000004','Handiridi','Bazooka','[]','unverified',0,4),
('b2630000-0000-4000-8001-000000000005','b2630000-0000-4000-8000-000000000004','Ndogona','Bazooka','[]','unverified',0,5),
('b2630000-0000-4000-8001-000000000006','b2630000-0000-4000-8000-000000000004','Pullo','Bazooka','[]','unverified',1,6),
('b2630000-0000-4000-8001-000000000007','b2630000-0000-4000-8000-000000000004','Ndosimba Iroro','Bazooka','[]','unverified',1,7),
('b2630000-0000-4000-8001-000000000008','b2630000-0000-4000-8000-000000000004','Imari','Bazooka','[]','unverified',0,8),
('b2630000-0000-4000-8001-000000000009','b2630000-0000-4000-8000-000000000004','Radzvova','Bazooka','[]','unverified',0,9),
('b2630000-0000-4000-8001-000000000010','b2630000-0000-4000-8000-000000000004','Mudhuze','Bazooka','["Tenacity"]','unverified',1,10),
('b2630000-0000-4000-8001-000000000011','b2630000-0000-4000-8000-000000000004','Zvonetsa','Bazooka','[]','unverified',1,11),
('b2630000-0000-4000-8001-000000000012','b2630000-0000-4000-8000-000000000004','Juliana','Bazooka','[]','unverified',1,12),
('b2630000-0000-4000-8001-000000000013','b2630000-0000-4000-8000-000000000004','Mafia Love (Valentine)','Bazooka','[]','unverified',1,13),
('b2630000-0000-4000-8001-000000000014','b2630000-0000-4000-8000-000000000004','Zimbabwe','Bazooka','["Abujah"]','unverified',0,14),
('b2630000-0000-4000-8001-000000000015','b2630000-0000-4000-8000-000000000004','Havandigone','Bazooka','[]','unverified',0,15),
('b2630000-0000-4000-8001-000000000016','b2630000-0000-4000-8000-000000000004','Kana Zvanaka','Bazooka','[]','unverified',0,16),
('b2630000-0000-4000-8001-000000000017','b2630000-0000-4000-8000-000000000004','Batisisa','Bazooka','[]','unverified',0,17),
('b2630000-0000-4000-8001-000000000018','b2630000-0000-4000-8000-000000000004','Favour','Tatenda Mahachi','["Bazooker"]','unverified',0,18),
('b2630000-0000-4000-8001-000000000019','b2630000-0000-4000-8000-000000000004','Babe','Bazooka','["Tenacity"]','unverified',0,19),
('b2630000-0000-4000-8001-000000000020','b2630000-0000-4000-8000-000000000004','Ndiwe Wandinoda','ZimKhaled','["Bazooker"]','unverified',0,20);

INSERT OR IGNORE INTO artist_social_accounts(id,artist_id,platform,url,username,verification_status,sort_order) VALUES
('b2630000-0000-4000-8002-000000000001','b2630000-0000-4000-8000-000000000004','youtube','https://www.youtube.com/@realbazookerofficial','realbazookerofficial','unverified',1),
('b2630000-0000-4000-8002-000000000002','b2630000-0000-4000-8000-000000000004','audiomack','https://audiomack.com/bazooker','bazooker','unverified',2),
('b2630000-0000-4000-8002-000000000003','b2630000-0000-4000-8000-000000000004','instagram',NULL,'real_bazookerofficial','unverified',3),
('b2630000-0000-4000-8002-000000000004','b2630000-0000-4000-8000-000000000004','facebook',NULL,'Bazooker Ndajamuka Ndabuka','unverified',4),
('b2630000-0000-4000-8002-000000000005','b2630000-0000-4000-8000-000000000004','x',NULL,'realbazookerofficial','unverified',5),
('b2630000-0000-4000-8002-000000000006','b2630000-0000-4000-8000-000000000004','tiktok',NULL,'real_bazooker_official','unverified',6);

INSERT OR IGNORE INTO artist_analytics_snapshots(id,artist_id,platform,metric,value,source_url,verification_status,visibility,sort_order) VALUES
('b2630000-0000-4000-8003-000000000001','b2630000-0000-4000-8000-000000000004','Audiomack','followers',1878,'https://audiomack.com/bazooker','unverified','public',1),
('b2630000-0000-4000-8003-000000000002','b2630000-0000-4000-8000-000000000004','Audiomack','monthly_listeners',810,'https://audiomack.com/bazooker','unverified','public',2),
('b2630000-0000-4000-8003-000000000003','b2630000-0000-4000-8000-000000000004','Audiomack','total_plays',71753,'https://audiomack.com/bazooker','unverified','public',3),
('b2630000-0000-4000-8003-000000000004','b2630000-0000-4000-8000-000000000004','YouTube','subscribers',42600,'https://www.youtube.com/@realbazookerofficial','unverified','public',4),
('b2630000-0000-4000-8003-000000000005','b2630000-0000-4000-8000-000000000004','YouTube','channel_views',7700000,'https://www.youtube.com/@realbazookerofficial','unverified','public',5);

INSERT OR IGNORE INTO artist_performance_history(id,artist_id,event_name,venue,city,date_label,event_category,supporting_performers,verification_status,completion_status,sort_order) VALUES
('b2630000-0000-4000-8004-000000000001','b2630000-0000-4000-8000-000000000004','Master Zhoe third album launch',NULL,'Gwanda','September 2019','Album launch','[]','unverified','unknown',1),
('b2630000-0000-4000-8004-000000000002','b2630000-0000-4000-8000-000000000004','Winter Ball','Comfort Pub and Grill','Victoria Falls','July 2019','Festival','[]','unverified','unknown',2),
('b2630000-0000-4000-8004-000000000003','b2630000-0000-4000-8000-000000000004','Steak ''n'' Chips official opening',NULL,'Gweru','April 2019','Opening','[]','unverified','unknown',3),
('b2630000-0000-4000-8004-000000000004','b2630000-0000-4000-8000-000000000004','Palace Hotel appearance','Palace Hotel','Bulawayo','April 2024','Live performance','[]','unverified','unknown',4),
('b2630000-0000-4000-8004-000000000005','b2630000-0000-4000-8000-000000000004','Beitbridge appearance',NULL,'Beitbridge','April 2024','Live performance','[]','unverified','unknown',5),
('b2630000-0000-4000-8004-000000000006','b2630000-0000-4000-8000-000000000004','Nightspot appearance',NULL,'Bulawayo','February 2026','Live performance','[]','unverified','unknown',6);

INSERT OR IGNORE INTO artist_booking_profiles(artist_id,pricing_model,currency_code,current_fee_minor,availability_status,approval_required,supported_categories,updated_at)
VALUES('b2630000-0000-4000-8000-000000000004','request_quote','USD',NULL,'enquiry_required',1,
  '["Nightclub performance","Festival","Corporate event","Private event","Album launch","Concert","University event","Brand activation","Community event","International performance"]',CURRENT_TIMESTAMP);
