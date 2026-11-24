import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';

const migrations = [
  readFileSync(new URL('./migrations/001_identity_organizations.sql', import.meta.url), 'utf8'),
  readFileSync(new URL('./migrations/002_artist_profiles.sql', import.meta.url), 'utf8'),
  readFileSync(new URL('./migrations/003_artist_rate_cards.sql', import.meta.url), 'utf8'),
  readFileSync(new URL('./migrations/004_shortlists.sql', import.meta.url), 'utf8'),
  readFileSync(new URL('./migrations/005_artist_availability.sql', import.meta.url), 'utf8'),
  readFileSync(new URL('./migrations/006_venues_events.sql', import.meta.url), 'utf8'),
  readFileSync(new URL('./migrations/007_booking_marketplace.sql', import.meta.url), 'utf8'),
  readFileSync(new URL('./migrations/008_performances_reputation.sql', import.meta.url), 'utf8'),
  readFileSync(new URL('./migrations/009_artist_media.sql', import.meta.url), 'utf8'),
  readFileSync(new URL('./migrations/010_organization_invitations.sql', import.meta.url), 'utf8'),
  readFileSync(new URL('./migrations/011_bazooka_artist_profile.sql', import.meta.url), 'utf8')
];
const schemaVersion = migrations.length;
const iso = value => value || new Date().toISOString();
const mapArtist=row=>row?{id:row.id,organizationId:row.organization_id,name:row.professional_name,type:row.artist_type,biography:row.biography,baseCity:row.base_city,yearsExperience:row.years_experience,publicationStatus:row.publication_status,categories:JSON.parse(row.categories),genres:JSON.parse(row.genres),rateCard:row.rate_card?JSON.parse(row.rate_card):null,profileSlug:row.profile_slug||null,profileImageUrl:row.profile_image_url||null,profileSource:row.profile_source||null,claimed:row.claimed===1,createdAt:row.created_at}:null;
const artistFields=`a.*,COALESCE((SELECT json_group_array(json_object('slug',c.slug,'label',c.label)) FROM artist_profile_categories ac JOIN artist_categories c ON c.slug=ac.category_slug WHERE ac.artist_id=a.id),'[]') AS categories,
  COALESCE((SELECT json_group_array(genre) FROM artist_genres WHERE artist_id=a.id),'[]') AS genres,
  (SELECT slug FROM artist_public_profiles WHERE artist_id=a.id) AS profile_slug,
  (SELECT image_url FROM artist_public_profiles WHERE artist_id=a.id) AS profile_image_url,
  (SELECT 'curated' FROM artist_public_profiles WHERE artist_id=a.id) AS profile_source,
  (SELECT claimed FROM artist_public_profiles WHERE artist_id=a.id) AS claimed`;
const managerArtistSelect=`${artistFields},(SELECT json_object('currencyCode',currency_code,'amountMinor',amount_minor,'customQuote',custom_quote,'priceBasis',price_basis,'expectedDurationMinutes',expected_duration_minutes,'visibility',visibility) FROM artist_rate_cards rc WHERE rc.artist_id=a.id) AS rate_card`;
const publicArtistSelect=`${artistFields},(SELECT json_object('currencyCode',currency_code,'amountMinor',amount_minor,'customQuote',custom_quote,'priceBasis',price_basis,'expectedDurationMinutes',expected_duration_minutes,'visibility',visibility) FROM artist_rate_cards rc WHERE rc.artist_id=a.id AND rc.visibility='public') AS rate_card`;

