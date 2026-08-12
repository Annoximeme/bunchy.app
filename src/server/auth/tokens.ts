import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Opaque bearer tokens for sessions, email verification and password resets.
 *
 * The raw token is shown to the user exactly once (in a cookie or an email
 * link). Only its SHA-256 digest is stored, so a database leak yields no usable
 * credentials. SHA-256 is the right primitive here — unlike a password these
 * are 256 bits of true randomness, so there is nothing to brute force and a
 * slow KDF would only add latency to every request.
 */

export interface IssuedToken {
  /** Give this to the user. Never store it. */
  token: string;
  /** Store this. */
  hash: string;
}

export function issueToken(byteLength = 32): IssuedToken {
  const token = randomBytes(byteLength).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time comparison of two hex digests. */
export function tokenHashEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/** One-way, salted with the app secret. Used for IPs we must not store raw. */
export function hashIdentifier(value: string, secret: string): string {
  return createHash("sha256").update(`${secret}:${value}`).digest("hex");
}
