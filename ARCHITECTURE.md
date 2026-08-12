# Architecture

How Bunchy is put together, why, and what is deliberately left for later.

---

## 1. Assessment of the starting point

The repository was empty — no commits, no stack, no infrastructure. Every choice
here is greenfield, so the brief's instruction to preserve existing technology
had nothing to preserve.

**Assumptions made and not escalated:**

1. The brief alternates between two product names. The repository, the title and
   the tagline all say **Bunchy**, so it ships as Bunchy. The name lives in
   `src/lib/brand.ts` — renaming is a one-line change.
2. No LLM credentials exist in this environment, so AI ships as an interface
   plus a working deterministic implementation, with an Anthropic adapter behind
   the same interface.
3. No geocoding service either, so place lookup uses a built-in gazetteer behind
   a `Geocoder` interface.

---

## 2. Stack

| Layer      | Choice                          | Why                                                        |
| ---------- | ------------------------------- | ---------------------------------------------------------- |
| Framework  | Next.js 16 (App Router)         | One deployable, server components, streaming                |
| Language   | TypeScript, `strict`            | Plus `noUncheckedIndexedAccess`                             |
| Database   | PostgreSQL 16 + Prisma 7        | Relational data with real constraints; typed access         |
| Styling    | Tailwind v4                     | Token-driven design system, no component library            |
| Validation | Zod 4                           | Shared between API routes and forms                         |
| Tests      | Vitest                          | Fast, no DOM needed for the logic that matters              |

Deliberately **not** used: an auth library (the requirements are small and
explicit), a component library (the brief asks not to look like everything else),
and microservices (a modular monolith is the right shape at this size).

---

## 3. Shape: a modular monolith

```
src/
├── app/                     TRANSPORT ONLY — routes, pages, components
│   ├── (auth)/              sign in, join, reset, verify
│   ├── (app)/               the signed-in shell + onboarding gate
│   ├── onboarding/          the five-step flow
│   └── api/                 HTTP handlers: parse → call a service → return
├── components/              UI primitives and feature components
├── lib/                     isomorphic helpers (brand, interests, formatting)
└── server/                  THE DOMAIN — knows nothing about HTTP
    ├── auth/                passwords, sessions, tokens, OAuth abstraction
    ├── db/                  the single Prisma client
    ├── email/               transport interface + console implementation
    ├── http/                the only place errors become status codes
    ├── ratelimit/           store interface + database implementation
    └── modules/
        ├── matching/        the compatibility engine
        ├── profile/         onboarding, privacy, the public serializer
        ├── connections/     mutual consent
        ├── circles/         membership and moderation
        ├── messaging/       circle chat + direct messages
        ├── activities/      plans, participation, waitlists
        ├── moderation/      blocks and reports
        ├── notifications/   in-app and email
        ├── geo/             distance, coordinate fuzzing, gazetteer
        └── ai/              assistant interface + implementations
```

**The rule that holds it together:** nothing under `src/server/modules` may
import from `src/app` or from `next/navigation` / `next/server`. This is enforced
by an ESLint `no-restricted-imports` rule, not by convention. Services throw
domain errors (`src/server/errors.ts`); `src/server/http/route.ts` is the single
place that turns them into responses. A service can therefore be called from a
route, a cron job or a CLI without dragging `Response` along.

**Server components read through the services directly** rather than over HTTP —
a page calling its own API through the network stack is a pointless round trip.
Client mutations and polling go through `/api`. Both paths share one service
layer, so there is no second implementation to keep in sync.

---

## 4. The matching engine

The centrepiece, and the part most worth reading: `src/server/modules/matching/`.

```
types.ts            the contract: MatchProfile, SignalResult, CompatibilityScorer
signals.ts          eight pure scoring functions
interest-graph.ts   how interests relate to each other (data, not logic)
deterministic.ts    composes signals into a score  ← the current scorer
repository.ts       the only file here that knows Prisma exists
engine.ts           load → filter → score → rank → persist
circles.ts          circle recommendations
activities.ts       activity recommendations
index.ts            returns the active scorer  ← the swap point
```

### Signals

| Signal                    | Weight | What it measures                                       |
| ------------------------- | ------ | ------------------------------------------------------ |
| `shared_interests`        | 0.22   | Weighted overlap, scaled by interest *rarity*          |
| `social_goals`            | 0.15   | Goal overlap plus a complementary-goal matrix          |
| `personality`             | 0.15   | Seven axes, some rewarding similarity, some tolerant   |
| `complementary_interests` | 0.14   | Adjacency + the practices/curious asymmetry            |
| `location`                | 0.13   | Distance, **contextually weighted** (see below)        |
| `availability`            | 0.12   | Overlapping free time                                  |
| `age`                     | 0.05   | Tolerant band, never a hard filter                     |
| `history`                 | 0.04   | Shared circles, co-attendance, how present they are    |

Three properties are worth calling out:

- **Missing data is unknown, not incompatible.** A signal returns `null` when it
  has nothing to say, and the scorer renormalizes over whatever came back. Skipping
  the availability step lowers confidence, not your score.
- **Location weight moves with intent.** Two online-first gamers care far less
  about distance than two people who want a hiking partner, so the weight is
  modulated by both people's goals and their online/offline lean.
- **Every score is explainable.** Each signal produces a sentence, and the card
  renders them. Highlight ranking is separate from score contribution — distance
  and age move the ranking a lot and persuade nobody, so they are ranked down as
  *reasons* even while counting fully as *score*.

### Why it can be replaced

`CompatibilityScorer` is batched by design (`scorePeople(subject, candidates[])`)
because an embedding index or LLM re-ranker wants all candidates at once.
Swapping implementations is one line in `index.ts`. Every stored recommendation
records the scorer `id` that produced it, so two scorers can run side by side and
be compared on outcomes — `MatchFeedback` and `Recommendation.actedAt` are the
labels a learned ranker would train on.