export function openDatabase(file) {
  const db = new DatabaseSync(file, { timeout: 5000 });
  db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;');
  const version = db.prepare('PRAGMA user_version').get().user_version;
  if (version > schemaVersion) throw new Error(`Database version ${version} is newer than this application supports (${schemaVersion}).`);
  for(let nextVersion=version+1;nextVersion<=schemaVersion;nextVersion++) {
    db.exec('BEGIN IMMEDIATE;');
    try { db.exec(migrations[nextVersion-1]); db.exec(`PRAGMA user_version = ${nextVersion};`); db.exec('COMMIT;'); }
    catch (error) { db.exec('ROLLBACK;'); throw error; }
  }

  const insertUser = db.prepare('INSERT INTO users(id,email,password_salt,password_digest,created_at) VALUES(?,?,?,?,?)');
  const insertProfile = db.prepare('INSERT INTO user_profiles(user_id,full_name,updated_at) VALUES(?,?,?)');
  const insertRole = db.prepare('INSERT OR IGNORE INTO user_roles(user_id,role,assigned_at) VALUES(?,?,?)');
  const repository = {
    userByEmail(email) {
      const row = db.prepare(`SELECT u.id,u.email,u.password_salt,u.password_digest,u.created_at,p.full_name,
        COALESCE((SELECT json_group_array(role) FROM user_roles WHERE user_id=u.id),'[]') AS roles
        FROM users u JOIN user_profiles p ON p.user_id=u.id WHERE u.email=? COLLATE NOCASE`).get(email);
      return row && { id:row.id, name:row.full_name, email:row.email, createdAt:row.created_at,
        password:{ salt:row.password_salt,digest:row.password_digest }, roles:JSON.parse(row.roles) };
    },
    userById(id) {
      const row = db.prepare(`SELECT u.id,u.email,p.full_name,
        COALESCE((SELECT json_group_array(role) FROM user_roles WHERE user_id=u.id),'[]') AS roles
        FROM users u JOIN user_profiles p ON p.user_id=u.id WHERE u.id=?`).get(id);
      return row && { id:row.id,name:row.full_name,email:row.email,roles:JSON.parse(row.roles) };
    },
    createUser({ id,name,email,password,createdAt,roles }) {
      db.exec('BEGIN IMMEDIATE;');
      try {
        insertUser.run(id,email,password.salt,password.digest,createdAt);
        insertProfile.run(id,name,createdAt);
        for (const role of roles) insertRole.run(id,role,createdAt);
        db.exec('COMMIT;');
      } catch(error) { db.exec('ROLLBACK;'); if (String(error.message).includes('UNIQUE constraint failed: users.email')) error.status=409; throw error; }
      return repository.userById(id);
    },
    addUserRoles(userId, roles) {
      const now=new Date().toISOString(); db.exec('BEGIN IMMEDIATE;');
      try { for (const role of roles) insertRole.run(userId,role,now); db.exec('COMMIT;'); }
      catch(error) { db.exec('ROLLBACK;'); throw error; }
      return repository.userById(userId);
    },
    createSession({ tokenHash,csrfHash,userId,expiresAt,createdAt=Date.now() }) {
      db.prepare('DELETE FROM auth_sessions WHERE expires_at <= ?').run(Date.now());
      db.prepare('INSERT INTO auth_sessions(token_hash,csrf_hash,user_id,expires_at,created_at) VALUES(?,?,?,?,?)').run(tokenHash,csrfHash,userId,expiresAt,createdAt);
    },
    sessionByTokenHash(tokenHash) { return db.prepare('SELECT csrf_hash,user_id,expires_at FROM auth_sessions WHERE token_hash=?').get(tokenHash); },
    rotateSessionCsrf(tokenHash,csrfHash) { return db.prepare('UPDATE auth_sessions SET csrf_hash=? WHERE token_hash=? AND expires_at>?').run(csrfHash,tokenHash,Date.now()).changes===1; },
    deleteSession(tokenHash) { db.prepare('DELETE FROM auth_sessions WHERE token_hash=?').run(tokenHash); },
    organizationsForUser(userId) {
      return db.prepare(`SELECT o.id,o.name,o.type,o.created_at AS createdAt,om.role,
        COALESCE((SELECT json_group_array(permission) FROM member_permissions WHERE membership_id=om.id),'[]') AS permissions
        FROM organizations o JOIN organization_members om ON om.organization_id=o.id WHERE om.user_id=? ORDER BY o.created_at DESC`).all(userId)
        .map(row=>({ id:row.id,name:row.name,type:row.type,createdAt:row.createdAt,role:row.role,permissions:JSON.parse(row.permissions) }));
    },
    createOrganization({ id,name,type,userId,createdAt }) {
      const membershipId=randomUUID(); db.exec('BEGIN IMMEDIATE;');
      try {
        db.prepare('INSERT INTO organizations(id,name,type,created_at) VALUES(?,?,?,?)').run(id,name,type,createdAt);
        db.prepare('INSERT INTO organization_members(id,organization_id,user_id,role,created_at) VALUES(?,?,?,\'owner\',?)').run(membershipId,id,userId,createdAt);
        db.prepare('INSERT INTO member_permissions(membership_id,permission,granted_at) VALUES(?,?,?)').run(membershipId,'organization.manage',createdAt);
        db.exec('COMMIT;');
      } catch(error) { db.exec('ROLLBACK;'); throw error; }
      return { id,name,type,createdAt };
    },
    canManageOrganization(userId,organizationId) {
      return Boolean(db.prepare(`SELECT 1 FROM organization_members om
        JOIN member_permissions mp ON mp.membership_id=om.id
        WHERE om.user_id=? AND om.organization_id=? AND mp.permission='organization.manage'`).get(userId,organizationId));
    },
    managedOrganization(userId,organizationId) {
      return db.prepare(`SELECT o.id,o.type FROM organizations o JOIN organization_members om ON om.organization_id=o.id
        JOIN member_permissions mp ON mp.membership_id=om.id WHERE o.id=? AND om.user_id=? AND mp.permission='organization.manage'`).get(organizationId,userId);
    },
    artistCategories() { return db.prepare('SELECT slug,label FROM artist_categories ORDER BY label').all(); },
    createArtist({id,organizationId,name,type,biography,baseCity,yearsExperience,createdBy,categories,genres,createdAt}) {
      db.exec('BEGIN IMMEDIATE;');
      try {
        db.prepare(`INSERT INTO artists(id,organization_id,professional_name,artist_type,biography,base_city,years_experience,created_by,created_at,updated_at)
          VALUES(?,?,?,?,?,?,?,?,?,?)`).run(id,organizationId,name,type,biography,baseCity,yearsExperience,createdBy,createdAt,createdAt);
        const addCategory=db.prepare('INSERT INTO artist_profile_categories(artist_id,category_slug) VALUES(?,?)');
        for(const slug of categories)addCategory.run(id,slug);
        const addGenre=db.prepare('INSERT INTO artist_genres(artist_id,genre) VALUES(?,?)');
        for(const genre of genres)addGenre.run(id,genre);
        db.prepare('INSERT INTO artist_search(artist_id,professional_name,biography,base_city) VALUES(?,?,?,?)').run(id,name,biography,baseCity);
        db.exec('COMMIT;');
      } catch(error) { db.exec('ROLLBACK;'); if(String(error.message).includes('artists.organization_id, artists.professional_name'))error.status=409; throw error; }
      return repository.artistByIdForManager(id,createdBy);
    },
    artistByIdForManager(id,userId) {
      const row=db.prepare(`SELECT ${managerArtistSelect} FROM artists a WHERE a.id=? AND EXISTS(SELECT 1 FROM organization_members om JOIN member_permissions mp ON mp.membership_id=om.id WHERE om.user_id=? AND om.organization_id=a.organization_id AND mp.permission='organization.manage')`).get(id,userId);
      return mapArtist(row);
    },
    updateArtist({id,userId,name,type,biography,baseCity,yearsExperience,categories,genres,updatedAt}) {
      db.exec('BEGIN IMMEDIATE;');
      try {
        const result=db.prepare(`UPDATE artists SET professional_name=?,artist_type=?,biography=?,base_city=?,years_experience=?,updated_at=?
          WHERE id=? AND EXISTS(SELECT 1 FROM organization_members om JOIN member_permissions mp ON mp.membership_id=om.id WHERE om.user_id=? AND om.organization_id=artists.organization_id AND mp.permission='organization.manage')`).run(name,type,biography,baseCity,yearsExperience,updatedAt,id,userId);
        if(!result.changes){db.exec('ROLLBACK;');return null;}
        db.prepare('DELETE FROM artist_profile_categories WHERE artist_id=?').run(id);
        const addCategory=db.prepare('INSERT INTO artist_profile_categories(artist_id,category_slug) VALUES(?,?)');for(const slug of categories)addCategory.run(id,slug);
        db.prepare('DELETE FROM artist_genres WHERE artist_id=?').run(id);
        const addGenre=db.prepare('INSERT INTO artist_genres(artist_id,genre) VALUES(?,?)');for(const genre of genres)addGenre.run(id,genre);
        const artist=db.prepare('SELECT id,professional_name,biography,base_city FROM artists WHERE id=?').get(id);
        db.prepare('DELETE FROM artist_search WHERE artist_id=?').run(id);
        db.prepare('INSERT INTO artist_search(artist_id,professional_name,biography,base_city) VALUES(?,?,?,?)').run(artist.id,artist.professional_name,artist.biography,artist.base_city);
        db.exec('COMMIT;');
      } catch(error) { db.exec('ROLLBACK;');if(String(error.message).includes('artists_org_professional_name')||String(error.message).includes('artists.organization_id, artists.professional_name'))error.status=409;throw error; }
      return repository.artistByIdForManager(id,userId);
    },
    setArtistRateCard({id,artistId,userId,currencyCode,amountMinor,customQuote,priceBasis,durationMinutes,visibility,updatedAt}) {
      const authorized=db.prepare(`SELECT a.id FROM artists a WHERE a.id=? AND EXISTS(SELECT 1 FROM organization_members om JOIN member_permissions mp ON mp.membership_id=om.id WHERE om.user_id=? AND om.organization_id=a.organization_id AND mp.permission='organization.manage')`).get(artistId,userId);
      if(!authorized)return null;
      const existing=db.prepare('SELECT id,created_at FROM artist_rate_cards WHERE artist_id=?').get(artistId);const cardId=existing?.id||id;const createdAt=existing?.created_at||updatedAt;
      db.prepare(`INSERT INTO artist_rate_cards(id,artist_id,currency_code,amount_minor,custom_quote,price_basis,expected_duration_minutes,visibility,created_at,updated_at)
        VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(artist_id) DO UPDATE SET currency_code=excluded.currency_code,amount_minor=excluded.amount_minor,custom_quote=excluded.custom_quote,price_basis=excluded.price_basis,expected_duration_minutes=excluded.expected_duration_minutes,visibility=excluded.visibility,updated_at=excluded.updated_at`).run(cardId,artistId,currencyCode,amountMinor,customQuote?1:0,priceBasis,durationMinutes,visibility,createdAt,updatedAt);
      return repository.artistByIdForManager(artistId,userId)?.rateCard||null;
    },
    publishArtist(id,userId) {
      const owns=db.prepare(`SELECT a.id FROM artists a JOIN artist_profile_categories ac ON ac.artist_id=a.id
        JOIN organization_members om ON om.organization_id=a.organization_id JOIN member_permissions mp ON mp.membership_id=om.id
        WHERE a.id=? AND om.user_id=? AND mp.permission='organization.manage' LIMIT 1`).get(id,userId);
      if(!owns)return null;
      db.prepare("UPDATE artists SET publication_status='published',updated_at=? WHERE id=?").run(new Date().toISOString(),id);
      return repository.artistByIdForManager(id,userId);
    },
    managedArtists(userId) {
      return db.prepare(`SELECT ${managerArtistSelect} FROM artists a WHERE EXISTS(SELECT 1 FROM organization_members om JOIN member_permissions mp ON mp.membership_id=om.id WHERE om.user_id=? AND om.organization_id=a.organization_id AND mp.permission='organization.manage') ORDER BY a.updated_at DESC`).all(userId).map(mapArtist);
    },
    publicArtist(id) {
      return mapArtist(db.prepare(`SELECT ${publicArtistSelect} FROM artists a WHERE a.id=? AND a.publication_status='published'`).get(id));
    },
    publicArtistEditorialProfile(slug) {
      const row=db.prepare(`SELECT ${publicArtistSelect},p.country,p.profile_status AS profileStatus,p.verification_status AS verificationStatus,
        p.booking_model AS bookingModel,p.booking_currency AS bookingCurrency,p.booking_approval AS bookingApproval,p.availability_note AS availabilityNote
        FROM artist_public_profiles p JOIN artists a ON a.id=p.artist_id
        WHERE (p.slug=? COLLATE NOCASE OR EXISTS(SELECT 1 FROM artist_aliases al WHERE al.artist_id=a.id AND al.alias=? COLLATE NOCASE))
          AND a.publication_status='published'`).get(slug,slug);
      if(!row)return null;
      const artist=mapArtist(row);
      const tracks=db.prepare(`SELECT title,main_artist AS mainArtist,featured_artists AS featuredArtists,producer,label,release_date AS releaseDate,release_year AS releaseYear,
        genre,artwork_url AS artworkUrl,streaming_links AS streamingLinks,source_url AS sourceUrl,verification_status AS verificationStatus,featured,sort_order AS sortOrder
        FROM artist_catalogue_tracks WHERE artist_id=? AND visibility='public' ORDER BY sort_order,title COLLATE NOCASE`).all(artist.id)
        .map(track=>({...track,featuredArtists:JSON.parse(track.featuredArtists),streamingLinks:JSON.parse(track.streamingLinks),featured:Boolean(track.featured)}));
      const socials=db.prepare(`SELECT platform,url,username,verification_status AS verificationStatus,last_checked_at AS lastCheckedAt
        FROM artist_social_accounts WHERE artist_id=? AND visibility='public' ORDER BY sort_order`).all(artist.id);
      const analytics=db.prepare(`SELECT platform,metric,value,collection_date AS collectionDate,source_url AS sourceUrl,verification_status AS verificationStatus,last_updated_at AS lastUpdatedAt
        FROM artist_analytics_snapshots WHERE artist_id=? AND visibility='public' ORDER BY sort_order`).all(artist.id);
      const performances=db.prepare(`SELECT event_name AS eventName,venue,city,country,date_label AS dateLabel,event_category AS eventCategory,
        supporting_performers AS supportingPerformers,source_url AS sourceUrl,verification_status AS verificationStatus,completion_status AS completionStatus
        FROM artist_performance_history WHERE artist_id=? AND visibility='public' ORDER BY sort_order`).all(artist.id)
        .map(item=>({...item,supportingPerformers:JSON.parse(item.supportingPerformers)}));
      const booking=db.prepare(`SELECT pricing_model AS pricingModel,currency_code AS currencyCode,current_fee_minor AS currentFeeMinor,
        availability_status AS availabilityStatus,approval_required AS approvalRequired,supported_categories AS supportedCategories
        FROM artist_booking_profiles WHERE artist_id=?`).get(artist.id);
      return {...artist,country:row.country,profileStatus:row.profileStatus,verificationStatus:row.verificationStatus,bookingModel:row.bookingModel,
        bookingCurrency:row.bookingCurrency,bookingApproval:row.bookingApproval,availabilityNote:row.availabilityNote,tracks,socials,analytics,performances,
        booking:booking?{...booking,currentFeeMinor:booking.currentFeeMinor===null?null:Number(booking.currentFeeMinor),approvalRequired:Boolean(booking.approvalRequired),supportedCategories:JSON.parse(booking.supportedCategories)}:null};
    },
    searchArtists({query,category,genre,location,availableOn,timeZone,limit,offset}) {
      const clauses=["a.publication_status='published'"];const params=[];let join='';
      if(query){const tokens=query.normalize('NFKD').replace(/[^\p{L}\p{N}\s]/gu,' ').trim().split(/\s+/u).filter(Boolean);if(tokens.length){clauses.push("(a.id IN (SELECT artist_id FROM artist_search WHERE artist_search MATCH ?) OR a.id IN (SELECT artist_id FROM artist_discovery_terms WHERE artist_discovery_terms MATCH ?))");const match=tokens.map(token=>`"${token}"*`).join(' AND ');params.push(match,match);}}
      if(category){clauses.push('EXISTS(SELECT 1 FROM artist_profile_categories ac WHERE ac.artist_id=a.id AND ac.category_slug=?)');params.push(category);}
      if(genre){clauses.push('EXISTS(SELECT 1 FROM artist_genres g WHERE g.artist_id=a.id AND g.genre=? COLLATE NOCASE)');params.push(genre);}
      if(location){clauses.push('a.base_city LIKE ? COLLATE NOCASE');params.push(`${location}%`);}
      if(availableOn&&timeZone){clauses.push("EXISTS(SELECT 1 FROM artist_availability_days av WHERE av.artist_id=a.id AND av.local_date=? AND av.time_zone=? AND av.status='available')");params.push(availableOn,timeZone);}
      const where=clauses.join(' AND ');const total=db.prepare(`SELECT COUNT(*) AS total FROM artists a${join} WHERE ${where}`).get(...params).total;
      const rows=db.prepare(`SELECT ${publicArtistSelect} FROM artists a${join} WHERE ${where} ORDER BY a.created_at DESC LIMIT ? OFFSET ?`).all(...params,limit,offset);
      return {total,artists:rows.map(mapArtist)};
    },
    setAvailability({artistId,userId,localDate,timeZone,status,updatedAt}) {
      const manages=db.prepare(`SELECT 1 FROM artists a WHERE a.id=? AND EXISTS(SELECT 1 FROM organization_members om JOIN member_permissions mp ON mp.membership_id=om.id WHERE om.user_id=? AND om.organization_id=a.organization_id AND mp.permission='organization.manage')`).get(artistId,userId);
      if(!manages)return null;
      db.prepare(`INSERT INTO artist_availability_days(artist_id,local_date,time_zone,status,updated_by,updated_at) VALUES(?,?,?,?,?,?)
        ON CONFLICT(artist_id,local_date) DO UPDATE SET time_zone=excluded.time_zone,status=excluded.status,updated_by=excluded.updated_by,updated_at=excluded.updated_at`).run(artistId,localDate,timeZone,status,userId,updatedAt);
      return {artistId,localDate,timeZone,status,updatedAt};
    },
    availabilityForManager(artistId,userId) {
      const rows=db.prepare(`SELECT av.local_date AS localDate,av.time_zone AS timeZone,av.status,av.updated_at AS updatedAt
        FROM artist_availability_days av JOIN artists a ON a.id=av.artist_id WHERE av.artist_id=? AND EXISTS(SELECT 1 FROM organization_members om JOIN member_permissions mp ON mp.membership_id=om.id WHERE om.user_id=? AND om.organization_id=a.organization_id AND mp.permission='organization.manage') ORDER BY av.local_date`).all(artistId,userId);
      return rows;
    },
    publicAvailability(artistId,{from,to}) {
      if(!db.prepare("SELECT 1 FROM artists WHERE id=? AND publication_status='published'").get(artistId))return null;
      return db.prepare("SELECT local_date AS localDate,time_zone AS timeZone,'artist_submitted' AS source FROM artist_availability_days WHERE artist_id=? AND local_date BETWEEN ? AND ? AND status='available' ORDER BY local_date").all(artistId,from,to);
    },
    deleteAvailability({artistId,userId,localDate}) {
      return db.prepare(`DELETE FROM artist_availability_days WHERE artist_id=? AND local_date=? AND EXISTS(SELECT 1 FROM artists a JOIN organization_members om ON om.organization_id=a.organization_id JOIN member_permissions mp ON mp.membership_id=om.id WHERE a.id=artist_availability_days.artist_id AND om.user_id=? AND mp.permission='organization.manage')`).run(artistId,localDate,userId).changes===1;
    },
    createShortlist({id,userId,name,createdAt}) {
      try{db.prepare('INSERT INTO shortlists(id,user_id,name,created_at,updated_at) VALUES(?,?,?,?,?)').run(id,userId,name,createdAt,createdAt)}catch(error){if(String(error.message).includes('shortlists.user_id, shortlists.name'))error.status=409;throw error;}
      return {id,userId,name,createdAt,updatedAt:createdAt,artistCount:0};
    },
    shortlistsForUser(userId) {
      return db.prepare(`SELECT s.id,s.name,s.created_at AS createdAt,s.updated_at AS updatedAt,COUNT(sa.artist_id) AS artistCount
        FROM shortlists s LEFT JOIN shortlist_artists sa ON sa.shortlist_id=s.id WHERE s.user_id=? GROUP BY s.id ORDER BY s.updated_at DESC`).all(userId);
    },
    shortlistForUser(shortlistId,userId) {
      const list=db.prepare('SELECT id,name,created_at AS createdAt,updated_at AS updatedAt FROM shortlists WHERE id=? AND user_id=?').get(shortlistId,userId);
      if(!list)return null;
      const artists=db.prepare(`SELECT ${publicArtistSelect} FROM shortlist_artists sa JOIN artists a ON a.id=sa.artist_id
        WHERE sa.shortlist_id=? AND a.publication_status='published' ORDER BY sa.added_at DESC`).all(shortlistId).map(mapArtist);
      return {...list,artists};
    },
    addArtistToShortlist({shortlistId,userId,artistId,addedAt}) {
      const isOwner=db.prepare('SELECT 1 FROM shortlists WHERE id=? AND user_id=?').get(shortlistId,userId);
      if(!isOwner)return null;
      const isPublic=db.prepare("SELECT 1 FROM artists WHERE id=? AND publication_status='published'").get(artistId);
      if(!isPublic)return false;
      db.prepare('INSERT INTO shortlist_artists(shortlist_id,artist_id,added_at) VALUES(?,?,?) ON CONFLICT(shortlist_id,artist_id) DO NOTHING').run(shortlistId,artistId,addedAt);
      db.prepare('UPDATE shortlists SET updated_at=? WHERE id=?').run(addedAt,shortlistId);
      return repository.shortlistForUser(shortlistId,userId);
    },
    removeArtistFromShortlist({shortlistId,userId,artistId}) {
      const isOwner=db.prepare('SELECT 1 FROM shortlists WHERE id=? AND user_id=?').get(shortlistId,userId);
      if(!isOwner)return null;
      db.prepare('DELETE FROM shortlist_artists WHERE shortlist_id=? AND artist_id=?').run(shortlistId,artistId);
      db.prepare('UPDATE shortlists SET updated_at=? WHERE id=?').run(new Date().toISOString(),shortlistId);
      return true;
    },
    deleteShortlist(shortlistId,userId) { return db.prepare('DELETE FROM shortlists WHERE id=? AND user_id=?').run(shortlistId,userId).changes===1; },
    createComparison({id,userId,name,artistIds,createdAt}) {
      db.exec('BEGIN IMMEDIATE;');
      try {
        db.prepare('INSERT INTO artist_comparisons(id,user_id,name,created_at) VALUES(?,?,?,?)').run(id,userId,name,createdAt);
        const add=db.prepare('INSERT INTO comparison_artists(comparison_id,artist_id,sort_order) SELECT ?,id,? FROM artists WHERE id=? AND publication_status=\'published\'');
        for(let i=0;i<artistIds.length;i++){const result=add.run(id,i,artistIds[i]);if(!result.changes)throw Object.assign(new Error('An artist is no longer publicly available.'),{status:404});}
        db.exec('COMMIT;');
      }catch(error){db.exec('ROLLBACK;');if(String(error.message).includes('artist_comparisons.user_id, artist_comparisons.name'))error.status=409;throw error;}
      return repository.comparisonForUser(id,userId);
    },
    comparisonsForUser(userId) { return db.prepare('SELECT id,name,created_at AS createdAt FROM artist_comparisons WHERE user_id=? ORDER BY created_at DESC').all(userId); },
    comparisonForUser(id,userId) {
      const comparison=db.prepare('SELECT id,name,created_at AS createdAt FROM artist_comparisons WHERE id=? AND user_id=?').get(id,userId);if(!comparison)return null;
      const ids=db.prepare('SELECT artist_id AS id FROM comparison_artists WHERE comparison_id=? ORDER BY sort_order').all(id).map(row=>row.id);
      return {...comparison,artists:ids.map(artistId=>repository.publicArtist(artistId)).filter(Boolean)};
    },
    deleteComparison(id,userId){return db.prepare('DELETE FROM artist_comparisons WHERE id=? AND user_id=?').run(id,userId).changes===1;},
    createVenue({id,organizationId,userId,name,city,address,capacity,description,now}) {
      if(!repository.managedOrganization(userId,organizationId))return null;
      db.prepare('INSERT INTO venues(id,organization_id,name,city,address,capacity,description,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,organizationId,name,city,address,capacity,description,userId,now,now);
      return repository.venueForManager(id,userId);
    },
    venueForManager(id,userId) { return db.prepare(`SELECT v.id,v.organization_id AS organizationId,v.name,v.city,v.address,v.capacity,v.description,v.created_at AS createdAt FROM venues v WHERE v.id=? AND EXISTS(SELECT 1 FROM organization_members om JOIN member_permissions mp ON mp.membership_id=om.id WHERE om.user_id=? AND om.organization_id=v.organization_id AND mp.permission='organization.manage')`).get(id,userId); },
    venuesForUser(userId) { return db.prepare(`SELECT v.id,v.organization_id AS organizationId,v.name,v.city,v.address,v.capacity,v.description,v.created_at AS createdAt FROM venues v WHERE EXISTS(SELECT 1 FROM organization_members om JOIN member_permissions mp ON mp.membership_id=om.id WHERE om.user_id=? AND om.organization_id=v.organization_id AND mp.permission='organization.manage') ORDER BY v.created_at DESC`).all(userId); },
    createEvent({id,organizationId,venueId,userId,name,eventType,startsAt,timeZone,city,requirements,budgetCurrency,budgetMinor,now}) {
      if(!repository.managedOrganization(userId,organizationId))return null;
      if(venueId&&!db.prepare('SELECT 1 FROM venues WHERE id=? AND organization_id=?').get(venueId,organizationId))return false;
      db.prepare('INSERT INTO events(id,organization_id,venue_id,name,event_type,starts_at,time_zone,city,requirements,budget_currency,budget_minor,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,organizationId,venueId,name,eventType,startsAt,timeZone,city,requirements,budgetCurrency,budgetMinor,userId,now,now);
      return repository.eventsForUser(userId).find(event=>event.id===id);
    },
    eventsForUser(userId) { return db.prepare(`SELECT e.id,e.organization_id AS organizationId,e.venue_id AS venueId,e.name,e.event_type AS eventType,e.starts_at AS startsAt,e.time_zone AS timeZone,e.city,e.requirements,e.budget_currency AS budgetCurrency,e.budget_minor AS budgetMinor,e.created_at AS createdAt,v.name AS venueName FROM events e LEFT JOIN venues v ON v.id=e.venue_id WHERE EXISTS(SELECT 1 FROM organization_members om JOIN member_permissions mp ON mp.membership_id=om.id WHERE om.user_id=? AND om.organization_id=e.organization_id AND mp.permission='organization.manage') ORDER BY e.starts_at`).all(userId); },
    createBookingRequest(input) {
      if(!repository.managedOrganization(input.userId,input.organizationId))return null;
      const event=db.prepare('SELECT id,organization_id FROM events WHERE id=? AND organization_id=?').get(input.eventId,input.organizationId);if(!event)return false;
      const artist=db.prepare("SELECT id FROM artists WHERE id=? AND publication_status='published'").get(input.artistId);if(!artist)return false;
      db.exec('BEGIN IMMEDIATE;');try{db.prepare(`INSERT INTO booking_requests(id,organizer_organization_id,event_id,artist_id,requested_by,performance_date,start_time,time_zone,duration_minutes,event_type,location,budget_currency,budget_minor,requirements,notes,state,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'requested',?,?)`).run(input.id,input.organizationId,input.eventId,input.artistId,input.userId,input.performanceDate,input.startTime,input.timeZone,input.durationMinutes,input.eventType,input.location,input.budgetCurrency,input.budgetMinor,input.requirements,input.notes,input.now,input.now);db.prepare('INSERT INTO booking_status_history(id,booking_request_id,actor_user_id,from_state,to_state,note,created_at) VALUES(?,?,?,NULL,?,?,?)').run(randomUUID(),input.id,input.userId,'requested','Booking request submitted',input.now);db.exec('COMMIT;');}catch(error){db.exec('ROLLBACK;');throw error;}return repository.bookingForUser(input.id,input.userId);
    },
    bookingForUser(id,userId) {
      const row=db.prepare(`SELECT b.*,b.organizer_organization_id AS organizerOrganizationId,b.event_id AS eventId,b.artist_id AS artistId,b.requested_by AS requestedBy,b.performance_date AS performanceDate,b.start_time AS startTime,b.time_zone AS timeZone,b.duration_minutes AS durationMinutes,b.event_type AS eventType,b.location,b.budget_currency AS budgetCurrency,b.budget_minor AS budgetMinor,b.created_at AS createdAt,b.updated_at AS updatedAt,e.name AS eventName,a.professional_name AS artistName FROM booking_requests b JOIN events e ON e.id=b.event_id JOIN artists a ON a.id=b.artist_id WHERE b.id=? AND (EXISTS(SELECT 1 FROM organization_members om JOIN member_permissions mp ON mp.membership_id=om.id WHERE om.user_id=? AND om.organization_id=b.organizer_organization_id AND mp.permission='organization.manage') OR EXISTS(SELECT 1 FROM artists ax JOIN organization_members om ON om.organization_id=ax.organization_id JOIN member_permissions mp ON mp.membership_id=om.id WHERE ax.id=b.artist_id AND om.user_id=? AND mp.permission='organization.manage'))`).get(id,userId,userId);if(!row)return null;
      const quotes=db.prepare('SELECT version,currency_code AS currencyCode,performance_fee_minor AS performanceFeeMinor,transport_minor AS transportMinor,accommodation_minor AS accommodationMinor,equipment_minor AS equipmentMinor,deposit_minor AS depositMinor,terms,valid_until AS validUntil,created_at AS createdAt FROM booking_quotes WHERE booking_request_id=? ORDER BY version DESC').all(id);
      const history=db.prepare('SELECT from_state AS fromState,to_state AS toState,note,created_at AS createdAt FROM booking_status_history WHERE booking_request_id=? ORDER BY created_at').all(id);const performance=db.prepare('SELECT id,status,submitted_by AS submittedBy,verification_source AS verificationSource,verified_at AS verifiedAt FROM performances WHERE booking_request_id=?').get(id)||null;return {...row,quotes,history,performance};
    },
    bookingsForUser(userId) { const ids=db.prepare(`SELECT b.id FROM booking_requests b WHERE EXISTS(SELECT 1 FROM organization_members om JOIN member_permissions mp ON mp.membership_id=om.id WHERE om.user_id=? AND om.organization_id=b.organizer_organization_id AND mp.permission='organization.manage') OR EXISTS(SELECT 1 FROM artists a JOIN organization_members om ON om.organization_id=a.organization_id JOIN member_permissions mp ON mp.membership_id=om.id WHERE a.id=b.artist_id AND om.user_id=? AND mp.permission='organization.manage') ORDER BY b.created_at DESC`).all(userId,userId);return ids.map(row=>repository.bookingForUser(row.id,userId)); },
    transitionBooking({id,userId,from,to,note,now}) { const booking=repository.bookingForUser(id,userId);if(!booking)return null;const isOrganizer=Boolean(repository.managedOrganization(userId,booking.organizerOrganizationId));const isArtistManager=Boolean(db.prepare(`SELECT 1 FROM booking_requests b JOIN artists a ON a.id=b.artist_id JOIN organization_members om ON om.organization_id=a.organization_id JOIN member_permissions mp ON mp.membership_id=om.id WHERE b.id=? AND om.user_id=? AND mp.permission='organization.manage'`).get(id,userId));const allowed=from==='requested'&&(to==='cancelled'&&isOrganizer||to==='declined'&&isArtistManager)||from==='quoted'&&(to==='cancelled'&&isOrganizer||to==='negotiating'&&isOrganizer||to==='terms_agreed'&&isOrganizer||to==='declined'&&isArtistManager)||from==='negotiating'&&(to==='quoted'&&isArtistManager||to==='terms_agreed'&&isOrganizer||to==='cancelled'&&(isOrganizer||isArtistManager)||to==='declined'&&isArtistManager)||from==='terms_agreed'&&to==='cancelled'&&(isOrganizer||isArtistManager);if(booking.state!==from||!allowed)return false;db.exec('BEGIN IMMEDIATE;');try{const changed=db.prepare('UPDATE booking_requests SET state=?,updated_at=? WHERE id=? AND state=?').run(to,now,id,from).changes;if(!changed){db.exec('ROLLBACK;');return false;}db.prepare('INSERT INTO booking_status_history(id,booking_request_id,actor_user_id,from_state,to_state,note,created_at) VALUES(?,?,?,?,?,?,?)').run(randomUUID(),id,userId,from,to,note,now);db.exec('COMMIT;');}catch(error){db.exec('ROLLBACK;');throw error;}return repository.bookingForUser(id,userId); },
    addBookingQuote({bookingId,userId,currencyCode,performanceFeeMinor,transportMinor,accommodationMinor,equipmentMinor,depositMinor,terms,validUntil,now}) { const booking=db.prepare('SELECT artist_id AS artistId,state FROM booking_requests WHERE id=?').get(bookingId);if(!booking)return null;const managedArtist=repository.artistByIdForManager(booking.artistId,userId);if(!managedArtist)return null;if(!['requested','quoted','negotiating'].includes(booking.state))return false;db.exec('BEGIN IMMEDIATE;');try{const version=db.prepare('SELECT COALESCE(MAX(version),0)+1 AS version FROM booking_quotes WHERE booking_request_id=?').get(bookingId).version;db.prepare('INSERT INTO booking_quotes(id,booking_request_id,version,currency_code,performance_fee_minor,transport_minor,accommodation_minor,equipment_minor,deposit_minor,terms,valid_until,submitted_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(randomUUID(),bookingId,version,currencyCode,performanceFeeMinor,transportMinor,accommodationMinor,equipmentMinor,depositMinor,terms,validUntil,userId,now);const from=booking.state;db.prepare("UPDATE booking_requests SET state='quoted',updated_at=? WHERE id=?").run(now,bookingId);db.prepare('INSERT INTO booking_status_history(id,booking_request_id,actor_user_id,from_state,to_state,note,created_at) VALUES(?,?,?,?,?,?,?)').run(randomUUID(),bookingId,userId,from,'quoted',`Quotation version ${version} submitted`,now);db.exec('COMMIT;')}catch(error){db.exec('ROLLBACK;');throw error;}return repository.bookingForUser(bookingId,userId); },
    recordCompletedPerformance({bookingId,userId,evidenceUrl,caption,now}) { const booking=repository.bookingForUser(bookingId,userId);if(!booking)return null;if(booking.state!=='terms_agreed'||booking.performanceDate>now.slice(0,10))return false;const isArtist=Boolean(repository.artistByIdForManager(booking.artistId,userId));const isOrganizer=Boolean(repository.managedOrganization(userId,booking.organizerOrganizationId));if(isArtist===isOrganizer)return null;db.exec('BEGIN IMMEDIATE;');try{const performanceId=randomUUID();const updated=db.prepare("UPDATE booking_requests SET state='completed',updated_at=? WHERE id=? AND state='terms_agreed'").run(now,bookingId).changes;if(!updated){db.exec('ROLLBACK;');return false;}db.prepare('INSERT INTO booking_status_history(id,booking_request_id,actor_user_id,from_state,to_state,note,created_at) VALUES(?,?,?,?,?,?,?)').run(randomUUID(),bookingId,userId,'terms_agreed','completed','Performance evidence submitted',now);db.prepare('INSERT INTO performances(id,booking_request_id,artist_id,event_id,performance_date,status,submitted_by,created_at) VALUES(?,?,?,?,?,\'pending\',?,?)').run(performanceId,bookingId,booking.artistId,booking.eventId,booking.performanceDate,userId,now);db.prepare('INSERT INTO performance_evidence(id,performance_id,submitted_by,evidence_url,caption,created_at) VALUES(?,?,?,?,?,?)').run(randomUUID(),performanceId,userId,evidenceUrl,caption,now);db.exec('COMMIT;');return {id:performanceId,bookingId,status:'pending',source:'party_submitted'};}catch(error){db.exec('ROLLBACK;');throw error;} },
    verifyPerformance({performanceId,userId,now}) { const performance=db.prepare('SELECT p.*,b.organizer_organization_id AS organizerOrganizationId FROM performances p JOIN booking_requests b ON b.id=p.booking_request_id WHERE p.id=? AND p.status=\'pending\'').get(performanceId);if(!performance)return null;if(performance.submitted_by===userId)return false;const isArtist=Boolean(repository.artistByIdForManager(performance.artist_id,userId));const isOrganizer=Boolean(repository.managedOrganization(userId,performance.organizerOrganizationId));const submitterIsArtist=Boolean(repository.artistByIdForManager(performance.artist_id,performance.submitted_by));const submitterIsOrganizer=Boolean(repository.managedOrganization(performance.submitted_by,performance.organizerOrganizationId));if(isArtist===isOrganizer||submitterIsArtist===submitterIsOrganizer||isArtist===submitterIsArtist||isOrganizer===submitterIsOrganizer)return false;const source=isOrganizer?'organizer_confirmed':'artist_confirmed';db.prepare("UPDATE performances SET status='verified',verification_source=?,verified_by=?,verified_at=? WHERE id=? AND status='pending'").run(source,userId,now,performanceId);return {id:performanceId,status:'verified',source}; },
    createPerformanceReview({performanceId,userId,rating,body,now}) { const performance=db.prepare("SELECT p.artist_id AS artistId,b.organizer_organization_id AS organizerOrganizationId FROM performances p JOIN booking_requests b ON b.id=p.booking_request_id WHERE p.id=? AND p.status='verified'").get(performanceId);if(!performance)return null;const isOrganizer=Boolean(repository.managedOrganization(userId,performance.organizerOrganizationId));const isArtist=Boolean(repository.artistByIdForManager(performance.artistId,userId));if(isOrganizer===isArtist)return false;const result=db.prepare('INSERT INTO performance_reviews(id,performance_id,reviewer_user_id,reviewee_artist_id,rating,body,created_at) VALUES(?,?,?,?,?,?,?)').run(randomUUID(),performanceId,userId,performance.artistId,rating,body,now);return {id:result.lastInsertRowid,performanceId,artistId:performance.artistId,rating,body,source:'verified_booking'}; },
    publicArtistReputation(artistId) { const performanceCount=db.prepare("SELECT COUNT(*) AS count FROM performances WHERE artist_id=? AND status='verified'").get(artistId).count;const review=db.prepare("SELECT COUNT(*) AS count,AVG(rating) AS average FROM performance_reviews r JOIN performances p ON p.id=r.performance_id WHERE r.reviewee_artist_id=? AND p.status='verified'").get(artistId);return {verifiedPerformances:performanceCount,verifiedReviewCount:review.count,averageRating:review.count?Number(review.average.toFixed(2)):null}; },
    addArtistPhoto({id,artistId,userId,storageKey,caption,createdAt}) { if(!repository.artistByIdForManager(artistId,userId))return null;const count=db.prepare("SELECT COUNT(*) AS count FROM artist_media_assets WHERE artist_id=? AND media_type='photo'").get(artistId).count;if(count>=5)return false;db.prepare("INSERT INTO artist_media_assets(id,artist_id,media_type,storage_key,caption,visibility,submitted_by,created_at) VALUES(?,?,'photo',?,?,'public',?,?)").run(id,artistId,storageKey,caption,userId,createdAt);return {id,artistId,mediaType:'photo',caption,visibility:'public',source:'artist_submitted',createdAt}; },
    addArtistVideo({id,artistId,userId,sourceUrl,caption,createdAt}) { if(!repository.artistByIdForManager(artistId,userId))return null;db.prepare("INSERT INTO artist_media_assets(id,artist_id,media_type,source_url,caption,visibility,submitted_by,created_at) VALUES(?,?,'video',?,?,'public',?,?)").run(id,artistId,sourceUrl,caption,userId,createdAt);return {id,artistId,mediaType:'video',sourceUrl,caption,visibility:'public',source:'artist_submitted',createdAt}; },
    mediaForManager(artistId,userId) { if(!repository.artistByIdForManager(artistId,userId))return null;return db.prepare('SELECT id,media_type AS mediaType,source_url AS sourceUrl,caption,visibility,created_at AS createdAt FROM artist_media_assets WHERE artist_id=? ORDER BY created_at DESC').all(artistId); },
    publicArtistMedia(artistId) { if(!db.prepare("SELECT 1 FROM artists WHERE id=? AND publication_status='published'").get(artistId))return null;return db.prepare("SELECT id,media_type AS mediaType,source_url AS sourceUrl,caption,'artist_submitted' AS source,created_at AS createdAt FROM artist_media_assets WHERE artist_id=? AND visibility='public' ORDER BY created_at DESC").all(artistId); },
    publicPhotoAsset(id) { return db.prepare("SELECT m.storage_key AS storageKey FROM artist_media_assets m JOIN artists a ON a.id=m.artist_id WHERE m.id=? AND m.media_type='photo' AND m.visibility='public' AND a.publication_status='published'").get(id); },
    deleteArtistMedia({id,userId}) { const asset=db.prepare('SELECT id,storage_key AS storageKey,artist_id AS artistId FROM artist_media_assets WHERE id=?').get(id);if(!asset||!repository.artistByIdForManager(asset.artistId,userId))return null;db.prepare('DELETE FROM artist_media_assets WHERE id=?').run(id);return asset; },
    createOrganizationInvitation({id,organizationId,userId,email,role,permissions,tokenHash,expiresAt,createdAt}) { if(!repository.canManageOrganization(userId,organizationId))return null;db.prepare('INSERT INTO organization_invitations(id,organization_id,invited_email,invited_role,permissions_json,token_hash,invited_by,expires_at,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run(id,organizationId,email,role,JSON.stringify(permissions),tokenHash,userId,expiresAt,createdAt);return {id,organizationId,email,role,permissions,expiresAt,status:'pending',createdAt}; },
    invitationsForOrganization(organizationId,userId) { if(!repository.canManageOrganization(userId,organizationId))return null;return db.prepare('SELECT id,organization_id AS organizationId,invited_email AS email,invited_role AS role,permissions_json AS permissionsJson,expires_at AS expiresAt,status,created_at AS createdAt,accepted_at AS acceptedAt FROM organization_invitations WHERE organization_id=? ORDER BY created_at DESC').all(organizationId).map(row=>({...row,permissions:JSON.parse(row.permissionsJson)})); },
    acceptOrganizationInvitation({tokenHash,userId,email,now}) { db.exec('BEGIN IMMEDIATE;');try{const invitation=db.prepare("SELECT * FROM organization_invitations WHERE token_hash=? AND status='pending'").get(tokenHash);if(!invitation){db.exec('ROLLBACK;');return null;}if(invitation.expires_at<=now){db.prepare("UPDATE organization_invitations SET status='expired' WHERE id=?").run(invitation.id);db.exec('COMMIT;');return null;}if(invitation.invited_email.toLowerCase()!==email.toLowerCase()){db.exec('ROLLBACK;');return false;}const memberId=randomUUID();db.prepare('INSERT INTO organization_members(id,organization_id,user_id,role,created_at) VALUES(?,?,?,?,?)').run(memberId,invitation.organization_id,userId,invitation.invited_role,new Date(now).toISOString());for(const permission of JSON.parse(invitation.permissions_json))db.prepare('INSERT INTO member_permissions(membership_id,permission,granted_at) VALUES(?,?,?)').run(memberId,permission,new Date(now).toISOString());db.prepare("UPDATE organization_invitations SET status='accepted',accepted_by=?,accepted_at=? WHERE id=?").run(userId,new Date(now).toISOString(),invitation.id);db.exec('COMMIT;');return repository.organizationsForUser(userId).find(org=>org.id===invitation.organization_id);}catch(error){db.exec('ROLLBACK;');if(String(error.message).includes('UNIQUE constraint failed: organization_members.organization_id, organization_members.user_id'))error.status=409;throw error;} },
    revokeOrganizationInvitation({id,organizationId,userId}) { if(!repository.canManageOrganization(userId,organizationId))return null;return db.prepare("UPDATE organization_invitations SET status='revoked' WHERE id=? AND organization_id=? AND status='pending'").run(id,organizationId).changes===1; },
    importLegacy(source,state) {
      if (db.prepare('SELECT 1 FROM legacy_imports WHERE source=?').get(source)) return false;
      db.exec('BEGIN IMMEDIATE;');
      try {
        for (const user of state.users || []) {
          db.prepare('INSERT OR IGNORE INTO users(id,email,password_salt,password_digest,created_at) VALUES(?,?,?,?,?)').run(user.id,user.email,user.password.salt,user.password.digest,iso(user.createdAt));
          db.prepare('INSERT OR IGNORE INTO user_profiles(user_id,full_name,updated_at) VALUES(?,?,?)').run(user.id,user.name,iso(user.createdAt));
        }
        for (const org of state.organizations || []) db.prepare('INSERT OR IGNORE INTO organizations(id,name,type,created_at) VALUES(?,?,?,?)').run(org.id,org.name,org.type,iso(org.createdAt));
        for (const member of state.memberships || []) {
          const id=member.id || randomUUID(); const role=['owner','admin','member'].includes(member.role)?member.role:'member';
          db.prepare('INSERT OR IGNORE INTO organization_members(id,organization_id,user_id,role,created_at) VALUES(?,?,?,?,?)').run(id,member.organizationId,member.userId,role,iso(member.createdAt));
          for (const permission of member.permissions || []) db.prepare('INSERT OR IGNORE INTO member_permissions(membership_id,permission,granted_at) VALUES(?,?,?)').run(id,permission,iso(member.createdAt));
        }
        db.prepare('INSERT INTO legacy_imports(source,imported_at) VALUES(?,?)').run(source,new Date().toISOString()); db.exec('COMMIT;');
      } catch(error) { db.exec('ROLLBACK;'); throw error; }
      return true;
    },
    close(){ db.close(); }
  };
  return repository;
}

export const hashToken=value=>createHash('sha256').update(value).digest('hex');
