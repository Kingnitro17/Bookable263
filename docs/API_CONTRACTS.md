# API contracts

All endpoints are same-origin JSON. Errors return `{ "error": "..." }`. Private endpoints require the session cookie and `x-csrf-token` from `GET /api/session`. Request bodies are capped at 24 KB.

| Method | Path | Access | Contract |
|---|---|---|---|
| GET | `/api/session` | Public | `{ user: { id, name, email, roles } \| null, csrfToken: string \| null, expiresAt: number \| null }`; rotates CSRF token for a valid session |
| POST | `/api/register` | Public, rate limited | `{ name, email, password, roles? }` → `{ user, csrfToken }`, sets session cookie |
| POST | `/api/login` | Public, rate limited | `{ email, password, rememberMe? }` → `{ user, csrfToken, expiresAt, remembered }`; unchecked uses session cookie/12h server expiry, checked uses 30 days |
| POST | `/api/logout` | Authenticated + CSRF | `{ ok: true }`, clears session cookie |
| POST | `/api/profile/roles` | Authenticated + CSRF | `{ roles: [...] }` adds professional interest roles to own profile |
| GET | `/api/organizations` | Authenticated + CSRF | `{ organizations: [...] }`, membership-scoped |
| POST | `/api/organizations` | Authenticated + CSRF | `{ name, type }` → `{ organization }`, grants creator owner membership |
| GET/POST | `/api/organizations/:id/invitations` | Authenticated + CSRF | Owner lists invitations or creates email-bound manual-copy invitation; hash stored, 1–30 day expiry |
| DELETE | `/api/organizations/:id/invitations/:invitationId` | Authenticated + CSRF | Revokes a pending invitation |
| POST | `/api/invitations/accept` | Authenticated + CSRF | `{ token }`; accepts a single-use invitation only when account email matches |
| GET | `/api/artist-categories` | Public | `{ categories: [{ slug, label }] }` |
| GET | `/api/currencies` | Public | `{ currencies: [{ code, name }] }`, runtime-supported ISO 4217 codes |
| GET | `/api/artists` | Public | Paginated published profiles; supports `q`, `category`, `genre`, `location`, `page` |
| GET | `/api/artists/:id` | Public | Published profile detail only; unpublished profiles return 404 |
| GET | `/api/managed-artists` | Authenticated + CSRF | Profiles under organizations where the user holds `organization.manage` |
| POST | `/api/artists` | Authenticated + CSRF | Creates private draft under an artist/agency organization the user manages |
| POST | `/api/artists/:id/publish` | Authenticated + CSRF | Publishes a managed profile with at least one category |
| PUT | `/api/artists/:id` | Authenticated + CSRF | Edits a managed profile and refreshes its search index |
| PUT | `/api/artists/:id/rate-card` | Authenticated + CSRF | Upserts the managed artist's current rate card |
| GET | `/api/artist-comparison?ids=...` | Public | Compares 2–4 published profiles only |
| GET | `/api/shortlists` | Authenticated + CSRF | Lists the user's private shortlists |
| POST | `/api/shortlists` | Authenticated + CSRF | Creates a named private shortlist |
| GET/DELETE | `/api/shortlists/:id` | Authenticated + CSRF | Reads/deletes only the owner's shortlist |
| POST/DELETE | `/api/shortlists/:id/artists/:artistId` | Authenticated + CSRF | Adds/removes a published artist from an owned shortlist |
| GET | `/api/comparisons` | Authenticated + CSRF | Lists the user's saved comparison snapshots |
| POST | `/api/comparisons` | Authenticated + CSRF | Saves an ordered comparison of 2–4 published profiles |
| GET/DELETE | `/api/comparisons/:id` | Authenticated + CSRF | Reads/deletes only the owner's saved comparison |
| GET | `/api/artists?availableOn=YYYY-MM-DD&timeZone=Area/City` | Public | Requires a real local date and valid IANA timezone; exact timezone and date match, available notes only |
| GET | `/api/artists/:id/availability?from=YYYY-MM-DD&to=YYYY-MM-DD` | Public | Published artist's available notes for at most 90 days; includes `artist_submitted` source and `confirmationRequired` |
| GET/PUT/DELETE | `/api/managed-artists/:id/availability`, `/api/artists/:id/availability` | Authenticated + CSRF | Manager reads all statuses; manager upserts/removes date notes |
| GET/POST | `/api/venues` | Authenticated + CSRF | List/create venues only in managed venue/promoter workspaces |
| GET/POST | `/api/events` | Authenticated + CSRF | List/create events only in managed venue/promoter workspaces; event time normalizes to UTC |
| POST | `/api/artists/:id/media/photos` | Authenticated + CSRF, binary | Raw JPEG/PNG/WebP body, max 8 MB; at most five photos; caption query optional |
| POST | `/api/artists/:id/media/videos` | Authenticated + CSRF | `{ url, caption? }`; HTTPS YouTube/Vimeo links only |
| GET | `/api/artists/:id/media` | Public | Published artist's public portfolio assets; photo URLs are same-origin opaque asset IDs |
| GET | `/api/managed-artists/:id/media` | Authenticated + CSRF | Media metadata for a profile the user manages |
| DELETE | `/api/media/:id` | Authenticated + CSRF | Deletes an asset only through its managing organization |
| GET/POST | `/api/bookings` | Authenticated + CSRF | List participant bookings/create a booking for a managed organizer event and published artist |
| GET/POST | `/api/bookings/:id` and `/api/bookings/:id/transition` | Authenticated + CSRF | Participant-only details; transitions require allowed state and correct participant role |
| POST | `/api/bookings/:id/quotes` | Authenticated + CSRF | Artist manager submits a versioned quote with integer minor-unit components |
| POST | `/api/bookings/:id/performance` | Authenticated + CSRF | Submit past terms-agreed performance with public HTTPS evidence link |
| POST | `/api/performances/:id/confirm` | Authenticated + CSRF | Other booking participant confirms submitted performance |
| POST | `/api/performances/:id/reviews` | Authenticated + CSRF | One review by the other party, after verified performance |
| GET | `/api/artists/:id/reputation` | Public | Confirmed performance/review counts and average only; never infers history |
| GET | `/api/recommendations?eventId=...` | Authenticated + CSRF | Explainable deterministic event-to-artist fit; optional `category` and `genre`; no prediction guarantee |

Organization types: `artist`, `agency`, `venue`, `promoter`, `other`. Self-selected profile roles: `artist`, `manager`, `organizer`, `venue_staff`; they do not grant access. Artist profile inputs include organization ID, professional name, type (`individual` or `group`), optional biography/city/experience/genres, and 1–5 category slugs. Search returns 12 profiles per page and searches name, biography, and city. City matching is prefix-based; genre matching is case-insensitive exact match. Rate cards and quote values use integer minor units plus ISO currencies. Published public profiles expose only public rate cards. Media and availability require explicit artist-side input. Payment provider functionality is an adapter contract only; no intent/webhook endpoint is active without durable storage and a configured provider. Status codes include 401 unauthenticated, 403 invalid CSRF/session or ownership, 404 unavailable/private record, 409 conflicting state/limit, 413 oversized body, 422 invalid domain input, 429 rate limit, and 503 missing provider configuration.

The web application uses dedicated paths: `/`, `/artists`, `/artists/:id`, `/workspace`, `/saved`, `/bookings`, `/account`, `/sign-in`, `/register`, `/invite`, and `/cookies`. These are server-served HTML pages with shared navigation; pages requiring data show skeletons before loading. “Remember me” is optional at sign-in. The cookie notice uses local browser storage for its dismissal; the app currently uses only the essential sign-in cookie.
