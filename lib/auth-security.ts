import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const DEFAULT_SCRYPT_N = 16384;
const DEFAULT_SCRYPT_R = 8;
const DEFAULT_SCRYPT_P = 1;
const KEY_LENGTH = 64;

function toBase64Buffer(value: Buffer) {
  return value.toString('base64');
}

function fromBase64(value: string) {
  return Buffer.from(value, 'base64');
}

function legacySha256Hash(password: string) {
  return createHash('sha256').update(password).digest('hex');
}

export function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, KEY_LENGTH, {
    N: DEFAULT_SCRYPT_N,
    r: DEFAULT_SCRYPT_R,
    p: DEFAULT_SCRYPT_P
  });

  return `s2$${DEFAULT_SCRYPT_N}$${DEFAULT_SCRYPT_R}$${DEFAULT_SCRYPT_P}$${toBase64Buffer(salt)}$${toBase64Buffer(derived)}`;
}

function verifyScryptHash(password: string, storedHash: string) {
  const parts = storedHash.split('$');
  if (parts.length !== 6 || parts[0] !== 's2') {
    return false;
  }

  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = fromBase64(parts[4]);
  const expected = fromBase64(parts[5]);

  if (!N || !r || !p || !salt.length || !expected.length) {
    return false;
  }

  const computed = scryptSync(password, salt, expected.length, { N, r, p });
  return timingSafeEqual(expected, computed);
}

export function verifyPassword(password: string, storedHash: string) {
  if (!storedHash) {
    return false;
  }

  if (storedHash.startsWith('s2$')) {
    return verifyScryptHash(password, storedHash);
  }

  // Backward compatibility with existing SHA-256 rows.
  return legacySha256Hash(password) === storedHash;
}

export function needsPasswordRehash(storedHash: string) {
  return !storedHash.startsWith('s2$');
}
