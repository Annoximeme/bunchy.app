# Bunchy — production image.
#
# Four stages, and the split is doing real work rather than following a
# template. `deps` installs once and is cached until package-lock changes;
# `build` produces the standalone server; `migrate` keeps the Prisma CLI and
# the schema engine, which the runtime deliberately does not have; `runner`
# ships the traced server and nothing else.
#
# The migration image exists separately because `prisma migrate deploy` needs
# the schema engine binary — tens of megabytes that the web process has no use
# for, and that would otherwise sit in the image handling public traffic.

ARG NODE_VERSION=22-alpine

# --- deps -------------------------------------------------------------------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

# Playwright is a devDependency used for local browser checks, and its
# postinstall tries to pull ~200MB of browsers. In a build container with no
# route to the CDN that does not fail cleanly — npm dies with "Exit handler
# never called" after about seventy seconds, which reads like anything but a
# download problem. Nothing in the image runs a browser.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# devDependencies are needed: next, typescript, tailwind and the prisma CLI all
# build the app. None of them reach the runtime image, which copies only the
# traced standalone output.
#
# Only the manifests, so this layer survives every change that is not a
# dependency change.
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# --- build ------------------------------------------------------------------
FROM node:${NODE_VERSION} AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# The client is generated inside the image rather than copied from the host, so
# it can never be out of step with the schema being built.
RUN npx prisma generate

# `next build` evaluates route modules to collect page data, which touches the
# environment validator. A placeholder is enough to satisfy shape validation;
# the real secrets are asserted at boot on the first server start, never here.
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build"
RUN npm run build

# --- migrate ----------------------------------------------------------------
# Run as a one-shot service before the app starts. Carries the Prisma CLI, the
# schema and the migration history, and nothing else.
FROM node:${NODE_VERSION} AS migrate
WORKDIR /app

ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json prisma.config.ts ./
COPY prisma ./prisma
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod 0755 /usr/local/bin/entrypoint.sh

USER node
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["npx", "prisma", "migrate", "deploy"]

# --- runner -----------------------------------------------------------------
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# wget is used by the compose healthcheck; alpine's busybox already has it.
RUN addgroup -g 1001 -S bunchy && adduser -u 1001 -S bunchy -G bunchy

# `standalone` contains the server plus its traced dependencies. `static` is
# not traced — Next expects it copied alongside.
#
# There is no `public/` copy because this project has no `public/` directory:
# the favicon and apple-icon live in `src/app` as Next file conventions and are
# emitted into the build. A COPY of a directory that does not exist fails the
# build outright rather than being skipped, which is how this was found.
COPY --from=build --chown=bunchy:bunchy /app/.next/standalone ./
COPY --from=build --chown=bunchy:bunchy /app/.next/static ./.next/static
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod 0755 /usr/local/bin/entrypoint.sh

USER bunchy
EXPOSE 3000

# Never root, never the build's node_modules, never the Prisma CLI.
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "server.js"]

# --- jobs -------------------------------------------------------------------
# The scheduled work (activity reminders, availability purge, chemistry).
# A container with a sleep loop rather than host cron: it is declared in the
# same compose file as everything else, so a machine rebuild cannot silently
# lose it the way an uncommitted crontab does.
FROM node:${NODE_VERSION} AS jobs
WORKDIR /app

ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/src/generated ./src/generated
COPY package.json tsconfig.json prisma.config.ts ./
COPY prisma ./prisma
COPY scripts ./scripts
COPY src ./src
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod 0755 /usr/local/bin/entrypoint.sh

USER node
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
# Hourly. Every job inside is idempotent, so a missed or doubled run is safe.
CMD ["sh", "-c", "while true; do node --enable-source-maps node_modules/.bin/tsx scripts/run-jobs.ts || echo '[jobs] run failed'; sleep 3600; done"]
