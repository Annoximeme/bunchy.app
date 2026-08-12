# Bunchy

**Find your people.**

Bunchy is an AI-assisted social discovery platform for making real friendships,
joining small bunches, and actually doing things together offline.

It is deliberately not a feed. There is no infinite scroll, no follower count,
no popularity ranking, and no notification whose purpose is to pull you back in.
A good session ends with you closing the tab because you have someone to talk to.

---

## Quick start

Requires Node 22+ and a PostgreSQL 16 database.

```bash
npm install
cp .env.example .env.local          # then set DATABASE_URL (and AUTH_SECRET for prod)
npm run db:migrate                  # create the schema
npm run db:seed                     # 12 people, 4 bunches, 4 activities
npm run dev
```

Open <http://localhost:3000>. Sign in with any seeded account:

| Email                | Password         |
| -------------------- | ---------------- |
| `sarah@example.com`  | `bunchydemo1234` |
| `milan@example.com`  | `bunchydemo1234` |
| `elena@example.com`  | `bunchydemo1234` |
| `tomas@example.com`  | `bunchydemo1234` |

`sarah@example.com` is seeded as an **admin** and `priya@example.com` as a
**moderator**, so `/admin` is explorable immediately. Everyone else is a plain
member and gets a 404 there.

Verification and password-reset emails are printed to the server log by the
default `console` email transport, so those flows are fully usable locally.

### Scripts

| Command             | What it does                                        |
| ------------------- | --------------------------------------------------- |
| `npm run dev`       | Development server                                   |
| `npm run build`     | `prisma generate` + production build                 |
| `npm run verify`    | Typecheck, lint, and unit tests                      |
| `npm test`          | Unit tests (Vitest)                                  |
| `npm run db:migrate`| Create/apply a migration                             |
| `npm run db:seed`   | Reset and reseed development data                    |
| `npm run db:studio` | Prisma Studio                                        |
| `npm run role`      | Grant staff access: `npm run role -- <email> ADMIN`   |

---

## What's built

Phase 1 of the roadmap is complete and working end to end.

- **Landing page** — explains the product in under ten seconds, with real cards.
- **Authentication** — email/password with scrypt hashing, database-backed
  opaque session tokens in httpOnly cookies, email verification, password reset,
  session revocation. OAuth is abstracted but has no registered provider.
- **Onboarding** — a five-step conversational flow (basics, interests,
  personality, goals, availability), resumable from any device because progress
  is a stage machine on the profile row rather than client state.
- **Compatibility scoring** — a weighted multi-signal engine, unit tested.
- **Discover** — ranked people, bunches and activities, each with a plain-English
  reason. Finite by design.
- **Connections** — mutual consent; a conversation cannot exist until both
  people have agreed.
- **Bunches** — creation, join requests, invites, roles, moderation, and live
  group chat over SSE with replies, reactions and mentions.
- **Activities** — create, join, waitlist with automatic promotion, cancel.
- **Bunchy AI** — conversation starters, bunch catch-up summaries and activity
  suggestions, behind a provider interface with a working local implementation.
- **Trust & safety** — block, report, leave, remove, rate limiting, and privacy
  controls over discoverability, messaging, location and age.
- **Staff dashboard** — report queue with the reported content inline, account
  search with suspend/ban/role actions, bunch and activity moderation, interest
  curation (including duplicate merging), platform metrics with the north-star
  figure, and an append-only audit log of every staff action.
- **Analytics** — a typed event spine wired into every lifecycle moment, with
  weekly cohort retention, onboarding funnel drop-off and network health. No
  page-view or session-duration events exist, by design.
- **Notifications** — an inbox that only reports things a person did, grouped by
  day, plus per-type in-app and email switches that save the moment they move.
  Opening the screen does not mark anything read, and suggestions are off until
  you ask for them.
- **Visual identity** — coral/purple/yellow/mint on soft cream with deep navy
  text, a four-shape logo and a drawn wordmark, every accent paired with a
  text-safe ink at a measured contrast ratio. The guide is `brand/index.html`.
- **Bunch chemistry** — whether a group is actually working, not just whether
  it looks compatible: how many members are in the conversation, how evenly it's
  shared, whether anyone turns up. Members see what they could act on, never a
  score.
- **Bunch formation** — proposes groups of five to twelve from members who
  aren't in a bunch, admitting people on their weakest link so a group never
  forms around one popular person. Staff review it; everyone proposed gets an
  invitation they can decline.
- **Founding members & referrals** — a badge for finishing onboarding early
  (never an ordinal, confers nothing) and a personal invite link with no reward
  ladder, no leaderboard, no contact import and no reminder emails.
- **Leaving** — download everything we hold as one JSON file, straight away, and
  delete the account for real: immediate, password-confirmed, no thirty-day
  "recovery window". Bunch conversations keep their shape with the author
  detached, people whose plans are affected are told first, and reports outlive
  the person who filed them.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for how it fits together, the
decisions behind it, and what is deliberately deferred.

---

## Two things worth knowing

### Matching is not tag intersection

Counting shared interests only ever finds people who already look identical. The
scorer combines eight weighted signals — shared interests (rarity-weighted),
*complementary* interests, social goals, personality fit, availability overlap,
distance, age and shared history — and each interest carries an intent:
"I do this" or "I want to get into this".

That is what lets Bunchy introduce an experienced photographer to someone who
hikes and wants to learn photography. They share no interest in common, and they
are an excellent match. There is a test for exactly that case.

Distance is also weighted contextually: two online-first gamers can be 400 km
apart and still play three nights a week, so location matters less for them than
for two people who want a hiking partner.

### Location is approximate by construction

Bunchy never stores an address or a precise coordinate. Coordinates are snapped
to a coarse grid *on write*, so the most precise fact the database can express is
"somewhere in this ~5 km cell" — enough to rank by distance, useless for finding
anyone. `User` (email, password hash, birth year) and `Profile` (everything
public) are separate tables, and a single serializer is the only sanctioned path
from a row to a payload another member can see.

---

## Configuration

All environment variables are validated at boot — see `src/server/env.ts`.

| Variable            | Required        | Notes                                            |
| ------------------- | --------------- | ------------------------------------------------ |
| `DATABASE_URL`      | yes             | PostgreSQL connection string                     |
| `AUTH_SECRET`       | in production   | 32+ chars; used to salt hashed identifiers        |
| `AI_PROVIDER`       | no              | `local` (default) or `anthropic`                  |
| `ANTHROPIC_API_KEY` | if `anthropic`  |                                                   |
| `EMAIL_PROVIDER`    | no              | `console` (default) or `smtp`                     |
| `APP_URL`           | no              | Used in emailed links                             |

`.env` holds safe local defaults and is committed. Secrets belong in
`.env.local`, which is git-ignored.
