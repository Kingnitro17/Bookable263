# Development status

Updated: 2026-11-18

## Baseline

The repository began empty: no application, framework/dependencies, migrations, authentication, UI, deployment configuration, tests, or Git metadata. Node 24 is available. No PostgreSQL/Supabase, email, object storage, payment, video processing, or external provider credentials were supplied. The current implementation is a dependency-free Node.js modular monolith with built-in SQLite and a responsive dark interface.

## Implemented and integrated

- Registration/login/logout; scrypt passwords; normalized email; safe user projection; professional roles that do not grant permissions; hashed durable sessions, CSRF rotation, logout revocation, and basic process-local auth throttling.
- Organization creation and owner membership; server-side organization permission checks and private organization listing.
- Email-bound organization invitation tokens stored only as hashes, expiring and single-use, with explicit role/management permission and revocation. Delivery is manual because no email provider is configured.
- Artist/group private drafts, edits, publication, taxonomy categories, genres, FTS search, city/category/genre filters and public details.
- Public/private rate cards with ISO currency validation and exact integer minor-unit storage.
- Up to five JPEG/PNG/WebP portfolio photos (8 MB maximum each), content-signature validation, opaque local storage outside the web root, owner upload control/endpoints, public serving only when the artist is published; HTTPS YouTube/Vimeo portfolio links.
- Artist-entered available/unavailable whole-day calendar notes with IANA timezone; only available dates are public; discovery requires exact event date and timezone; profile copy tells buyers to confirm.
- User-private shortlists and comparison snapshots; public comparison of published profiles only.
- Organization-scoped venue and event creation/listing, venue city/capacity, event requirements, timezone-aware start conversion to UTC, optional explicit ISO currency and integer minor-unit budget.
- Booking requests attached to organizer-owned events and published artists; participant-scoped reads; role-checked state transitions; auditable status history; versioned quotes and integer minor-unit components.
- Past terms-agreed bookings may be submitted completed with HTTPS evidence; the other party must confirm before verified counts/reviews; reputation output is derived only from confirmed performance records.
- Provider-neutral payment adapter contract that does not report payment as complete before a verified provider event is normalized and handed to durable recording.
- Explainable, private event/talent recommendation endpoint using published profile facts and disclosed weights; no model-generated claims or synthetic engagement data.
- Separate server-served pages for home, discovery, artist details, workspace, saved talent, bookings, account, sign-in, registration, invitation acceptance, and cookie information, with shared responsive navigation.
- Skeleton loading states for data-heavy pages; explicit session-only versus 30-day “Remember me” behavior; cookie notice dismissal stored locally, with essential session cookies only.
- Product vision, architecture, implementation roadmap, database design, security, API contract, decisions, and status documents.

## Verification

- `npm test`: 22 tests pass across identity, authorization, persistence, profile/discovery, rate precision, shortlist privacy, availability/timezones, venue/event isolation, booking state/quotes, performance confirmation/reviews, media validation/visibility, explainable recommendations, finance adapter boundaries, and invitations.
- `node --check` passed for server, browser JavaScript, database module, and media service.
- HTTP smoke check returned 200 for every clean page route, including dynamic `/artists/:id`.
- Follow-up smoke check verified the invitation page and proper 404 responses for unknown page paths.
- Live auth smoke check verified registration's 7-day cookie, default 12-hour browser-session login, 30-day remembered login, CSRF session restoration, and logout revocation.
- Earlier manual HTTP checks covered session restart persistence, CSRF rotation/logout, profile publishing/search, rates, shortlists, comparison, and cross-account privacy.
- Visual inspection is still open: the computer-use runtime detected user input in the Chrome window and could not capture it. Responsive browser/device QA remains incomplete.

## Phase progress and limitations

See `IMPLEMENTATION_ROADMAP.md` for phase checkboxes. The application has foundation slices through phase 8, but this is not a completed commercial marketplace or production launch. Not yet implemented: account recovery/email verification and invitation email delivery, full permission administration, production PostgreSQL, complete media manager (gallery/delete/video UI) and managed object storage, public venue/event profiles, complete organizer operations, contracts/signatures, booking confirmation/deposit settlement, negotiation messaging/notifications/rescheduling, moderator tools/disputes, durable finance event inbox/ledger/refunds/payouts, analytics snapshots, AI reranking, localization, and deployment/operations. The new multipage interface has route and session smoke coverage but still needs visual QA.

Current local image storage and throttling are single-instance development implementations. No payment, independent verification, or predictive intelligence provider is configured. The platform must continue to present submitted claims as submitted and unavailable facts as unavailable.
