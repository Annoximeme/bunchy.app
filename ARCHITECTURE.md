# Architecture

How Bunchy is put together, why, and what is deliberately left for later.

---

## 1. Assessment of the starting point

The repository was empty, no commits, no stack, no infrastructure. Every choice
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
├── app/                     TRANSPORT ONLY, routes, pages, components
│   ├── (auth)/              sign in, join, reset, verify
│   ├── (app)/               the signed-in shell + onboarding gate
│   ├── onboarding/          the five-step flow
│   └── api/                 HTTP handlers: parse → call a service → return
├── components/              UI primitives and feature components
├── lib/                     isomorphic helpers (brand, interests, formatting)
└── server/                  THE DOMAIN, knows nothing about HTTP
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

**Server components read through the services directly** rather than over HTTP,
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

Weights come from the product spec's stated budget, interests 40%, social
goals 20%, personality 15%, location 10%, availability 10%, activity
preferences 5%, with the interest share split between overlap and
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
| `age`                     |, | A multiplier, not a weighted term (see below)          |

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
  renders them. Highlight ranking is separate from score contribution, distance
  and age move the ranking a lot and persuade nobody, so they are ranked down as
  *reasons* even while counting fully as *score*.

### Why it can be replaced

`CompatibilityScorer` is batched by design (`scorePeople(subject, candidates[])`)
because an embedding index or LLM re-ranker wants all candidates at once.
Swapping implementations is one line in `index.ts`. Every stored recommendation
records the scorer `id` that produced it, so two scorers can run side by side and
be compared on outcomes, `MatchFeedback` and `Recommendation.actedAt` are the
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
  back", adding one would mean adding it deliberately.
- **Bunch chat notifies the people a message concerns** (replied-to, mentioned),
  not the whole bunch. The one broadcast is a planned activity, which earns it.
- **Declining a connection is silent.** The requester is not told, because
  "X said no" is an invitation to try again from another angle.

---

## 7. Real-time

Bunch chat streams over SSE (`/api/bunches/[id]/stream`). Each connection tails
the same cursor query the REST endpoint uses, there is no shared in-process bus,
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

Each is an interface plus a working local implementation, not a stub, and not a
disabled feature pretending to work:

| Interface   | Local implementation                            | Swap by                          |
| ----------- | ----------------------------------------------- | -------------------------------- |
| `Assistant` | Template-driven; instant, free, never surprising | Implement + register in `assistant()` |
| `Geocoder`  | Built-in gazetteer of ~85 cities                 | Implement + register in `geocoder()` |
| `EmailTransport` | Writes the message to the server log       | Implement + register in `transport()` |
| `RateLimitStore` | Database-backed, correct across instances  | Implement + change `defaultStore` |

`enabledProviders()` returns an empty list for OAuth, so the UI renders no
sign-in button that cannot complete a round trip.

---

## 9. Testing and verification

Two suites, deliberately separate.

| Command | What it runs | Needs a database |
| --- | --- | --- |
| `npm run verify` | typecheck, lint, 86 unit tests | no |
| `npm run test:components` | 16 tests in jsdom | no |
| `npm run test:integration` | 33 tests against real PostgreSQL | yes |
| `npm run verify:all` | all three | yes |

Three configs rather than one. `npm test` stays a fraction of a second because
the domain tests are pure functions and should not pay for a DOM, and the
integration suite is separate because a suite people skip for needing a database
is a suite that stops being run.

**The integration suite exists for assertions a mock cannot make.** Cascade
behaviour, `SetNull` on a foreign key, a transaction that must not half-commit,
these are properties of the database. A test double would have happily agreed
that deleting an account preserves the reports it filed.

It runs against its own `bunchy_test` database, with the URL derived in the
setup file rather than read from the environment, so no configuration mistake
can point it at real data. Migrations run once; every table is truncated between
tests, which is milliseconds rather than the minutes a re-migration would take.
One worker, serially, parallel workers truncating each other's rows is a flake
generator, not a speed-up.

What it covers is what earlier phases had verified with throwaway probes:
deletion's consequences for other people (bunch handover, cancellation notices,
report anonymization, message authors detaching), referral attribution and its
two refusals, the founding-member boundary at its real limit of 1000, formation
end to end against the actual scorer, and notification delivery and read-state
isolation.

**The suite was mutation-tested rather than trusted.** Reverting one line,
`notify()`'s fallback back to `?? true`, made exactly one test fail, and
restoring it made the suite green again. A suite that has never been seen to
fail is not evidence of anything.

### The incident that shaped it