### Hard filters are policy, not score

Blocks, `discoverable: false`, existing connections and explicit "not interested"
feedback are excluded in the candidate query. They are not low-ranking matches;
they are matches that must never appear.

---

## 5. Privacy and PII

Two mechanisms, both structural rather than procedural:

**Table-level split.** `User` holds email, password hash and birth year. `Profile`
holds only what another member may see. Nothing in the discovery path reads from
`User`.

**One serializer.** `src/server/modules/profile/serialize.ts` produces
`PublicProfile`, and every surface renders that type. It has no field that could
carry an email or a precise coordinate, so a route cannot leak one by forgetting
to pick columns carefully. (Verified: no discovery payload contains `email`,
`passwordHash`, `birthYear` or raw coordinates.)

**Location fuzzing happens on write.** `snapToGrid` rounds to ~5 km before
persisting, so a future serializer bug cannot leak precision that was never
stored. Members additionally control discoverability, who may message them, who
may request a connection, whether their area shows, whether their exact age
shows, and whether they can be invited to circles.

---

## 6. Healthy design, enforced in code

The brief's product principles are load-bearing constraints, not copy:

- **No infinite scroll.** `/api/discover` has no `cursor` or `page` parameter.
  The engine returns a small ranked set and the page ends with "that's
  everything".
- **No vanity metrics.** `Circle.activityScore` exists for ranking and for
  spotting circles that have gone quiet; it is never rendered as a number or a
  rank. There is no follower count anywhere in the schema.
- **Notifications are person-triggered.** `notify()` refuses to notify someone
  about their own action, collapses repeats, and defaults suggestion-type
  notifications to off. There is no code path for "we noticed you haven't been
  back" — adding one would mean adding it deliberately.
- **Circle chat notifies the people a message concerns** (replied-to, mentioned),
  not the whole circle. The one broadcast is a planned activity, which earns it.
- **Declining a connection is silent.** The requester is not told, because
  "X said no" is an invitation to try again from another angle.

---

## 7. Real-time

Circle chat streams over SSE (`/api/circles/[id]/stream`). Each connection tails
the same cursor query the REST endpoint uses — there is no shared in-process bus,
which means it is correct across as many instances as we run, at the cost of one
small indexed query per connection per tick. That trade is obviously right at
this size; when it stops being right, the fix is Redis pub/sub behind the same
endpoint with no client changes.

The client also polls as a fallback and shows an honest Live / Catching up
indicator, because a chat that silently stops updating is worse than one that
never claimed to be live.

Voice and video will need a different transport entirely, so nothing here is
built to accommodate them beyond `CircleMessageKind` being an enum.

---

## 8. Adapters where a service is missing

Each is an interface plus a working local implementation — not a stub, and not a
disabled feature pretending to work:

| Interface   | Local implementation                            | Swap by                          |
| ----------- | ----------------------------------------------- | -------------------------------- |
| `Assistant` | Template-driven; instant, free, never surprising | `AI_PROVIDER=anthropic`          |
| `Geocoder`  | Built-in gazetteer of ~85 cities                 | Implement + register in `geocoder()` |
| `EmailTransport` | Writes the message to the server log       | Implement + register in `transport()` |
| `RateLimitStore` | Database-backed, correct across instances  | Implement + change `defaultStore` |

`enabledProviders()` returns an empty list for OAuth, so the UI renders no
sign-in button that cannot complete a round trip.

---

## 9. Testing and verification

- `npm run verify` — typecheck, lint, unit tests. All clean.
- Matching is unit tested against the cases that matter: the photographer/hiker
  pair from the brief, teach/learn asymmetry beating two identical practitioners,
  a good fit with two shared tags outranking a bad fit with four, distance
  weighted differently for online vs place-bound people, missing data treated as
  unknown, and rare interests outranking generic ones.
- The full stack was exercised against a live database and a production build:
  sign-up, sign-in, onboarding, discover, connect, accept, conversation,
  AI starters, direct message, circle chat, block enforcement, report handling,
  and unauthenticated redirects.

**Deliberately not tested yet:** there is no integration test suite that boots a
database. The service layer is written to make that straightforward (pure
functions, injectable stores), and it is the first thing to add.

---

## 10. Known limitations

Stated plainly rather than hidden:

1. **No timezone on profiles.** Availability windows are interpreted in UTC. That
   is close enough for the launch market and wrong for a member in Tokyo — see
   `windowForDate`. Capturing a timezone during onboarding is the fix.
2. **Candidate pre-selection caps at 400 profiles** ordered by recent activity.
   Fine at this size; a great match outside that window would be missed at scale.
   The fix is a coarse pre-filter in the database (or a vector index) before
   ranking.
3. **The unread-conversation badge does one count query per conversation.** It is
   correct, and it is O(conversations). A denormalized counter is the fix when
   that matters.
4. **Avatars are URLs, not uploads.** No object storage is provisioned.
5. **Reports are not auto-actioned**, by choice — automatic enforcement on
   unreviewed reports is a harassment vector. There is no admin moderation UI
   yet; the queue is in the database.
6. **Scoring weights are hand-tuned.** They are the obvious first thing to learn
   from `MatchFeedback` once there is traffic.

---

## 11. Roadmap

**Phase 2** — LLM-backed matching explanations and starters; notification
digests; event discovery beyond circles; circle moderation UI; admin queue;
integration test suite; timezone capture.

**Phase 3** — Redis-backed presence and pub/sub; voice and video; reputation;
mobile apps; a learned ranker trained on connection outcomes.
