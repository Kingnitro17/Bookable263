# Bookable263

Bookable263 is an independent entertainment discovery and booking platform for Zimbabwe. The initial repository had no application, Git metadata, dependencies, or database configuration. This repository starts with a dependency-free Node.js modular monolith so its first foundation can run without external credentials.

## Run locally

Requires Node.js 24 or newer (`node:sqlite` is used for the local relational store).

```sh
npm start
```

Open `http://localhost:3000`. `npm run dev` restarts the server after changes; `npm test` runs the foundation tests. SQLite data is written to `.data/bookable.sqlite` by default. Set `BOOKABLE_DATABASE_PATH` to change its location and `PORT` to change the port. Back up the database and its WAL safely while the server is stopped.

Accounts use scrypt password hashes. Session tokens are stored as hashes in SQLite and sent only in an HTTP-only, SameSite Strict cookie. Sign-in without “Remember me” expires after 12 hours and uses a browser-session cookie; opting in persists for 30 days. Registration starts with a 7-day session. Set `NODE_ENV=production` behind HTTPS to enable the Secure cookie flag. On first startup, a prior `.data/store.json` is imported once into SQLite and left in place as a backup. This local SQLite setup is a single-node foundation, not the planned managed PostgreSQL deployment. Email verification and password recovery require an email provider and remain unimplemented; see `docs/SECURITY.md` before deploying it.

The artist workspace supports editable individual/group profiles, up to five uploaded photos, YouTube/Vimeo links, artist-submitted availability, and public/private rate cards. Organizers can create venues and events, send private booking requests, and exchange versioned quotations through the API. Past bookings can be submitted and counterparty-confirmed before reviews count toward public reputation. Event-fit recommendations are transparent rule-based matches, not predictions. Organization invitations are email-bound, but delivery is manual until an email provider is configured.

The app now has separate pages for discovery, artist profiles, workspace, saved talent, bookings, account, invitations and cookie details. Search and workspace pages show loading skeletons. Cookie notice dismissal is stored locally; only essential session cookies are used. The bookings page provides initial event/venue/request/quote workflows. The app is still an early foundation, not a production marketplace: managed object storage, complete organizer and media tools, contract/deposit/payment lifecycle, email recovery, moderation, analytics history, AI ranking and production PostgreSQL/deployment remain open. Payment adapters are interfaces only; no payment provider is configured. See `docs/DEVELOPMENT_STATUS.md` and `docs/IMPLEMENTATION_ROADMAP.md` for the phase-by-phase status and integration gaps.