The first `npm run verify` after adding these files ran them against
`bunchy_dev`: the unit config's `tests/**` glob matched
`tests/integration/**`, so the integration files executed with none of the
integration setup, no separate database, and a `beforeEach` that truncates
every table. A thousand rows from the founding-member boundary test landed in
the development database before the failure output made it obvious.

Nothing was lost that mattered (the seed is reproducible, and the dev database
was restored to its 13 seeded members), but the fix is in three layers rather
than one, because the first layer is a glob and globs get edited:

1. The unit config excludes `tests/integration/**`.
2. Integration tests cannot import the database directly. They import
   `tests/integration/db.ts`, which throws unless `DATABASE_URL` names
   `bunchy_test`, and the check runs *before* the client module is imported,
   since a static import would be hoisted above it.
3. That guard is itself unit tested (`tests/integration-guard.test.ts`),
   including that it refuses an unset URL and does not print the password in
   the error. It lives in the unit suite on purpose: its job is to fire when
   the integration suite is invoked wrongly, so the integration suite is the
   one place that can never exercise it.

- Matching is unit tested against the cases that matter (see below).
- Matching is unit tested against the cases that matter: the photographer/hiker
  pair from the brief, teach/learn asymmetry beating two identical practitioners,
  a good fit with two shared tags outranking a bad fit with four, distance
  weighted differently for online vs place-bound people, missing data treated as
  unknown, and rare interests outranking generic ones.
- The full stack was exercised against a live database and a production build:
  sign-up, sign-in, onboarding, discover, connect, accept, conversation,
  AI starters, direct message, bunch chat, block enforcement, report handling,
  and unauthenticated redirects.

### Component tests are for promises, not pixels

`tests/components/` does not check that a button is coral, that is what the
brand guide and a browser are for. It checks the claims the UI makes on the
product's behalf, each of which is a §29 commitment that a refactor could
silently drop:

- Opening the notification screen marks **nothing** read. Mutation-tested by
  reintroducing the `useEffect` that clears the list on mount and watching
  exactly that assertion fail.
- The settings screen draws the same defaults the sender applies, and a failed
  save puts the switch back.
- No persuasion anywhere near a switch: no "recommended", no "you'll miss out",
  no "turn everything on".
- The delete button stays disarmed until both gates are met, lower case does not
  arm it, and the form does not bargain, no "are you sure", no offer of a pause
  instead.
- Unread state is announced to a screen reader, not conveyed by colour alone.

**Still untested:** page-level composition and server components. Those are
still checked by driving a real browser during development, which is a gap
rather than a principle.

---

## 10. Known limitations

Stated plainly rather than hidden:

1. **Timezones are derived, not asked for.** `Profile.timezone` is filled from
   the country during onboarding, which is unambiguous for most of Europe and
   Japan and null for the United States, Australia and Russia, a null falls
   back to UTC, which is honestly unknown rather than confidently wrong. A
   member who moves keeps the zone of the country they entered. DST is read at
   scoring time, not projected forward.
2. **Candidate pre-selection caps at 400 profiles** ordered by recent activity.
   Fine at this size; a great match outside that window would be missed at scale.
   The fix is a coarse pre-filter in the database (or a vector index) before
   ranking.
3. **The unread-conversation badge does one count query per conversation.** It is
   correct, and it is O(conversations). A denormalized counter is the fix when
   that matters.
4. **Avatars are URLs, not uploads.** No object storage is provisioned.
5. **Reports are not auto-actioned**, by choice, automatic enforcement on
   unreviewed reports is a harassment vector. A human works the queue in the
   staff dashboard (§13).
6. **Scoring weights are hand-tuned.** They are the obvious first thing to learn
   from `MatchFeedback` once there is traffic.
7. **Email needs credentials, not code.** `EMAIL_PROVIDER=smtp` now delivers
   over SMTP; it needs a provider account and four environment variables.
   Left as `console` in production the server logs a warning at boot, because
   silently logging password-reset links is the worst of both options.
8. **The notification list is a fixed recent window** of 50, with no pagination.
   Deliberate at this size, and the wrong answer for a member who has been away
   for a month.

---

## 11. Roadmap

**Next up, in priority order** (spec §68):

1. An end-to-end suite over whole pages, components and domain are covered,
   page composition is still checked by hand.

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
  explicitly, otherwise Prisma reports drift forever. Verified on a purpose-built
  database: init schema → insert rows → apply rename → all rows and column values
  intact.
- **A follow-up migration exists for one missed column.** `invitableToCircles`
  was renamed in the schema but not the first migration. Rather than edit an
  applied migration, which breaks its checksum and forces a destructive reset
  everywhere it already ran, the fix went into its own migration. Applied
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

Nobody may act on their own account at any rank, otherwise an admin can demote
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

