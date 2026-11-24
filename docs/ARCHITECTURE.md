# Architecture

## Repository baseline

The supplied workspace contained no source files, package manifest, Git repository, deployment configuration, database, or existing architecture. The implementation uses Node.js 24+ built-in HTTP, cryptography, and SQLite modules with no runtime dependencies. It is a single deployable modular monolith.

## Boundaries

- `server/`: HTTP, cookies, request handling, static assets, and process configuration.
- `src/modules/identity/`: registration, password verification, and public user projection.
- `src/modules/organizations/`: organization creation and membership-scoped listing.
- `src/modules/talent/`: artist profile validation, publication, and discovery rules.
- `src/modules/discovery/`: public comparison and owner-scoped shortlists/comparison snapshots.
- `src/modules/events/`: organization-scoped venues and events.
- `src/modules/bookings/`: participant-scoped booking requests, state changes, and versioned quotes.
- `src/modules/verification/`: evidence submission, counterparty confirmation, and verified review eligibility.
- `src/modules/media/`: media validation, local storage adapter, and public visibility checks.
- `src/modules/finance/`: provider adapter contract; payments remain disabled without provider and durable event storage.
- `src/shared/database.mjs`: SQLite repository and transaction boundaries.
- `src/shared/migrations/`: versioned relational schema migrations.
- `public/`: responsive public landing page, shared visual tokens, and browser interactions.
- `tests/`: built-in Node test runner coverage.

The HTTP layer delegates domain rules to services. SQLite provides durable local relational storage, transactions, foreign keys, constraints, and WAL. It is suitable for development and a single-node evaluation, but is not the planned horizontally scalable production database. Services depend on repository operations so a PostgreSQL adapter can be introduced without moving domain rules into route handlers. Keep business domains in this monolith; do not introduce services until operational needs justify them. Local portfolio image storage is outside the web root and served through opaque IDs; production needs managed object storage.

## Request and access model

Identity endpoints create a durable, seven-day HTTP-only SameSite session whose bearer token is stored only as a SHA-256 hash. CSRF tokens rotate at session bootstrap and only hashes are persisted. Private endpoints require a live session and a synchronizer CSRF token. Organization reads are scoped through membership; organization creation transactionally creates an owner membership and explicit management grant. Self-selected professional roles are profile classifications and do not grant organization access or administrative privileges.

## UI foundation

Dark tokens are centralized in `public/styles.css`. The web UI has dedicated server-served pages for discovery, artist details, workspaces, saved talent, booking operations, account/auth, invitations, and cookie information. Data-heavy pages provide skeletons. The marketplace displays an honest empty state rather than synthetic talent, and only explicitly published profiles are discoverable. Search is server-side using SQLite FTS5 plus category, genre, city, and event-date availability filters. The artist and initial organizer studios use the same domain APIs. Fonts use system fallbacks to avoid an external font dependency. Public profile views separate submitted media, rates and availability from confirmed performance aggregates.

## Next migration

Continue in roadmap order: account recovery/invitations; media manager UI and object storage; venue/event organizer UI; contracts, notifications and complete booking confirmation; then durable finance event storage, analytics, and AI only after meaningful attributed outcomes. Before production, provision managed PostgreSQL, email delivery, object storage, payment providers, audit monitoring, backups and deployment infrastructure. See `IMPLEMENTATION_ROADMAP.md`, `DATABASE_DESIGN.md`, and `SECURITY.md`.
