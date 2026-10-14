import { test } from "node:test";
import assert from "node:assert/strict";
import { codeAt, newSecret, verifyCode } from "../core/totp";
import { accessFor, allowed, can, portalSites } from "../core/perms";
import { ipAllowed } from "../core/ip";
import { formToInput } from "../core/actions-meta";

test("TOTP matches the RFC 6238 test vector (SHA-1)", () => {
  // secret "12345678901234567890" in base32; at T=59s the 8-digit code is 94287082 → 6 digits 287082
  const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
  assert.equal(codeAt(secret, Math.floor(59 / 30)), "287082");
  assert.equal(codeAt(secret, Math.floor(1111111109 / 30)), "081804");
});

test("a code works once, within one step either way", () => {
  const s = newSecret();
  const t = Date.now();
  const step = Math.floor(t / 30000);
  const code = codeAt(s, step);
  assert.equal(verifyCode(s, code, 0, t), step);
  assert.equal(verifyCode(s, code, step, t), null, "same step can't be reused");
  assert.equal(verifyCode(s, codeAt(s, step - 1), 0, t), step - 1, "previous step accepted (clock drift)");
  assert.equal(verifyCode(s, codeAt(s, step - 3), 0, t), null, "old codes refused");
  assert.equal(verifyCode(s, "12345", 0, t), null);
});

test("roles map to the right access per site", () => {
  assert.equal(accessFor({ role: "SUPER", sites: [] }, "clothing"), "manage");
  assert.equal(accessFor({ role: "SITE_ADMIN", sites: ["events"] }, "events"), "manage");
  assert.equal(accessFor({ role: "SITE_ADMIN", sites: ["events"] }, "wholesale"), "none");
  assert.equal(accessFor({ role: "STAFF", sites: ["wholesale"] }, "wholesale"), "operate");
  assert.equal(accessFor({ role: "DOOR", sites: ["events"] }, "events"), "door");
  assert.equal(accessFor({ role: "DOOR", sites: ["wholesale"] }, "wholesale"), "none");
  assert.ok(!allowed("operate", "manage"));
  assert.ok(allowed("operate", "door"));
  assert.ok(!allowed("door", "view"));
  assert.ok(!can({ role: "STAFF", sites: ["wholesale"] }, "wholesale", "manage"));
  assert.deepEqual(portalSites({ role: "STAFF", sites: ["events"] }, ["clothing", "wholesale", "events"]), ["events"]);
  assert.deepEqual(portalSites({ role: "DOOR", sites: ["events"] }, ["clothing", "wholesale", "events"]), [], "door staff get no portal sites");
});

test("IP allowlist: exact IPs and IPv4 ranges", () => {
  assert.ok(ipAllowed("1.2.3.4", []), "empty list = off");
  assert.ok(ipAllowed("203.0.113.9", ["203.0.113.0/24"]));
  assert.ok(!ipAllowed("203.0.114.9", ["203.0.113.0/24"]));
  assert.ok(ipAllowed("::ffff:10.0.0.5", ["10.0.0.0/8"]));
  assert.ok(ipAllowed("2001:db8::1", ["2001:db8::1"]));
  assert.ok(!ipAllowed("unknown", ["10.0.0.0/8"]));
});

test("form fields become nested input", () => {
  const fd = new FormData();
  fd.set("_a", "x"); fd.set("orderId", "o1"); fd.set("stock[v1]", "5"); fd.set("rows[0][min]", "24"); fd.set("rows[1][min]", "100");
  assert.deepEqual(formToInput(fd, (k) => k.startsWith("_")), { orderId: "o1", stock: { v1: "5" }, rows: [{ min: "24" }, { min: "100" }] });
});
