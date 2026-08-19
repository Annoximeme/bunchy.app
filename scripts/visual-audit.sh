#!/usr/bin/env bash
# Bunchy, run the visual and accessibility audit against a throwaway instance.
#
#   ./scripts/visual-audit.sh [output-directory]   # defaults to ./screenshots
#
# Brings up a preview container, points the audit at it, and removes it again
# whether the audit passed, failed or was interrupted.
#
# ## Why this is a script and not a command to copy
#
# It replaces a hand-written `docker run` that had the production database
# password and a fixed, source-visible AUTH_SECRET typed into it, and that left
# the container running afterwards. Each of those is a small thing and together
# they are a standing credential on the machine: a long-lived process holding
# database access, keyed with a secret anybody reading a shell history could
# use to mint session cookies for it.
#
# So: credentials come from .env rather than the command line, the session
# secret is generated per run and never written down, and the container is
# removed on the way out by a trap rather than by remembering.
#
# ## The preview database
#
# A separate database on the same Postgres instance, holding seeded demo data.
# It is *not* the production database and must never be pointed at it, the
# audit signs in and clicks things. Create it once with:
#
#   docker compose exec db createdb -U "$POSTGRES_USER" bunchy_preview
#   docker compose run --rm -e DATABASE_URL=<preview url> migrate
#   # then seed it: npm run db:seed with DATABASE_URL set to the preview url
set -euo pipefail

cd "$(dirname "$0")/.."

# ./screenshots is already gitignored, so a run cannot commit member-shaped
# demo data by accident.
OUT_DIR="${1:-./screenshots}"
IMAGE="bunchy-app:preview"
CONTAINER="bunchy-preview-$$"
NETWORK="bunchy_backend"
PLAYWRIGHT_IMAGE="mcr.microsoft.com/playwright:v1.62.1-noble"

if [ ! -f .env ]; then
  echo "No .env here. This needs the database credentials from it." >&2
  exit 1
fi

# Only the three variables this needs, and only from assignments, `source`ing
# a file written for docker compose runs whatever happens to be in it.
read_env() {
  sed -n "s/^$1=//p" .env | tail -1
}

POSTGRES_USER="$(read_env POSTGRES_USER)"
POSTGRES_PASSWORD="$(read_env POSTGRES_PASSWORD)"
PREVIEW_DB="${PREVIEW_DB:-bunchy_preview}"

if [ -z "$POSTGRES_PASSWORD" ]; then
  echo "POSTGRES_PASSWORD is not set in .env." >&2
  exit 1
fi
: "${POSTGRES_USER:=bunchy}"

if [ "$PREVIEW_DB" = "$(read_env POSTGRES_DB)" ]; then
  echo "PREVIEW_DB is the production database. Refusing: this signs in and clicks things." >&2
  exit 1
fi

# Per run, and never persisted. The preview instance issues its own session
# cookies and nothing outside this script's lifetime needs to verify them.
AUTH_SECRET="$(head -c 32 /dev/urandom | base64 | tr -d '\n=' )"

cleanup() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

echo "==> Building the preview image"
docker build --target runner -t "$IMAGE" . >/dev/null

echo "==> Starting $CONTAINER"
docker run -d --name "$CONTAINER" --network "$NETWORK" \
  -e NODE_ENV=production \
  -e DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${PREVIEW_DB}?schema=public" \
  -e AUTH_SECRET="$AUTH_SECRET" \
  -e APP_URL="http://${CONTAINER}:3000" \
  -e EMAIL_PROVIDER=console \
  "$IMAGE" >/dev/null

# Ready, rather than a fixed sleep: the container is up long before it serves.
echo "==> Waiting for it to answer"
for _ in $(seq 1 30); do
  if docker run --rm --network "$NETWORK" curlimages/curl:latest \
      -sS -o /dev/null --max-time 3 "http://${CONTAINER}:3000/login" 2>/dev/null; then
    break
  fi
  sleep 1
done

mkdir -p "$OUT_DIR"
OUT_ABS="$(cd "$OUT_DIR" && pwd)"

echo "==> Auditing"
docker run --rm --network "$NETWORK" \
  -v "$PWD":/app -v "$OUT_ABS":/out -w /app \
  -e BASE_URL="http://${CONTAINER}:3000" -e OUT_DIR=/out \
  --user "$(id -u):$(id -g)" \
  "$PLAYWRIGHT_IMAGE" node_modules/.bin/tsx scripts/visual-audit.ts

echo "==> Screenshots and axe.json are in $OUT_ABS"
