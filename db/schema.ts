/* Nepthic Admin Portal database. Holds only staff accounts, their sessions, login attempts
   and the audit log. No customer data lives here: customers belong to each site's own
   database and are read through that site's admin API when an admin opens a screen. */
import { randomUUID } from "node:crypto";
import { relations } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgEnum, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

const id = () => text("id").primaryKey().$defaultFn(() => randomUUID());
const ts = (name: string) => timestamp(name, { withTimezone: true });
const createdAt = () => ts("created_at").notNull().defaultNow();

/** SUPER: everything · SITE_ADMIN: everything on assigned sites · STAFF: day-to-day work on
    assigned sites · DOOR: the Events ticket scanner only (no portal screens). */
export const adminRole = pgEnum("admin_role", ["SUPER", "SITE_ADMIN", "STAFF", "DOOR", "PARTNER"]);
export type AdminRole = (typeof adminRole.enumValues)[number];

export const admins = pgTable("admins", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: adminRole("role").notNull(),
  /** Sites this account may manage: "clothing", "wholesale", "events". Ignored for SUPER. */
  sites: text("sites").array().notNull().default([]),
  /** PARTNER accounts only: the Events partner code they belong to (e.g. P012). */
  partnerCode: text("partner_code"),
  /** TOTP secret, AES-256-GCM encrypted with PORTAL_ENCRYPTION_KEY. */
  totpSecret: text("totp_secret"),
  totpConfirmedAt: ts("totp_confirmed_at"),
  /** Last accepted 30-second step, so a code can't be used twice. */
  totpLastStep: integer("totp_last_step").notNull().default(0),
  mustChangePassword: boolean("must_change_password").notNull().default(true),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: ts("locked_until"),
  disabledAt: ts("disabled_at"),
  lastLoginAt: ts("last_login_at"),
  createdById: text("created_by_id"),
  createdAt: createdAt(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // sha256 of the cookie value; the value itself is never stored
  adminId: text("admin_id").notNull().references(() => admins.id, { onDelete: "cascade" }),
  /** "password": password checked, waiting for the 2FA code (10 minutes). "active": signed in. */
  stage: text("stage").notNull(),
  createdAt: createdAt(),
  lastSeenAt: ts("last_seen_at").notNull().defaultNow(),
  expiresAt: ts("expires_at").notNull(),
  /** Last time the 2FA code was re-entered to confirm a sensitive action. */
  reauthAt: ts("reauth_at"),
  ip: text("ip"),
  userAgent: text("user_agent"),
}, (t) => [index("sessions_admin_idx").on(t.adminId)]);

export const loginAttempts = pgTable("login_attempts", {
  id: serial("id").primaryKey(),
  at: createdAt(),
  ip: text("ip").notNull(),
  email: text("email").notNull(),
  ok: boolean("ok").notNull(),
}, (t) => [index("login_attempts_ip_idx").on(t.ip, t.at), index("login_attempts_email_idx").on(t.email, t.at)]);

/** Every admin action: who, what, which site, when, and whether it worked. */
export const auditLog = pgTable("audit_log", {
  id: id(),
  at: createdAt(),
  adminId: text("admin_id"),
  adminEmail: text("admin_email").notNull(),
  site: text("site").notNull(), // "portal" | "clothing" | "wholesale" | "events"
  action: text("action").notNull(),
  target: text("target"),
  detail: jsonb("detail"),
  ip: text("ip"),
  outcome: text("outcome").notNull(), // "ok" | "denied" | "failed"
}, (t) => [index("audit_at_idx").on(t.at), index("audit_site_idx").on(t.site, t.at)]);

export const sessionsRelations = relations(sessions, ({ one }) => ({ admin: one(admins, { fields: [sessions.adminId], references: [admins.id] }) }));
export const adminsRelations = relations(admins, ({ many }) => ({ sessions: many(sessions) }));
