import { existsSync } from "node:fs";

/**
 * Loading `.env` and `.env.local`, in the order that gives `.env.local` the
 * last word.
 *
 * Prisma 7 no longer loads `.env` implicitly and Node 22 can do it natively, so
 * four separate entry points, the Prisma config, the seed, and both test
 * setups, each grew their own copy of the same two-line loop. All four wrote
 * it the same way, and all four were wrong in the same way.
 *
 * ## The order is backwards from how it reads
 *
 * `process.loadEnvFile` does **not** overwrite a variable that is already set.
 * First writer wins, not last. So the obvious spelling,
 *
 *     for (const file of [".env", ".env.local"]) loadEnvFile(file)
 *
 * gives `.env` precedence: by the time `.env.local` is read, every key it
 * shares with `.env` is already taken, and its value is silently discarded.
 * Two of those copies carried a comment claiming the opposite, that
 * `.env.local` wins, "matching Next.js precedence". It never did.
 *
 * That is the worst shape a configuration bug can take. Nothing fails: you
 * write an override, the file is read, the variable exists, and the value is
 * the one you were trying to replace. It cost an afternoon pointing the
 * integration suite at a database that was not the one named in `.env.local`.
 *
 * So the list is reversed, and the reversal is the entire point of this
 * function. `.env.local` is read first, claims its keys, and `.env` fills in
 * only what is left. That is Next.js precedence, which matters because the app
 * itself is loaded by Next and has always behaved this way: before this, the
 * app and its own tooling disagreed about which database they were talking to.
 *
 * Anything already in the real environment beats both files, which is what
 * makes `DATABASE_URL=... npm run something` work.
 */
export function loadEnvFiles(): void {
  for (const file of [".env.local", ".env"]) {
    if (existsSync(file)) process.loadEnvFile(file);
  }
}
