import crypto from "node:crypto";
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
/** A temporary password the person must change at first sign-in. Shown once, never stored in clear. */
export function tempPassword(len = 16) {
  return Array.from(crypto.randomBytes(len), (b) => ALPHABET[b % ALPHABET.length]).join("").replace(/(.{4})(?=.)/g, "$1-");
}