Reports are never auto-actioned, a coordinated group filing reports must not be
able to mute anyone, and deciding a report deliberately does *not* also punish
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
not to drift into it is to have no way to measure it, there is a test that
fails if someone adds one.

**Recording never breaks what it records.** `track()` is fire-and-forget, cannot
throw, and logs failures instead of propagating them. The worst outcome of a bug
in that file is a gap in a chart, never a member unable to send a message. The
sink is an interface, so a queue or warehouse replaces direct inserts without
touching a call site.

**No PII, and deleted with the member.** Events carry a profile reference and
structured properties, never an email, a name or a coordinate. The profile
relation cascades, so erasing an account erases its history, which does shift
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
product worse for you, that framing exists to talk people out of silence, and
§29 rules it out.

**Suggestions default off.** `NOTIFICATION_TYPE_INFO.person` marks the types
that report something a human actually did; those default on. Recommendations
default off in both channels and stay off until asked for.

The type labels live in `src/lib/notifications.ts` rather than under
`src/server/`, because the preferences UI is a client component and the module
boundary is real, not decorative.

### Two defects this surfaced

**The default was written twice, and the two copies disagreed.** `notify()` fell
back to `preference?.inApp ?? true`, in-app on for *every* type, while the
settings screen drew an absent row as `info.person`. A member who never opened
settings saw the suggestion switch off and received the suggestions anyway. The
switch was not broken; it was reporting a state the system did not implement,
which is the worst kind of control to ship.

Both sides now read `defaultPreference()`, and the rule is asserted in
`src/lib/notifications.test.ts` rather than left to a comment: nothing emails by
default, in-app is on exactly when a person is waiting, and an unrecognised type
fails closed. The column defaults were dropped from
`NotificationPreference` too, the correct default depends on the type, which a
column default cannot express, and without one Prisma makes omitting the value
a compile error instead of a silent subscription.

Verified against the database, not just in unit tests: with no preference row a
recommendation was not delivered, a connection request was, and after opting in
the recommendation was.

**Every switch in the app rendered its knob outside the track.** Both switch
implementations positioned the knob with `absolute top-0.5` and no `left`. A
`<button>` centres its inline content, so the knob's static position was the
middle of an empty line box and the `translate-x` pushed it clean off the right
edge, in `ui.tsx` since the first commit, on every settings screen. Fixed in
both, and verified by measuring every `[role="switch"]` in a real browser rather
than by eye: 26 switches, 0 knobs outside their track, symmetric 2px insets in
both states.

---

## 16. The visual identity

`src/app/globals.css` (tokens), `src/components/logo.tsx` (mark + wordmark),
`brand/index.html` (the guide, rendered from the same values).

### One finding shaped the whole system

**White text on the signature coral is 3.00:1.** That is below AA for a button
label, and the coral is `#FF5C6C` by specification, not something to tune away.
So the primary button carries a **deep navy label** (5.42:1) instead of the white
one every other consumer app reaches for. The signature colour is untouched; the
label moved. Coral as *text* on cream is 2.87:1 and appears nowhere: the 39 call
sites that said `text-accent` now say `text-accent-ink` (`#CE2F45`, 4.88:1).

Every accent therefore carries three tokens, and the split is the reason the
palette is both on-brand and legible:

| | fill | text-safe ink | label on the fill |
|---|---|---|---|
| Coral | `#FF5C6C` | `#CE2F45` (4.88:1) | navy (5.42:1) |
| Purple | `#7657FF` | `#6A47F5` (5.24:1) | white (4.59:1) |
| Yellow | `#FFC857` | `#8A5E00` (5.46:1) | navy (10.58:1) |
| Mint | `#55D6BE` | `#0E7A69` (5.02:1) | navy (9.10:1) |

Ratios are computed, not guessed, WCAG 2.1 relative luminance, and the failing
combinations are recorded in the guide next to the passing ones so nobody
reintroduces them.

**Danger is not coral.** When the primary action is red, a bright red
destructive button is a trap. Danger is `#B3261E`, deeper and browner, and
destructive actions render tinted rather than filled so they never compete with
the primary button.

### Colour means something

Coral is the brand and the primary action; purple is anything the system
inferred (match reasons, Bunchy AI); yellow is activities, the "when" on an
activity card, every time; mint is success and connection. Interest chips went
back to neutral: they repeat four to a card on every card, and colouring them
made mint the second most present colour on the page, which is how a palette
stops being a signal. `Chip` has no yellow tone, because nothing yet needs a
yellow chip and shipping the API before the caller is just dead surface.

### The logo

Four rounded squircles at four sizes and four angles, clustered with an even
gap. The sizes are the individuality, the gap is what makes it read as *several*
rather than one blob, which is why the shapes never touch, and why the mark
still resolves at 16px and in flat monochrome. The largest is coral, so the
signature colour survives favicon size.

