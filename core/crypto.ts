import crypto from "node:crypto";
import { env } from "./env";

/* AES-256-GCM for 2FA secrets at rest. Format: v1.<iv>.<tag>.<ciphertext> (base64url). */
const key = () => {
  const k = Buffer.from(env.encryptionKey || "dev-only-not-secret-dev-only-not!", env.encryptionKey ? "base64" : "utf8");
  if (k.length !== 32) throw new Error("PORTAL_ENCRYPTION_KEY must be 32 bytes, base64 encoded (npm run keys).");
  return k;
};

export function encrypt(plain: string) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv, c.getAuthTag(), data].map((x) => (typeof x === "string" ? x : x.toString("base64url"))).join(".");
}

export function decrypt(box: string) {
  const [v, iv, tag, data] = box.split(".");
  if (v !== "v1") throw new Error("Unknown secret format");
  const d = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(data, "base64url")), d.final()]).toString("utf8");
}

export const sha256 = (v: string) => crypto.createHash("sha256").update(v).digest("hex");
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString("base64url");
