#!/bin/sh
#
# Nightly database backup.
#
# The database is the only thing on this machine that cannot be rebuilt from
# git, so this is the one piece of state worth protecting. Everything else,
# images, containers, certificates, comes back from `docker compose up`.
#
# Run by cron as the user that owns the deploy. Writes a custom-format dump,
# which restores with `pg_restore --clean --if-exists` and, unlike plain SQL,
# can restore selected tables.
#
# WARNING: these dumps live on the same disk as the database they protect. A
# backup that only exists on the machine it is backing up is not a backup, it
# survives a bad migration, and does not survive the disk, the provider, or a
# mistaken `docker compose down -v`. Copying them off the machine is the step
# that makes this real; see the note at the bottom of the file.

set -eu

REPO="${BUNCHY_REPO:-/home/gianni/bunchy.app}"
DEST="${BUNCHY_BACKUP_DIR:-/var/backups/bunchy}"
KEEP_DAYS="${BUNCHY_BACKUP_KEEP_DAYS:-14}"

# Read from .env rather than hardcoding, but never source it: the file contains
# values with spaces and angle brackets (EMAIL_FROM) that a shell would try to
# execute as a redirect.
env_value() {
  grep -E "^$1=" "$REPO/.env" 2>/dev/null | head -1 | cut -d= -f2- || true
}

DB_USER="$(env_value POSTGRES_USER)"
DB_NAME="$(env_value POSTGRES_DB)"
: "${DB_USER:=bunchy}"
: "${DB_NAME:=bunchy}"

STAMP="$(date +%F-%H%M)"
mkdir -p "$DEST"
chmod 700 "$DEST"

TARGET="$DEST/bunchy-$STAMP.dump"
PARTIAL="$TARGET.partial"

# Written to a .partial name and renamed only on success, so an interrupted run
# can never leave a truncated file that looks like a usable backup.
docker compose --project-directory "$REPO" exec -T db \
  pg_dump -U "$DB_USER" -Fc "$DB_NAME" > "$PARTIAL"

# A dump of an empty-but-valid database is still several KB of header and
# catalogue; anything smaller means pg_dump wrote an error and exited 0 through
# the pipe.
SIZE="$(wc -c < "$PARTIAL")"
if [ "$SIZE" -lt 1000 ]; then
  echo "[backup] refusing to keep a ${SIZE}-byte dump, something went wrong" >&2
  rm -f "$PARTIAL"
  exit 1
fi

mv "$PARTIAL" "$TARGET"
chmod 600 "$TARGET"

# Uploaded avatars: the only member data that is not in Postgres, and therefore
# the only other thing on this machine that a restore cannot reconstruct. Small
#, one compressed image per member, so it is taken in full every night rather
# than incrementally.
UPLOADS="$DEST/bunchy-uploads-$STAMP.tgz"
if docker volume inspect bunchy_uploads >/dev/null 2>&1; then
  docker run --rm \
    -v bunchy_uploads:/uploads:ro \
    -v "$DEST":/backup \
    alpine tar czf "/backup/$(basename "$UPLOADS").partial" -C /uploads . 2>/dev/null
  mv "$UPLOADS.partial" "$UPLOADS"
  chmod 600 "$UPLOADS"
fi

# Retention. Deletes only files this script names, so a stray file in the
# directory is never removed by it.
find "$DEST" -maxdepth 1 -name 'bunchy-*.dump' -mtime "+$KEEP_DAYS" -delete
find "$DEST" -maxdepth 1 -name 'bunchy-uploads-*.tgz' -mtime "+$KEEP_DAYS" -delete

echo "[backup] $TARGET ($SIZE bytes), keeping $KEEP_DAYS days"

# --- Getting these off the machine -------------------------------------------
#
# Deliberately not implemented here, because it needs a destination and a
# credential that only you can choose. Whatever you pick, add one line below:
#
#   rsync -az "$TARGET" backups@elsewhere:/bunchy/     # another host over SSH
#   rclone copy "$TARGET" remote:bunchy-backups        # S3, B2, Drive, etc.
#
# Then test the restore path at least once. An untested backup is a hypothesis:
#
#   docker compose exec -T db pg_restore -U bunchy -d bunchy --clean \
#     --if-exists < /var/backups/bunchy/bunchy-YYYY-MM-DD-HHMM.dump
