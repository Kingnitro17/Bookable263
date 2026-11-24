# Implementation roadmap

Roadmap state is based on integrated server behavior and tests. A slice is not considered production-ready just because a route exists.

## Phase 0 — Foundation

- [x] Inspect the empty repository, create the design system and modular monolith, define SQLite migrations, validation/service conventions, organization authorization, and test setup.
- [ ] Production PostgreSQL deployment, CI, structured logging, monitoring, and browser/device accessibility review.

## Phase 1 — Identity and organizations

- [x] Registration, login, logout, password hashing, safe user projections, optional professional roles, owner memberships, permission-scoped organization records, durable sessions, CSRF protection, and login/register throttling.
- [x] Email-bound, expiring, single-use invitation tokens (stored as hashes), acceptance, listing, and revocation; invite transmission is manual.
- [ ] Email verification, password recovery, user account editing, invitation email delivery, member/permission administration, durable audit trails, distributed rate limiting, and production identity-provider configuration.

## Phase 2 — Artist marketplace

- [x] Artist/group drafts, editing, owner publication, categories, genres, FTS discovery, city/category/genre filters, profile pages, visible/private rate cards, up to five safely stored photos, YouTube/Vimeo portfolio links, availability notes, timezone-aware event-date filtering, shortlists, comparison, saved comparison snapshots, and artist-submitted attribution.
- [x] Dedicated discovery and profile pages, initial owner photo upload control, skeleton loading states, and artist-submitted media gallery presentation.
- [ ] Complete media manager (gallery/delete/video UI), object-storage deployment and malware scanning, full event suitability/language/price filters, featured placements, evidence-review cases, and visual/browser QA.

## Phase 3 — Venues and event organizers

- [x] Organization-scoped venue creation/listing and event creation/listing; location, capacity, event requirements, IANA timezone, UTC event start, and optional ISO currency/integer-minor-unit budget.
- [x] Dedicated bookings page with initial venue/event creation and event listing forms.
- [ ] Venue media/documents, public venue/event discovery, event edit/archive and schedules/lineups/expense tracking, and full organizer operations.

## Phase 4 — Booking marketplace

- [x] Booking requests tied to a managed organizer event and published artist; participant-scoped access, server-side state transitions, status history, versioned quotations, integer-minor-unit quote components, terms and validity, negotiation state, and cancellation paths.
- [x] Initial booking workspace UI for requests, artist quotation submission, and organizer terms acceptance.
- [ ] Full booking confirmation/state controls, contract versions/signatures, negotiation messages, notifications, rescheduling, deposit requirements, detailed timelines, and complete organizer-to-artist journey.

## Phase 5 — Event operations and reputation

- [x] Past terms-agreed bookings can be submitted as completed with HTTPS evidence; the other booking participant must confirm; only confirmed performances contribute to public verified counts and review eligibility.
- [ ] Staff/venue evidence, moderation case queue, disputes, review display/moderation/response, attendance and lineup operations, and administrative audit UI.

## Phase 6 — Financial foundations

- [x] Provider-neutral adapter contract; payment intents must remain `pending`; verified normalized webhooks require an injected durable event recorder. No provider is configured, so no payment is represented as collected.
- [ ] Durable idempotency/event inbox, immutable ledger, provider integration and signature verification from official provider docs, refunds, payout/reconciliation, tax handling, and finance UI.

## Phase 7 — Intelligence foundations

- [x] Private event-to-talent recommendation endpoint ranks published profiles with explicit rule factors for city, category, genre, artist-submitted availability, and public rate-card presence. Results include method/source disclaimers and are deterministic.
- [ ] Attributable search/booking outcome metrics, price observations, snapshot history, calibration/quality measures, and analytics dashboard. There is not enough real history for predictive claims.

## Phase 8 — Advanced intelligence and international expansion

- [x] Explainable event-fit recommendation foundation, ISO currency handling, integer minor units, and IANA timezone handling are in place as prerequisites.
- [ ] AI-assisted reranking only after sufficient attributable outcomes, user controls and evaluation; localization, jurisdiction-specific data handling, payment adapters, country/currency rollout, and deployment scaling.

Phase 8 is reached as a documented, tested foundation. It is deliberately not described as AI-complete or internationally launched. Continue remaining checkboxes in order and keep `DEVELOPMENT_STATUS.md` current.
