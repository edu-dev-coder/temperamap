import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";

const KEY_LEN = 64;
const SALT_LEN = 16;
const SCRYPT_OPTS = { N: 16384, r: 8, p: 1, maxmem: 128 * 1024 * 1024 };

export async function hashPassword(password) {
  const salt = randomBytes(SALT_LEN);
  const key = await new Promise((resolve, reject) =>
    scrypt(password, salt, KEY_LEN, SCRYPT_OPTS, (err, derived) =>
      err ? reject(err) : resolve(derived),
    ),
  );
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

export async function verifyPassword(password, stored) {
  const [saltHex, keyHex] = stored.split(":");
  if (!saltHex || !keyHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expectedKey = Buffer.from(keyHex, "hex");
  const key = await new Promise((resolve, reject) =>
    scrypt(password, salt, KEY_LEN, SCRYPT_OPTS, (err, derived) =>
      err ? reject(err) : resolve(derived),
    ),
  );
  return timingSafeEqual(key, expectedKey);
}