The wordmark is **drawn as stroked paths, not set in a typeface**: monoline,
round caps, cap height 100, stroke 20. It needs no font to load, cannot be
silently substituted on a machine missing the licensed face, and renders
identically everywhere. Letter spacing is optical, the round `c` sits tighter
than the flat-sided letters, the diagonal of the `y` tighter still.

Assets: `src/app/icon.svg` (scalable favicon) and `src/app/apple-icon.png`
(180×180 on cream), both picked up by the App Router conventions.

### Dark mode is the brand dimmed

Navy all the way down (`#101826`), not neutral grey. Fills and their labels do
not change between modes, a coral button with a navy label is the same object
at midnight. Only text colours move, because only they depend on what is behind
them.

---

## 17. Leaving

`src/server/modules/account/`. Two things a product that asks for this much
personal information owes the people who gave it: a copy, and a way out.

### Export

`GET /api/account/export` returns one JSON file, immediately, as a download.
No background job, no "we'll email you a link within 30 days", at member scale
the whole account fits in a response, and the delay is what data export looks
like when a product would rather you didn't bother.

It is complete: profile, personality, privacy settings, interests, goals,
availability, connections, bunches, every message written, every conversation,
activities organized and joined, notifications and their preferences, reports
filed, blocks, and match feedback. Nothing summarized, because an export that
quietly drops the long tail is worse than none, it looks complete.

Other people appear only by the name and username the member can already see in
the app. No email, birth year, password hash or coordinate appears, including
the member's own coordinates, which are never stored precisely anyway.

### Deletion

`DELETE /api/account`, gated on the current password (a session cookie is enough
to read an account and should never be enough to destroy one) and on the word
DELETE typed out. Immediate and irreversible: there is no thirty-day recovery
window, because that is a retention tactic wearing a safety net's clothes.

Most of the erasure is the database's, `User` cascades through `Profile` to
everything hanging off it. The module exists for the cases where a plain cascade
would take something from *other people*:

| Case | Without care | What happens instead |
|---|---|---|
| Activities they organized | Cascade-deleted, silently cancelling other people's plans | Everyone going is notified first |
| Sole ownership of a bunch | The bunch is left leaderless | Longest-standing member is promoted; an empty bunch is removed |
| Reports they filed | Cascade-deleted, clearing the moderation queue | Anonymized and kept (`SetNull`) |
| Bunch messages, created bunches |, | Already `SetNull`: the group's history keeps its shape, the author detaches |

Verified against a real database rather than reasoned about: with a leaver who
owned two bunches, organized a future activity someone had joined, and had filed
a report, the wrong password was refused and the account survived the refusal;
user and profile were gone; the bunch message survived with its author detached;
the shared bunch survived with ownership handed to the remaining member; the solo
bunch was removed; the report survived with the reporter anonymized and the
target intact; and the participant was notified before the activity disappeared.

**This used to be a known limitation**, deleting an account freed the email
address, so a banned member could delete and re-register in one click. Closed in
§24, with the trade-off stated rather than hidden.

---

## 18. Bunch chemistry and formation

`src/server/modules/bunches/chemistry.ts`, `formation.ts`, both pure, both
unit tested, both with a thin loader alongside that is the only part touching
Prisma. Same split as the matching engine, for the same reason.

### Chemistry (§24)

Compatibility asks whether people would get on. Chemistry asks whether the group
*is working*. Six signals: mean pairwise compatibility, **voice** (what share of
members have said anything), **balance** (entropy of who is talking, measured
across members so silent ones count against it), liveliness, turn-up, and size
fit across the 5–12 band.

Three properties are the whole design:

- **Silence is absent evidence, not failure.** A bunch four days old returns
  `null` with confidence `none` and reads "too new to tell", never 0%. Signals
  that cannot speak are dropped and the rest renormalize.
- **Breadth beats volume.** The heaviest behavioural weight is on how many
  people are in the conversation, and liveliness saturates. There is a test
  asserting that ten times the messages from the same two people buys ≤3 points:
  a product that scored volume would be asking groups to perform for a number.
- **Members never see the score.** They see `observations`, "3 members haven't
  said anything this month", "nothing has been planned yet". Specific, factual,
  actionable. The number ranks recommendations and warns staff; grading
  someone's friendships would be a different product.

### Formation (§18/§28)

The matcher answers "who should this person meet". Formation answers "which
group of five to twelve would work", which is not the same question: one popular
member everyone scores well against, who have nothing in common with each other,
is an excellent list and a terrible bunch. So candidates are admitted on their
**weakest link** with the existing group, not their mean, and there is a test
that feeds in exactly that star topology and asserts nothing is proposed.

