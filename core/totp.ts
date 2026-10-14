import crypto from "node:crypto";

/* Time-based one-time passwords (RFC 6238): 6 digits, 30-second steps, SHA-1, which is what
   Google Authenticator, 1Password, Authy and Microsoft Authenticator all use. */

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function newSecret() {
  const bytes = crypto.randomBytes(20);
  let bits = "", out = "";
  for (const b of bytes) bits += b.toString(2).padStart(8, "0");
  for (let i = 0; i + 5 <= bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}

function decode(secret: string) {
  const clean = secret.replace(/=+$/, "").toUpperCase().replace(/\s/g, "");
  let bits = "";
  for (const c of clean) {
    const v = B32.indexOf(c);
    if (v < 0) throw new Error("Bad secret");
    bits += v.toString(2).padStart(5, "0");
  }
  const out = Buffer.alloc(Math.floor(bits.length / 8));
  for (let i = 0; i < out.length; i++) out[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  return out;
}

export const stepNow = (t = Date.now()) => Math.floor(t / 30000);

export function codeAt(secret: string, step: number) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(step));
  const h = crypto.createHmac("sha1", decode(secret)).update(msg).digest();
  const o = h[h.length - 1] & 0xf;
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1_000_000).padStart(6, "0");
}

/** Checks a code against the current step ±1 (clock drift). Returns the matching step, or null.
    Steps at or before `lastStep` are refused, so each code works only once. */
export function verifyCode(secret: string, code: string, lastStep = 0, t = Date.now()): number | null {
  const c = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(c)) return null;
  const now = stepNow(t);
  for (const s of [now, now - 1, now + 1]) {
    if (s <= lastStep) continue;
    const a = Buffer.from(codeAt(secret, s)), b = Buffer.from(c);
    if (crypto.timingSafeEqual(a, b)) return s;
  }
  return null;
}

export const otpauthUri = (secret: string, email: string) =>
  `otpauth://totp/${encodeURIComponent(`Nepthic Admin:${email}`)}?secret=${secret}&issuer=${encodeURIComponent("Nepthic Admin")}&algorithm=SHA1&digits=6&period=30`;
