# Deploying Bunchy

A single VPS running Docker Compose: Postgres, the Next.js server, an hourly
jobs container, and Caddy terminating TLS. Everything is in this repository —
there is no console to click through, and rebuilding the machine from scratch
is `git clone`, one `.env`, one command.

## What was actually tested

The image build and the full stack were verified end to end before this was
written: all 18 migrations applied against a real Postgres, the app reported
healthy in 2 seconds, pages served, a signed-out request to `/discover`
redirected, the jobs container completed a run, Postgres was not reachable from
the host, and the web process ran as uid 1001 rather than root.

Two things were **not** verified, both because they cannot be from a sandbox,
and both are the most likely place a first deploy goes wrong:

- **Caddy obtaining a certificate.** That needs the real domain resolving to
  the real server. See "If TLS does not come up" below.
- **SMTP delivery.** Needs real credentials. `EMAIL_PROVIDER=console` ships as
  the default precisely so this cannot fail silently — it writes mail to the
  log and sends nothing, which is fine for a smoke test and unacceptable the
  moment anyone but you has an account.

## Before you start

Point DNS at the server first, and let it propagate. Caddy asks Let's Encrypt
for a certificate on first start, and Let's Encrypt rate-limits failures — so
getting DNS wrong first costs you an hour of waiting rather than a retry.

Two A records, both to the VPS IPv4:

```
bunchy.app.      A    <server-ip>
www.bunchy.app.  A    <server-ip>
```

Check from somewhere that is not the server:

```sh
dig +short bunchy.app
dig +short www.bunchy.app
```

## First deploy

```sh
# On the VPS, as a non-root user in the docker group.
git clone https://github.com/Annoximeme/bunchy.app.git
cd bunchy.app
git checkout claude/bunchy-platform-architecture-2j8d04

cp .env.production.example .env
chmod 600 .env
```

Fill in `.env`. Generate the two secrets rather than choosing them:

```sh
openssl rand -hex 24      # POSTGRES_PASSWORD
openssl rand -base64 48   # AUTH_SECRET
```

You write the database password once; each container assembles `DATABASE_URL`
from it and percent-encodes it, so any password is safe to use. Hex is
suggested only because it is unambiguous to read back off a screen.

That encoding exists because of a real failure. A base64 password contained a
`/`, which ends the authority section of a URL, so Postgres came up healthy and
`prisma migrate deploy` reported `P1013: invalid port number in database URL` —
an error naming the port, which was fine, rather than the password, which was
not.

`AUTH_SECRET` salts hashed identifiers including the banned-email fingerprints.
Changing it later invalidates every session and every existing ban record, so
generate it once and keep it somewhere you will still have in a year.

Then:

```sh
docker compose up -d --build
docker compose logs -f caddy    # watch the certificate being issued
```

Visit `https://bunchy.app`. If it loads, you are done.

### Optional: demo data

```sh
docker compose run --rm migrate npx prisma db seed
```

Thirteen members, four bunches with six weeks of history, and some activities.
**Only on a machine nobody real is using** — it creates accounts with a known
password.

## Subsequent deploys

```sh
./deploy.sh
```

Pulls, rebuilds, migrates, restarts, waits for health, and prunes dangling
images. It exits non-zero and prints the last 40 log lines if the app never
becomes healthy, so a broken deploy is loud.

## Operating it

```sh
docker compose ps                    # what is running, and health
docker compose logs -f app           # the web process
docker compose logs -f jobs          # hourly work — reminders, chemistry
docker compose restart app           # restart just the server
docker compose exec db psql -U bunchy bunchy   # a database shell
```

### Backups

The database is the only thing on the machine that cannot be rebuilt from git.

```sh
docker compose exec -T db pg_dump -U bunchy -Fc bunchy > bunchy-$(date +%F).dump
```

Worth putting in the host's crontab, writing somewhere off the machine. A
backup that lives only on the server it is backing up is not a backup.

Restoring:

```sh
docker compose exec -T db pg_restore -U bunchy -d bunchy --clean --if-exists < bunchy-2026-08-12.dump
```

The other volume worth knowing about is `caddy-data`, which holds the TLS
certificates and the ACME account key. Losing it means re-issuing on next
start, and Let's Encrypt rate-limits that.