It seeds on the member with the **fewest** strong options. A greedy pass that
starts with the best-connected person strands exactly the people the feature
exists for. An earlier version abandoned the whole pass when that seed could not
reach minimum size, a unit test caught it stranding five placeable people
because of one who wasn't, so unplaceable seeds are now set aside and reported
in `unplaced` rather than hidden.

**Nothing is created automatically.** `/admin/formation` shows proposals with
their cohesion, weakest pair, per-member fit and a rationale in sentences a
human can check. Creating one makes a bunch where every member is `INVITED` and
none is `ACTIVE`, the first to accept becomes owner. Auto-enrolling strangers
into a group chat reads as clever in a spec and as a violation in an inbox. The
action is written to the moderation audit trail under `BUNCH_PROPOSED`, because
one click that notifies a dozen people should never be invisible afterwards.

Verified end to end against the database: an 11-person pool produced one
7-member proposal at 84% cohesion with a 66% weakest pair, seeded on the
least-connected member and pulling him in rather than stranding him; creating it
made 0 active and 7 invited memberships, sent 7 invitations and wrote 1 audit
entry; the first acceptor became OWNER and the second MEMBER.

That run also caught a bug worth recording: the group spanned Antwerp and Tokyo
and the suggested name came out as *"Gaming in Tokyo"*, because the city was
taken from an arbitrary set element. A city is now only named when every member
shares it, a wrong name is worse than a generic one.

---

## 19. Founding members and referrals

Both features are, on the shelf, exactly the kind of thing this product argues
against, status badges and referral programmes are how social apps manufacture
hierarchy and growth. So both are built with the incentive removed.

### Founding members (§37)

`src/server/modules/profile/founding.ts`. A boolean, awarded once, when
onboarding **completes** while the finished member base is under 1000.

- **Never an ordinal.** "Here since the beginning" is a fact about a person;
  "founding member #47" is a leaderboard, and §29 rules out numbers that rank
  one member above another. Nothing in the codebase can say who was twelfth.
- **Earned by finishing, not signing up.** A half-filled profile is a row, not a
  founding member, so abandoned signups don't consume places.
- **It confers nothing.** No effect on matching, ranking, discovery order or
  permissions. A badge that bought advantages would turn the early cohort into a
  class, which is the opposite of what a product about belonging should build.

The award is idempotent (`where: { foundingMember: false }`) and deliberately
racy, two people finishing in the same instant could both slip in. Accepted:
the failure mode is 1001 founding members, and the alternative is serializing
every onboarding completion behind a lock to protect a badge.

A backfill migration marks everyone who had already completed onboarding when
the feature shipped. Without it the badge would have gone only to members who
arrived *after* the earliest ones, exactly backwards.

### Referrals (§38)

`src/server/modules/profile/referrals.ts`. A personal link, and nothing else.

- **No rewards ladder.** Nothing unlocks at three invites, or ten. The moment a
  referral pays out, the incentive is to send the link to strangers.
- **No leaderboard and no names.** A member sees a count, not who joined,
  a list would disclose that a specific person has an account here.
- **No contact import, no reminder emails.** Bunchy never asks for an address
  book and never tells anyone "your friend is still waiting".
- **Counted on completion**, so an abandoned signup is not a referral.

Codes are minted on first request rather than at signup, most people never open
the invite screen, and a column that stays null until someone wants a link beats
pre-generating a code for everyone. The alphabet excludes `O/0`, `I/1/l` and `U`
because these get read aloud and typed from memory.

Two refusals in `resolveReferrer` matter more than the happy path: an
unrecognised code returns null instead of throwing, because losing attribution
is a rounding error and blocking a signup over a mistyped link is not; and a
suspended or banned member's link stops working, or a ban is trivially routed
around by inviting fresh accounts. Both are unit tested.

Verified against the database: a lowercased code still attributed; a nonsense
code let the signup through unattributed; the count stayed 0 until the invitee
completed onboarding; the badge awarded once and refused the second time;
refused entirely while onboarding was incomplete; and deleting the inviter left
the invitee intact with the attribution detached rather than cascading.


---

## 20. Scheduled work

`src/server/modules/notifications/scheduled.ts`, run by `npm run jobs`.

### A gap found by counting

Every notification in this product is a reaction to a person doing something,
with two exceptions, and both had shipped as settings toggles with nothing
behind them. Grepping for a producer of each of the eleven declared types
returned **zero** for `ACTIVITY_REMINDER` and `BUNCH_RECOMMENDATION`. A member
could read "a reminder shortly before an activity you joined", switch it on, and
wait forever.

