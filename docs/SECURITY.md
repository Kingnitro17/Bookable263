# Security

## Implemented in the first slice

- Passwords use Node scrypt with per-account random salts; passwords are not stored or returned in plaintext.
- Login performs a password derivation for unknown users to reduce account enumeration timing differences.
- Session cookies are HTTP-only and SameSite Strict. They are Secure when `NODE_ENV=production`.
- Session bearer tokens are stored in SQLite only as SHA-256 hashes. Registration sessions last seven days; sign-in is a browser-session cookie with a 12-hour server expiry unless “Remember me” is selected, which persists for 30 days. CSRF tokens rotate at session bootstrap and only hashes are persisted.
- Cookie notice dismissal uses localStorage. No advertising or analytics cookies are set.
- Private API requests require a live SQLite session and synchronizer CSRF header; state changes are not authorized by browser state.
- Organization lists are derived from membership; creation transactionally grants the creator owner role and `organization.manage` permission.
- Organization invite tokens are random, stored only as hashes, email-bound, time-limited, single-use, and revocable. Tokens are returned to the authorized inviter once for manual secure transmission; no email delivery is configured.
- Artist drafts and publishing are scoped to the organization membership permission; public profile/search endpoints return only explicitly published profiles.
- Venue, event, booking, quote, and media reads/writes use server-side organization participant checks; booking transitions are restricted by side and current state.
- Availability is artist-entered; unavailable dates remain private; public matches require exact event-local date and timezone.
- Portfolio photos are limited to five per profile and 8 MB each, checked against JPEG/PNG/WebP magic bytes, written under opaque names outside `public/`, and served only for published profiles. Video URLs are HTTPS YouTube/Vimeo only.
- Performance evidence is a submitted HTTPS link; a different booking participant must confirm before verified counts/reviews. Submitted and confirmed sources remain distinguishable.
- Payment intents remain pending; provider webhooks require verification, normalization, and a durable injected recorder. No adapter or recorder is configured.
- Shortlists and saved comparisons are owner-scoped; the public comparison endpoint only accepts published artists and returns public fields.
- Static responses set a restrictive same-origin content policy, anti-framing, and MIME-sniffing headers.
- Authentication has a basic in-memory per-IP attempt limit.

## Before production

SQLite is durable and transactional for this single-node foundation. It uses WAL and foreign keys; passwords and session bearer/CSRF tokens are stored only as derived hashes. Rate limiting remains process-local and is not suitable for multi-instance deployment. Add bounded distributed rate limiting, account verification and recovery, email delivery protections, robust session revocation/rotation controls, request limits at the edge, structured security audit events, backups, and security monitoring before production. Add permission-checked invitation/admin workflows beyond owner creation. Replace local media storage with managed object storage and malware scanning, define retention/deletion policies, and verify provider-specific signed webhooks using official provider documentation before enabling payments.

## Deployment boundary

SQLite is a local and single-node foundation, not the target horizontally scalable production database. Do not deploy multiple app instances against a shared SQLite file. Provision managed PostgreSQL (and complete the adapter/migration work), email delivery for account verification and recovery, TLS, backup/restore, monitoring, and operational rate limits first.

Document data retention/deletion requirements for each operating jurisdiction with qualified counsel; this implementation does not make a legal-compliance claim.
