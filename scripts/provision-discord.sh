#!/usr/bin/env bash
# Bunchy, build out the Discord server.
#
#   ./scripts/provision-discord.sh           # dry run, prints the plan
#   ./scripts/provision-discord.sh --apply   # does it
#
# Reads the credentials from .env rather than taking them on the command line,
# so the token never lands in a shell history.
set -euo pipefail
cd "$(dirname "$0")/.."

read_env() { sed -n "s/^$1=//p" .env | tail -1; }

TOKEN="$(read_env DISCORD_BOT_TOKEN)"
GUILD="$(read_env DISCORD_GUILD_ID)"

if [ -z "$TOKEN" ] || [ -z "$GUILD" ]; then
  echo "DISCORD_BOT_TOKEN and DISCORD_GUILD_ID must both be in .env" >&2
  exit 1
fi

# Needs egress to reach Discord, and nothing else. No database, no app image.
docker run --rm --network bunchy_egress \
  -v "$PWD":/app -w /app \
  -e DISCORD_BOT_TOKEN="$TOKEN" -e DISCORD_GUILD_ID="$GUILD" \
  node:22-alpine npx tsx scripts/provision-discord.ts "$@"