A toggle for something that cannot happen is worse than a missing feature: it is
a claim. `tests/notification-producers.test.ts` now fails if any type in
`NOTIFICATION_TYPE_INFO` has no `notify()` call producing it, mutation-tested
by pointing the reminder sender at a different type and watching it fail.

### The jobs

**Activity reminders** go out 24 hours ahead, only for activities still
`SCHEDULED`, only to people who said they were coming. A reminder about a
cancelled plan is worse than silence.

**Bunch recommendations** are the only notification here nobody asked for, so
they are the most constrained: off by default, sent only to members who
explicitly switched them on (an absent preference row is a no, this one does
*not* fall back to `defaultPreference`), at most one a fortnight, and only above
a score of 70. A weak suggestion sent on a schedule is engagement bait with a
friendly name.

**Both are idempotent** by group key, so an overlapping run sends nothing extra.
Verified: running the reminder job twice in a row produced 3 notifications and
then 0.

### Why a script, not a timer

`npm run jobs` is a plain process for a cron, a platform scheduler or a
Kubernetes CronJob. Not a `setInterval` inside the web server: work that must
happen once should not be attached to a process that runs in N replicas. It
exits non-zero on failure, or the scheduler reports success and nobody finds out
reminders stopped.

### One thing the real-data run caught

The reminder body read *"Starting Thursday 06:30"*, UTC, unlabelled. Profiles
carry no timezone yet, which is a mild inaccuracy everywhere else in the product
and, in a reminder for a real-world meetup, is someone turning up at the wrong
time. The zone is now stated explicitly, and the notification links to the
activity where the browser formats it locally.


---

## 21. Time zones

`src/server/modules/geo/timezone.ts`, pure, 14 unit tests.

Availability is stored symbolically (`WEEKDAY_EVENING`), which is the right way
to ask the question: nobody fills in a calendar grid to sign up. But "weekday
evening" is a **local** idea, and the matcher was comparing the labels directly.

The seed has always contained a member in Tokyo. Sarah in Antwerp and Kenji in
Tokyo both selecting `WEEKDAY_EVENING` scored a *perfect* availability
overlap, 16:00–21:00 UTC against 09:00–14:00 UTC, not one hour in common. The
product was confidently wrong about the one thing a member can check
immediately.

**Windows are now converted before they are compared.** Each becomes a local
hour range, shifts into UTC by the member's offset, and overlap is measured
there, split across midnight where the shift wraps, and weekday and weekend
kept apart.

### The reason had to move too

Fixing the score exposed a second, subtler lie. With real hours, Sarah and Kenji
*do* overlap, his `LATE_NIGHT` in Tokyo is 14:00–21:00 UTC, which covers her
Brussels evening. But the explanation still read *"You're both free weekday
evenings"*, because it was built from the labels both had ticked. Across zones
that phrase was false in both directions: same label, no hours; different
labels, real hours.

`overlappingWindows` returns the pairs that actually share time, and the
sentence follows them:

| Pair | Before | Now |
| --- | --- | --- |
| Sarah × Kenji | "You're both free weekday evenings" | "Your weekday evenings line up with their late nights" |
| Sarah × Milan | "You're both free weekday evenings" | unchanged, same zone, same windows |

The second sentence is not just accurate, it is more useful: it tells a member
*why* a match on the other side of the world is plausible.

### Where the zone is used

- **Availability scoring**, as above.
- **Activity reminders**, formatted per recipient. The same reminder tells a
  member in Brussels 07:00 and a member in Tokyo 14:00, with the zone named. An
  unlabelled hour in a reminder for a real-world meetup is someone turning up at
  the wrong time.


---

## 22. Measuring instead of guessing

`npm run measure`, query counts and wall time for the hot service calls,
against real data.

It exists because guessing was wrong. `bunchHealth` was added to the bunch
detail page in §18 and looked cheap; measured, it cost **15 queries and 78ms on
every render** at a twelve-member bunch, against 4ms for the page's actual
content. It was loading twelve full match profiles and running sixty-six
pairwise scorings, to produce a number the page then discarded, because every
observation a member sees is behavioural and none of them read the compatibility
signal.

| Call | Before | After |
| --- | --- | --- |
| `bunchHealth`, 4 members | 15 queries, 22ms | 4 queries, 3ms |
| `bunchHealth`, 12 members | 15 queries, 78ms | 4 queries, 2ms |

Flat in the size of the bunch now, rather than quadratic.

The pairwise loader was deleted rather than hidden behind a flag. Nothing needed
the number, and an option with no caller is the same dead surface as a settings
toggle nothing sends, when a staff health view or a ranking does need it, that
loop is the one `formation-pool.ts` already runs and belongs with the caller.

