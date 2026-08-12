# Architecture

How Bunchy is put together, why, and what is deliberately left for later.

---

## 1. Assessment of the starting point

The repository was empty — no commits, no stack, no infrastructure. Every choice
here is greenfield, so the brief's instruction to preserve existing technology
had nothing to preserve.

**Assumptions made and not escalated:**

1. The product is **Bunchy** and its core social unit is a **Bunch**. An earlier
   brief called that unit a "Circle"; the vocabulary was realigned in a single
   data-preserving migration (see §12). Brand strings live in `src/lib/brand.ts`.
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
        ├── bunches/         membership and moderation
        ├── messaging/       bunch chat + direct messages
        ├── activities/      plans, participation, waitlists
        ├── moderation/      blocks and reports
        ├── notifications/   in-app and email
        ├── geo/             distance, coordinate fuzzing, gazetteer
        ├── ai/              assistant interface + implementations
        ├── admin/           staff policy, audit trail, moderation, metrics
        └── analytics/       event taxonomy, sink, cohort + funnel queries
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
bunches.ts          bunch recommendations
activities.ts       activity recommendations
index.ts            returns the active scorer  ← the swap point
```

### Signals

Weights come from the product spec's stated budget — interests 40%, social
goals 20%, personality 15%, location 10%, availability 10%, activity
preferences 5% — with the interest share split between overlap and
complementarity, because the same spec requires that a photographer and an
aspiring photographer can match. The six sum to exactly 1.0.

| Signal                    | Weight | What it measures                                       |
| ------------------------- | ------ | ------------------------------------------------------ |
| `shared_interests`        | 0.26   | Weighted overlap, scaled by interest *rarity*          |
| `social_goals`            | 0.20   | Goal overlap plus a complementary-goal matrix          |
| `personality`             | 0.15   | Seven axes, some rewarding similarity, some tolerant   |
| `complementary_interests` | 0.14   | Adjacency + the practices/curious asymmetry            |
| `location`                | 0.10   | Distance, **contextually weighted** (see below)        |
| `availability`            | 0.10   | Overlapping free time                                  |
| `history`                 | 0.05   | Shared bunches, co-attendance, how present they are    |
| `age`                     | —      | A multiplier, not a weighted term (see below)          |

Four properties are worth calling out:

- **Missing data is unknown, not incompatible.** A signal returns `null` when it
  has nothing to say, and the scorer renormalizes over whatever came back. Skipping
  the availability step lowers confidence, not your score.
- **Location weight moves with intent.** Two online-first gamers care far less
  about distance than two people who want a hiking partner, so the weight is
  modulated by both people's goals and their online/offline lean.
- **Age is a modifier, not a term.** Adding it to the additive budget would
  silently change every weight the spec fixed, so instead it scales the final
  score by at most 15%. Enough to break a tie, never enough to overrule a good
  match.
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
shows, and whether they can be invited to bunches.

---

## 6. Healthy design, enforced in code

The brief's product principles are load-bearing constraints, not copy:

- **No infinite scroll.** `/api/discover` has no `cursor` or `page` parameter.
  The engine returns a small ranked set and the page ends with "that's
  everything".
- **No vanity metrics.** `Bunch.activityScore` exists for ranking and for
  spotting bunches that have gone quiet; it is never rendered as a number or a
  rank. There is no follower count anywhere in the schema.
- **Notifications are person-triggered.** `notify()` refuses to notify someone
  about their own action, collapses repeats, and defaults suggestion-type
  notifications to off. There is no code path for "we noticed you haven't been
  back" — adding one would mean adding it deliberately.
- **Bunch chat notifies the people a message concerns** (replied-to, mentioned),
  not the whole bunch. The one broadcast is a planned activity, which earns it.
- **Declining a connection is silent.** The requester is not told, because
  "X said no" is an invitation to try again from another angle.

---

## 7. Real-time

Bunch chat streams over SSE (`/api/bunches/[id]/stream`). Each connection tails
the same cursor query the REST endpoint uses — there is no shared in-process bus,
which means it is correct across as many instances as we run, at the cost of one
small indexed query per connection per tick. That trade is obviously right at
this size; when it stops being right, the fix is Redis pub/sub behind the same
endpoint with no client changes.

The client also polls as a fallback and shows an honest Live / Catching up
indicator, because a chat that silently stops updating is worse than one that
never claimed to be live.

Voice and video will need a different transport entirely, so nothing here is
built to accommodate them beyond `BunchMessageKind` being an enum.

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
  AI starters, direct message, bunch chat, block enforcement, report handling,
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
   unreviewed reports is a harassment vector. A human works the queue in the
   staff dashboard (§13).
6. **Scoring weights are hand-tuned.** They are the obvious first thing to learn
   from `MatchFeedback` once there is traffic.
7. **Email notifications are a stored preference, not a delivery pipeline.** The
   per-type `email` switch is honoured by nothing yet — there is no scheduled
   sender. The in-app channel is fully wired; the email column is a promise the
   transport adapter has not been asked to keep.
8. **The notification list is a fixed recent window** of 50, with no pagination.
   Deliberate at this size, and the wrong answer for a member who has been away
   for a month.

---

## 11. Roadmap

**Next up, in priority order** (spec §68):

1. Account deletion and data export (§31) — the one remaining promise in the
   privacy story that the code does not yet keep.
2. Bunch chemistry (§24), AI Bunch formation (§28), founding-member badge,
   referrals.
3. Email delivery for the notification preferences that already exist.
4. An integration suite that boots a database — the service layer is written
   for it (pure functions, injectable stores, and now a vitest setup that loads
   the environment), but it does not exist yet.

**Later:** local discovery, monetization, events marketplace, B2B communities,
mobile apps, a learned ranker trained on the recommendation feedback the event
spine now collects.

---

## 12. The Circle → Bunch rename

The product's core noun changed after the first implementation shipped. It was
renamed across the schema, the domain modules, the routes, the URLs and the UI
in one change, because every later feature references it and the cost only grows.

Two things are worth recording:

- **The migration renames rather than recreates.** Postgres does not rename a
  table's constraints or indexes along with the table, so all 23 are renamed
  explicitly — otherwise Prisma reports drift forever. Verified on a purpose-built
  database: init schema → insert rows → apply rename → all rows and column values
  intact.
- **A follow-up migration exists for one missed column.** `invitableToCircles`
  was renamed in the schema but not the first migration. Rather than edit an
  applied migration — which breaks its checksum and forces a destructive reset
  everywhere it already ran — the fix went into its own migration. Applied
  history is immutable.

---

## 13. The staff surface

`src/server/modules/admin/` plus `/admin` in the app. Four design decisions
worth recording.

**Authorization is a pure function.** The permission matrix lives in
`policy.ts` with no database or request dependency, so the whole thing is
covered by a table-driven test rather than by example. `guard.ts` only binds it
to the current session. The matrix:

| actor \ target | MEMBER | MODERATOR | ADMIN |
| --------------- | ------ | --------- | ----- |
| MEMBER          |   no   |    no     |  no   |
| MODERATOR       |  yes   |    no     |  no   |
| ADMIN           |  yes   |   yes     |  no   |

Nobody may act on their own account at any rank — otherwise an admin can demote
themselves into a state nobody can restore, and a suspended staff member can
lift their own suspension.

**Refusal looks like "not found".** A 403 confirms the admin area exists and
that a path is real. Non-staff get exactly what they would get for a URL that
does not exist, on both pages and API routes.

**Nothing mutates without an audit entry**, written in the same transaction as
the change, with the actor denormalized so the record survives the staff
account being deleted. The reason field is mandatory in the only component that
performs actions, so it cannot be skipped by adding a new page. There is no
route that edits or deletes a moderation event.

**Staff archive and cancel, never delete.** A removed bunch takes its members'
history with it; a cancelled activity still has to tell the people who planned
around it. Reversibility is also what makes a mistaken call recoverable.

Reports are never auto-actioned — a coordinated group filing reports must not be
able to mute anyone — and deciding a report deliberately does *not* also punish
the reported member. That is a separate, separately audited action, so nobody
can suspend an account as an invisible side effect of clearing a queue.

The first admin can only be granted out of band (`npm run role -- <email> ADMIN`
or the seed). A self-service path to admin is a privilege-escalation bug.

---

## 14. Analytics

`src/server/modules/analytics/`. The operational tables record what is
*currently true*; this records *what happened and when*, which is the only way
to answer a cohort question.

**The taxonomy is closed and typed.** Analytics rots the moment two call sites
disagree about whether the event is `connection.sent` or `connection_sent`, and
by then the history is unrecoverable. Adding an event means adding it to
`events.ts`.

**There are no attention events.** No page views, no session duration, no
scroll depth. Spec §29 forbids optimizing for time on site, and the surest way
not to drift into it is to have no way to measure it — there is a test that
fails if someone adds one.

**Recording never breaks what it records.** `track()` is fire-and-forget, cannot
throw, and logs failures instead of propagating them. The worst outcome of a bug
in that file is a gap in a chart, never a member unable to send a message. The
sink is an interface, so a queue or warehouse replaces direct inserts without
touching a call site.

**No PII, and deleted with the member.** Events carry a profile reference and
structured properties, never an email, a name or a coordinate. The profile
relation cascades, so erasing an account erases its history — which does shift
historical aggregates slightly, and is the right trade for a product that
promises real data control.

**The dashboard refuses to imply precision it does not have.** A cohort younger
than the retention window reads *too soon*, not 0%. A funnel step with more
people than the one before it reads *gap*, not a conversion above 100%. Seeded
history backfills only the two events derivable from timestamps we genuinely
store (`account.created`, `onboarding.completed`); the intermediate onboarding
moments were never recorded, and inventing them would make the chart fiction.

---

## 15. Notifications

`src/app/(app)/notifications/`, `src/components/notification-list.tsx`,
`src/components/notification-preferences.tsx`.

The rows and the delivery rules already existed; what was missing was any way
for a member to read them or change them. Four decisions are worth recording.

**Opening the screen does not mark anything read.** Read state changes when the
member follows a notification or presses *Mark all as read*, never as a side
effect of the page loading. A list that clears itself on sight is convenient
for the unread badge and useless to someone who opened it precisely to
remember what they still had to answer.

**Marking one read is scoped in the query, not in a guard.** `markRead` filters
on `profileId`, so a notification id belonging to someone else silently matches
nothing and returns `200`. Erroring would confirm that the id exists. Verified
end to end with a probe row: its owner could mark it read, another signed-in
member could not, and neither learned anything from the response.

**Preferences save on the switch, not on a Save button.** Granular control that
takes a second step is granular control nobody uses. A failed save puts the
switch back, because a control that looks changed but was not persisted is a
lie. There is no "turn everything on" nudge and no warning that quiet makes the
product worse for you — that framing exists to talk people out of silence, and
§29 rules it out.

**Suggestions default off.** `NOTIFICATION_TYPE_INFO.person` marks the types
that report something a human actually did; those default on. Recommendations
default off in both channels and stay off until asked for.

The type labels live in `src/lib/notifications.ts` rather than under
`src/server/`, because the preferences UI is a client component and the module
boundary is real, not decorative.

### Two defects this surfaced

**The default was written twice, and the two copies disagreed.** `notify()` fell
back to `preference?.inApp ?? true` — in-app on for *every* type — while the
settings screen drew an absent row as `info.person`. A member who never opened
settings saw the suggestion switch off and received the suggestions anyway. The
switch was not broken; it was reporting a state the system did not implement,
which is the worst kind of control to ship.

Both sides now read `defaultPreference()`, and the rule is asserted in
`src/lib/notifications.test.ts` rather than left to a comment: nothing emails by
default, in-app is on exactly when a person is waiting, and an unrecognised type
fails closed. The column defaults were dropped from
`NotificationPreference` too — the correct default depends on the type, which a
column default cannot express, and without one Prisma makes omitting the value
a compile error instead of a silent subscription.

Verified against the database, not just in unit tests: with no preference row a
recommendation was not delivered, a connection request was, and after opting in
the recommendation was.

**Every switch in the app rendered its knob outside the track.** Both switch
implementations positioned the knob with `absolute top-0.5` and no `left`. A
`<button>` centres its inline content, so the knob's static position was the
middle of an empty line box and the `translate-x` pushed it clean off the right
edge — in `ui.tsx` since the first commit, on every settings screen. Fixed in
both, and verified by measuring every `[role="switch"]` in a real browser rather
than by eye: 26 switches, 0 knobs outside their track, symmetric 2px insets in
both states.
