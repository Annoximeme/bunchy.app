import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";
import { promisify } from "node:util";

// `promisify`'s inferred overload drops the options argument, which is exactly
// the argument we need in order to raise the cost parameters.
const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

/**
 * Password hashing with scrypt.
 *
 * scrypt is memory-hard, ships in the Node standard library and needs no
 * native build step, which keeps the container image and CI simple. Argon2id
 * would be a marginal improvement; the cost of a native dependency is not worth
 * it at this stage. Parameters are stored inside each hash so they can be
 * raised later without invalidating existing passwords — `needsRehash` reports
 * when an old hash should be upgraded on next successful login.
 */

const PARAMS = {
  N: 32_768,
  r: 8,
  p: 1,
  keyLength: 64,
  saltLength: 16,
} as const;

// 128 * N * r bytes are needed; Node's 32 MB default is not enough at N=32768.
const MAX_MEM = 128 * PARAMS.N * PARAMS.r * 2;

/**
 * The most expensive hash this will agree to verify.
 *
 * scrypt needs `128 * N * r` bytes, so the ceiling that matters is on the
 * product rather than on either factor. 256MB is eight times what PARAMS costs
 * today, which leaves room to raise the real cost several times over before
 * this needs revisiting, and is still an allocation the container can survive.
 */
const MAX_ACCEPTED_MEM = 256 * 1024 * 1024;
const MAX_ACCEPTED_P = 16;

const PREFIX = "scrypt";

async function derive(
  password: string,
  salt: Buffer,
  N: number,
  r: number,
  p: number,
  keyLength: number,
): Promise<Buffer> {
  return scrypt(password.normalize("NFKC"), salt, keyLength, {
    N,
    r,
    p,
    maxmem: Math.max(MAX_MEM, 128 * N * r * 2),
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(PARAMS.saltLength);
  const key = await derive(
    password,
    salt,
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    PARAMS.keyLength,
  );
  return [
    PREFIX,
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

/**
 * Constant-time verification. Returns false rather than throwing on malformed
 * input so a corrupted row can never crash the login path.
 */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6) return false;

  const [prefix, rawN, rawR, rawP, rawSalt, rawKey] = parts as [
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  if (prefix !== PREFIX) return false;

  const N = Number(rawN);
  const r = Number(rawR);
  const p = Number(rawP);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return false;
  }

  // The cost parameters come out of the stored string, which means the work
  // this function does is described by data rather than by code. That is the
  // point — it is what lets the parameters be raised without invalidating
  // every existing password — but it must have a ceiling. A single row reading
  // `scrypt$1073741824$8$1$...` would otherwise ask for gigabytes on the next
  // login attempt against that account, and a hash is not a trustworthy input
  // once anything can write one.
  //
  if (N < 2 || r < 1 || p < 1) return false;
  if (p > MAX_ACCEPTED_P) return false;
  if (128 * N * r > MAX_ACCEPTED_MEM) return false;

  let expected: Buffer;
  let actual: Buffer;
  try {
    expected = Buffer.from(rawKey, "base64");
    const salt = Buffer.from(rawSalt, "base64");
    if (expected.length === 0 || salt.length === 0) return false;
    actual = await derive(password, salt, N, r, p, expected.length);
  } catch {
    return false;
  }

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** True when `stored` was produced with weaker parameters than we now use. */
export function needsRehash(stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6) return true;
  const [prefix, rawN, rawR, rawP] = parts;
  return (
    prefix !== PREFIX ||
    Number(rawN) < PARAMS.N ||
    Number(rawR) < PARAMS.r ||
    Number(rawP) < PARAMS.p
  );
}