**Query count is the number that matters**, not the milliseconds. A call whose
count grows with the size of a bunch or the member base is the one that falls
over at scale, and that is invisible in a wall-clock figure taken against a
seeded database of thirteen people.

Still on the list, and now measurable: `recommendPeople` costs 33 queries for
one Discover section. That is not an N+1: it is candidate loading, rarity and
persistence, but it is the next thing worth reducing.


---

## 23. Privacy policy and terms

`/privacy`, `/terms`, drafts, and marked as drafts in the page itself.

**⚠️ Neither has been reviewed by a lawyer.** They were written by an engineer
from the schema and the services. The liability, governing-law and
international-transfer clauses are the ones most in need of a practitioner's
eye before launch.

### Written from the code, not from a template

The value in writing these here rather than adapting a boilerplate is that
every factual claim can be checked against the thing it describes. The data
categories come from `prisma/schema.prisma`; the location precision from
`geo/precision.ts`; the 30-day session window from `auth/session.ts`; the 16+
minimum from `profile/schemas.ts`; the "no page views, no session duration"
claim from the analytics taxonomy; and the rights described, an immediate
export, an immediate irreversible deletion, are ones that are actually built
rather than promised.

`tests/legal.test.ts` pins the load-bearing ones, so the copy fails the suite if
the code moves underneath it. That includes checking the analytics *values*
rather than the file, because the module's own doc comment names `page.viewed`
and `session.duration` as the events deliberately absent, a naive grep matched
the comment and passed for the wrong reason.

### Placeholders that cannot ship quietly

Everything a lawyer and a founder must supply, entity, address, registration,
jurisdiction, supervisory authority, effective date, lives in `src/lib/legal.ts`
as `TODO_` values. Two things follow from that:

1. A test asserts exactly which fields are still unfilled, so filling them in is
   a deliberate act with a failing test to prompt it.
2. While any remain, both pages render a visible draft banner and say they are
   not in force, rather than presenting an unfinished document as binding.

### What the visual pass changed

Checked in a real browser at 390 and 900 in both themes, after reinstalling
playwright (an earlier `npm i` had pruned it, so the first version of these
pages shipped verified only by rendered HTML).

Three things it caught that the HTML could not:

- **Body copy ran ~100 characters a line.** The `max-w-3xl` container is right
  for headings and the facts table and far too wide for prose. A measure on the
  paragraphs brings it to 71: measured with a canvas rather than assumed,
  because `62ch` is 62 widths of the `0` glyph and lands at ~71 real characters.
- **The terms page sent questions to the privacy address.** The shared layout
  hardcoded one contact; each document now names its own.
- **The draft notice appeared twice**, once as a line and once as the banner.

### Two decisions worth recording

**No cookie banner, because there is nothing to consent to.** One httpOnly
session cookie and no trackers of any kind. Adding a banner would imply choices
that do not exist.

**The policy commits us to things the code already does.** "We will name a
processor here before it goes live", "nothing you write is sent to an external
AI provider today, and we will say so before that changes", these are
promises the current architecture makes easy to keep and would make obvious to
break, which is the only kind worth writing down.


---

## 24. Ban evasion

`src/server/modules/moderation/banned-emails.ts`.

Deleting an account frees its email address. Without something here, a banned
member deletes, signs straight back up, and every block, report and moderation
decision about them is void, which fails the people the ban was for.

Closing it means retaining a fingerprint of someone who may have asked to be
forgotten. That is a real cost, and worth stating rather than pretending it is
free. **The judgement made:** the people a ban protects have a stronger interest
in not meeting that person again than the banned person has in the erasure of
one opaque hash. Four constraints keep it proportionate:

1. **Keyed, not merely hashed.** A plain SHA-256 of an email is reversible in
   practice, the address space is small enough to enumerate. An HMAC under
   `AUTH_SECRET` means a copy of the table alone tells an attacker nothing.
2. **No foreign key to `User`.** That is the entire point: a cascade would take
   the row with the account, which is exactly the evasion path.
3. **Bans only, and reversible.** Suspensions never write a row, blocking an
   address would quietly turn a temporary measure into a permanent one, a
   member simply leaving never writes one, and lifting a ban deletes it.
4. **Written in the ban transaction.** An account that is banned but whose
   address is still free is the window this closes.

### The refusal message is deliberately the wrong one

Signup answers a banned address with *"An account with that email already
exists"*, the same words as an address genuinely in use. A distinct message
would be an oracle: anyone could type an address at signup and learn whether
that person had been banned. Someone actually banned already knows, and can
write to support. There is an integration test asserting the two messages are
identical, because the tempting "improvement" here is a clearer error.

Documented in the privacy policy as the one place where deleting an account does
not remove everything, along with the reasoning and an invitation to object.


---

## 25. An access-control pass