### Turning on real email

Until you do this, nobody can reset a password.

Any provider works — Resend, Postmark, Mailgun, SES, Fastmail — because the app
speaks plain SMTP rather than a vendor SDK. Set four values in `.env`:

```
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
```

Then `docker compose up -d app jobs`. The app refuses to start in production
with `EMAIL_PROVIDER=smtp` and no `SMTP_HOST`, rather than discovering it when
somebody is locked out.

To see what any of the mail actually looks like, sign in as staff and open
**Admin → Brand → Email**. Those previews are rendered by the same templates
that do the sending, so they cannot show you something the product does not
send.

### Launch day: telling the waiting list

The coming-soon page promises everyone on the list exactly one message, on the
day it opens. This sends it. Run by hand, when you have decided that today is
the day — nothing schedules it.

```
# Rehearsal. Sends nothing, reports what it would do.
docker compose exec jobs /usr/local/bin/entrypoint.sh \
  node node_modules/.bin/tsx scripts/announce-launch.ts

# The first five, for real. Read them in a real inbox before the rest.
docker compose exec jobs /usr/local/bin/entrypoint.sh \
  node node_modules/.bin/tsx scripts/announce-launch.ts --send --limit 5

# The rest.
docker compose exec jobs /usr/local/bin/entrypoint.sh \
  node node_modules/.bin/tsx scripts/announce-launch.ts --send
```

Two details in that command are load-bearing. It is the **`jobs`** container,
not `app`: the app image is a standalone Next build with no devDependencies, so
there is no `tsx` in it. And the entrypoint is named **explicitly**, because
`docker compose exec` skips a container's ENTRYPOINT and that is where
`DATABASE_URL` is assembled — without it the script fails with
`DATABASE_URL: expected string, received undefined`, which looks like a broken
`.env` and is not.

Interrupting it is safe. Progress is a `notifiedAt` timestamp per address, so
running it again picks up exactly the people it did not finish, and a failed
address is left unmarked to be retried. It will refuse to send at all while
`EMAIL_PROVIDER` is `console`.

## When something is wrong

**The app will not start.** `docker compose logs app`. The environment is
validated at boot and the error names the missing variable.

**Migrations failed.** `docker compose logs migrate`. The app deliberately does
not start, so the site stays on the previous container until it is fixed.

**Password authentication failed after changing `POSTGRES_PASSWORD`.** Expected.
Postgres sets that password when it initialises an empty data directory and
ignores it forever after, so editing `.env` changes what the app *sends* and
not what the database *expects*. Change it in the database as well:

```sh
docker compose exec db psql -U bunchy -d bunchy -c "ALTER ROLE bunchy WITH PASSWORD 'the-new-one';"
docker compose up -d
```

On a machine where no migration has ever succeeded there is nothing in that
volume yet, so `docker compose down -v` is the faster route. Once the site has
run even once, `-v` deletes the database — the flag has no undo and no warning.

**If TLS does not come up.** `docker compose logs caddy`. Almost always one of:
DNS not yet resolving to this server; port 80 blocked by the host firewall
(Let's Encrypt's HTTP challenge needs it, not just 443); or a rate limit from
earlier failed attempts. For the third, uncomment `acme_ca` in the `Caddyfile`
to use the staging CA — its certificates are untrusted by browsers, but the
limits are far looser, so you can confirm the rest works and then switch back.

**Disk filling up.** `docker system df`. `deploy.sh` prunes dangling images,
but old build cache accumulates: `docker builder prune -f`.

## What this deliberately does not do

- **No zero-downtime deploy.** `docker compose up -d` restarts the app
  container, so there are a few seconds of downtime. Blue-green on one VPS
  means two app containers, a proxy that can drain connections, and a migration
  discipline where every change works against both versions at once. That is
  worth doing when downtime costs something; right now it costs a few seconds.
- **No automatic rollback.** `git checkout <sha> && ./deploy.sh` is the rollback,
  and it is worth knowing that a migration is not undone by it — reversing a
  schema change is a decision, not a script.
- **No secret manager.** `.env` at 600 on a single machine is proportionate for
  one operator. It stops being proportionate the moment someone else has a
  login.
