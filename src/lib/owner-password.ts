// The owner password hash in OWNER_PASSWORD_HASH:
//   scrypt:N:r:p:<salt base64url>:<hash base64url>
// Colons, not "$": both Next's .env loader and Docker Compose expand "$..."
// and would quietly mangle the value. "$" separators are still accepted.
// node:crypto only, so scripts/hash-owner-password.ts can import it.
import crypto from "node:crypto";

type ScryptParams = { N: number; r: number; p: number };

export type OwnerHash = ScryptParams & { salt: Buffer; hash: Buffer };

const DEFAULTS: ScryptParams = { N: 32768, r: 8, p: 1 };

function scrypt(password: string, salt: Buffer, keylen: number, params: ScryptParams) {
  return new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(
      password,
      salt,
      keylen,
      // The default maxmem (32 MiB) is exactly what N=32768, r=8 needs, which
      // Node rejects.
      { ...params, maxmem: 256 * params.N * params.r },
      (err, key) => (err ? reject(err) : resolve(key)),
    );
  });
}

// null for anything malformed or with parameters outside a sane range, so a
// bad value can't hang the server.
export function parseOwnerHash(value: string | undefined): OwnerHash | null {
  const parts = value?.trim().split(/[:$]/);
  if (!parts || parts.length !== 6 || parts[0] !== "scrypt") return null;
  const [N, r, p] = parts.slice(1, 4).map(Number);
  if (!Number.isInteger(N) || N < 16384 || N > 1048576 || (N & (N - 1)) !== 0) return null;
  if (!Number.isInteger(r) || r < 1 || r > 16) return null;
  if (!Number.isInteger(p) || p < 1 || p > 4) return null;
  const salt = Buffer.from(parts[4], "base64url");
  const hash = Buffer.from(parts[5], "base64url");
  if (salt.length < 16 || hash.length < 32 || hash.length > 64) return null;
  return { N, r, p, salt, hash };
}

export async function hashOwnerPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, 32, DEFAULTS);
  const { N, r, p } = DEFAULTS;
  return ["scrypt", N, r, p, salt.toString("base64url"), hash.toString("base64url")].join(":");
}

export async function verifyOwnerPassword(
  password: string,
  stored: OwnerHash,
): Promise<boolean> {
  const hash = await scrypt(password, stored.salt, stored.hash.length, stored);
  return crypto.timingSafeEqual(hash, stored.hash);
}