All 41 API routes probed by hand against a running build: unauthenticated, then
as a signed-in member who should not have access.

**Unauthenticated:** every route answered 401 or 405. No response body carried
an email address, password hash, coordinate, birth year or session hash.

**As a plain member**, one real hole. `/api/admin/users/[userId]` answered
**422 with the validation schema** where every other admin route answers 404,
because it parsed the body before resolving a guard. The per-branch guards were
right (suspending is a moderator action, changing a role is admin-only, and one
shared `requireStaff()` would hand moderators self-promotion), but the parse ran
first, so a member could confirm the route existed and learn its shape. That is
exactly the reconnaissance the 404-not-403 rule exists to deny. There is now a
coarse staff gate before the parse, and the per-branch guards are unchanged.

Everything else held: a foreign bunch's messages 403, a foreign notification a
silent no-op, and a discoverable bunch showing a non-member its description and
interests with an empty member list, no messages and no join requests.

The findings are locked in as `tests/integration/access-control.test.ts` at the
service layer, where the guards actually live: direct messages readable by the
two people in them and nobody else, bunch chat closed to non-members for both
reading and posting, and an export that contains the requester's own account and
never the other party's email.

### The three things that pass were also checked, not assumed

**CSRF.** The session cookie is `Secure; HttpOnly; SameSite=lax`, confirmed on
the wire rather than in the source, so a cross-site `POST`/`PATCH`/`DELETE`
never carries it. `Lax` does send the cookie on a top-level `GET` navigation,
but every `GET` here is read-only and same-origin policy stops the initiating
page from reading the response, including `/api/account/export`, which a
navigation would download to the victim's own disk and nowhere else.

**Rate limits.** All nine configured rules have a live consumer; none is
configured-but-unenforced, which is the failure mode that leaves a limit looking
present in a config file and absent in the request path.

**The live chat stream.** A non-member gets 403. More importantly, membership is
re-checked on *every* poll rather than once at connection, a stream opened
legitimately and left running would otherwise outlive being removed from the
bunch. Verified by opening a stream, revoking membership three seconds in, and
watching the connection close on the next tick.

That guarantee rests on something subtle enough to regress: a removed member
still has a `BunchMembership` row, so a guard that merely looked one up would
let them through. There is now a test asserting `REMOVED`, `LEFT`, `REQUESTED`
and `INVITED` are all refused.


---

## 26. Continuous integration

`.github/workflows/verify.yml`. Three jobs in parallel.

**static**, typecheck, lint, unit and component tests. No database, so a lint
error reports in under a minute instead of waiting behind Postgres.

**integration**, a `postgres:16` service container with a health check, because
without one the steps start before it accepts connections. The suite derives
`bunchy_test` from `DATABASE_URL` and creates it itself, and refuses to run
against anything not named that (§9).

**build**, the production build catches what no test suite does: a client
component importing from `src/server`, a bad route export, a Tailwind class that
does not resolve.

Every job runs `prisma generate` first: the client is generated code and is not
committed, so nothing typechecks until it exists.

Setting this up removed an undeclared dependency. The integration setup shelled
out to `psql` to create the test database, fine locally, and exactly the kind
of assumption that works on one machine and fails on the first push. It now uses
the `pg` client the app already depends on, promoted from a transitive
dependency to a declared one.

---

## 27. Sending real email

`src/server/email/smtp.ts`.

**SMTP rather than a provider SDK.** Every transactional provider worth using
speaks it, so changing provider is four environment variables rather than a
dependency swap and a rewrite, which matters when one person is running this.

What this carries is password-reset and verification links: the mail that
decides whether someone locked out of their account gets back in. Three
consequences:

- **One pooled connection.** A TLS handshake per message is slow and gets an IP
  rate-limited.
- **Retries, classified.** A 4xx is "try again later" and is retried three times
  with backoff; a 5xx is a refusal that retrying only delays. A failure with no
  response code at all, timeout, dropped socket, DNS, is retried, because we
  never got a usable answer.
- **The reset link never reaches the log.** `sendEmail`'s callers deliberately
  swallow errors so a failed notification cannot break the action that caused
  it, which makes this the last layer where a problem is visible, and a
  single-use credential written to a log file outlives the email it was sent in.
  There is a test asserting the subject appears and the token does not.

Writing the tests found a real flaw: the transporter was resolved *inside* the
retry loop, so a missing `SMTP_HOST` carried no response code, was classified
transient, and got retried three times with backoff before reporting a problem
no amount of waiting fixes. It is resolved once, before the loop.

`env.ts` refuses `EMAIL_PROVIDER=smtp` without a host at boot, and warns when
production is left on `console`, silently logging reset links is the worst of
both options.
