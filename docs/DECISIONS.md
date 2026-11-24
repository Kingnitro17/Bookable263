# Decision log

## 2026-11-17 — Use a dependency-free Node modular monolith for the empty baseline

**Context:** The workspace had no project files, Git metadata, or database credentials. The directive asked to preserve existing architecture, but none was present. Network access/dependency provisioning was not established.

**Decision:** Start with Node's built-in HTTP, crypto, and SQLite modules; keep identity, organizations, and talent in separate domain modules; use versioned relational migrations. The initial JSON prototype was replaced by SQLite after confirming Node's built-in driver is available.

**Tradeoff:** This intentionally does not select Next.js or Supabase in a repository with no prior stack, dependency manifest, database credentials, or provider setup. SQLite is durable for a local single-node app, but PostgreSQL is still required before multi-instance production use.

## 2026-11-17 — No fabricated marketplace records

**Context:** No authorized artist/profile data was supplied.

**Decision:** Ship a functioning, clearly empty public marketplace and avoid fictional biographies, prices, reviews, or verification signals.

## 2026-11-17 — Use built-in SQLite for the durable local foundation

**Context:** Node 24 and its built-in SQLite runtime are available, while no managed database credentials or external database service were configured.

**Decision:** Use a versioned SQLite schema and transactional repository for durable local identity, role declarations, organizations, permissions, and sessions. Import any prior JSON development store once and retain its original file. Keep domain logic behind repository interfaces for a future PostgreSQL adapter.

**Tradeoff:** SQLite is single-node in this design; it does not satisfy the planned horizontally scalable production database. Provision PostgreSQL and migrate before production scale or multi-instance deployment.

## 2026-11-17 — Keep artist profiles private until an owner publishes

**Context:** Profiles are user-submitted and no independent verification workflow or supplied artist dataset exists.

**Decision:** New artist profiles are drafts scoped to an artist/agency organization. Only a member with `organization.manage` can publish. Public search/detail endpoints exclude drafts and label profile information as artist-submitted. Use SQLite FTS5 for initial server-side search; retain a repository boundary for later PostgreSQL full-text search.

**Tradeoff:** Availability, media, and counterparty-confirmed performances are now supported as submitted/sourced data, but no independent platform moderation queue or media provider is configured. Missing data remains explicitly unavailable.

## 2026-11-17 — Keep shortlist and comparison records private

**Context:** Organizers need to evaluate and save published artists without exposing event sourcing decisions.

**Decision:** Public comparison can be performed on 2–4 published profiles. Saved shortlists and named comparison snapshots require authentication and remain owned by the creating user. Artist data missing from one profile remains unavailable in comparisons.

**Tradeoff:** Team-shared shortlists and event-linked lineups wait for venue/event organizations and permissions in later phases.

## 2026-11-17 — Keep payments pending until a configured provider confirms them

**Context:** No payment provider credentials, durable event inbox, or ledger store were supplied.

**Decision:** Define a provider-neutral intent/webhook interface that requires signature verification and event normalization. The interface only accepts pending intents and cannot claim payment unless a configured durable event recorder receives a verified provider event.

**Tradeoff:** Deposits, refunds, payouts, reconciliation, and ledger are not available without those integrations.

## 2026-11-17 — Require email match for manual organization invitations

**Context:** Team membership needs to work before an email delivery provider is configured.

**Decision:** Create random, expiring, single-use invite tokens, persist only token hashes, bind each invite to a normalized email, and allow the authorized inviter to copy the token for delivery. Acceptance requires a signed-in account with the matching email.

**Tradeoff:** Invitation delivery is a manual development workflow until a transactional email service is configured; full member administration remains open.

## 2026-11-17 — Explain recommendations from submitted facts

**Context:** The platform has no historical booking outcomes or engagement dataset for machine learning.

**Decision:** Start with deterministic, event-specific matching on city, category, genre, artist-entered availability, and public rate-card presence. Return the factors and label results as non-predictive.

**Tradeoff:** AI ranking and pricing predictions stay disabled until attributable outcomes exist and can be evaluated.
