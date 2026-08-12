#!/bin/sh
#
# Builds DATABASE_URL from its parts, percent-encoding them properly.
#
# This exists because of a real deploy failure. A password generated with
# `openssl rand -base64` contained a `/`, and:
#
#   postgresql://bunchy:aB3/xY9z@db:5432/bunchy
#                           ^ the authority ends here
#
# everything after that slash is a path, so the parser reads `aB3` as the port
# and reports `P1013: invalid port number in database URL` — a message that
# points at the port, which was fine, rather than at the password, which was
# not. The database was healthy throughout, which made it read like a
# networking problem.
#
# Documenting "use hex" would have been enough to avoid it and not enough to
# fix it: the next person to paste a password with a `/`, `@`, `#` or `?` into
# `.env` gets the same forty minutes. Encoding here means any password works,
# including one chosen by a password manager that does not know it will end up
# inside a URL.
#
# An explicitly-set DATABASE_URL always wins, so pointing at a managed Postgres
# elsewhere still works and the build stage's placeholder is untouched.

set -e

if [ -z "${DATABASE_URL:-}" ]; then
  DATABASE_URL=$(node -e '
    const fail = (message) => {
      console.error(`[entrypoint] ${message}`);
      process.exit(1);
    };
    const need = (name) =>
      process.env[name] ||
      fail(
        `${name} is not set. Either set DATABASE_URL directly, or set ` +
        `POSTGRES_USER, POSTGRES_PASSWORD and POSTGRES_DB.`,
      );

    // Credentials are encoded. The driver decodes them, so any password works.
    const user = encodeURIComponent(need("POSTGRES_USER"));
    const password = encodeURIComponent(need("POSTGRES_PASSWORD"));

    // The rest is checked rather than encoded, because the decoding is not
    // symmetric: `pg-connection-string` unescapes the credentials and leaves
    // the path alone, so an encoded database name arrives at Postgres as the
    // literal text `bun%2Fchy`. A name that would need escaping is a typo
    // rather than a requirement, and saying so beats connecting to the wrong
    // database. (Found by a test, which is the only reason this comment is
    // here rather than a second outage.)
    const plain = (name, pattern) => {
      const value = need(name);
      if (!pattern.test(value)) {
        fail(`${name}="${value}" contains characters that cannot go in a connection URL.`);
      }
      return value;
    };
    const database = plain("POSTGRES_DB", /^[A-Za-z0-9_-]+$/);
    process.env.POSTGRES_HOST ||= "db";
    process.env.POSTGRES_PORT ||= "5432";
    const host = plain("POSTGRES_HOST", /^[A-Za-z0-9_.-]+$/);
    const port = plain("POSTGRES_PORT", /^[0-9]+$/);

    process.stdout.write(
      `postgresql://${user}:${password}@${host}:${port}/${database}?schema=public`,
    );
  ')
  export DATABASE_URL
fi

exec "$@"
