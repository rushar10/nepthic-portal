# Nepthic Admin Portal

`admin.nepthic.com` is the one place Nepthic staff manage Clothing, Wholesale and Events. It is a separate app with its own deployment, database and accounts. Customers never see it, and the customer sites carry no link to it or code for it.

## What's in it

- **Sign-in with 2FA.** Email and password, then a code from an authenticator app (TOTP). It's required for every account.
  - There is no sign-up. A Super Admin creates accounts with a temporary password, and each person sets up 2FA and chooses their own password at first sign-in.
  - 5 wrong attempts lock the account for 15 minutes.
  - Sessions end after 30 minutes idle.
- **Overview** of all three sites: revenue, orders, ticket sales and everything waiting on a decision. Each card links into that site's section.
- **Site switcher** (Overview · Clothing · Wholesale · Events). It shows only the sites you may manage, and each section takes on its site's accent colour.
- **Wholesale:**
  - dashboard and approvals
  - quotes & enquiries, bulk orders, products & stock (with the Clothing catalogue import)
  - business accounts and buyers
  - return approvals, pricing tiers
  - payments, and settings including deposit / full payment
- **Events:**
  - dashboard, events with ticket types & capacity, and attendees
  - refund approvals, check-in stats, customers
  - sales & payments, scanner staff, settings
  - **ticket templates**: design how tickets look (layout, colours, pattern, wording, which details show, fine print) with a live preview, then pick one per event or set a default
- **Clothing:** the section and its screens (products, inventory, orders, customers, discounts) are ready. It says "not connected" until the Clothing site adds the admin API ([../docs/admin-api.md](../docs/admin-api.md)).
- **Scanner** at `/scan`: the Events door app. It uses the camera, works offline with a sync queue, and gives sound and vibration feedback. Door staff can open only this page.
- **View live site** opens a customer site with an admin preview bar that only you see, with "Edit this product / event" shortcuts.
- **Admins & roles** (Super Admins only): create accounts, change roles and sites, reset passwords or 2FA, unlock, and remove access.
- **Audit log** (Super Admins only): every sign-in, account change and site action. Each entry records who, which site, when, the IP and the result.

## Roles

| Role | Can do |
|---|---|
| Super Admin | Everything on every site. Manages admins and sees the audit log. |
| Site Admin | Everything on their assigned site(s): approvals, refunds, payments, pricing, settings, events. |
| Staff | Day-to-day work on assigned sites: answer quotes, process orders, edit stock. No settings, payments, approvals or refunds. |
| Door / scanner staff | The Events scanner only. No portal screens. |

Roles are checked twice: by the portal before it calls a site, and again by the site on every request. These sensitive actions need the 2FA code again, which then counts for 5 minutes:

- refunds
- payment terms and the payment mode
- cancelling orders or events
- account changes

## How it reaches the sites

The portal holds an Ed25519 private key, and each site holds the matching public key. Every call to a site is a `POST /api/ops/v1/<operation>` carrying a fresh token: 60-second lifetime, single use, aimed at that one site, with the admin's role.

A site answers 404 to anything else. If a site doesn't answer within 4 seconds, its section shows "unavailable" and the others carry on. The details are in [../docs/admin-api.md](../docs/admin-api.md).

## Run locally

```sh
cp .env.example .env
npm run keys                      # paste PORTAL_PRIVATE_KEY + PORTAL_ENCRYPTION_KEY here,
                                  # and PORTAL_PUBLIC_KEY into wholesale/.env and events/.env
createdb nepthic_portal
npm ci
npm run db:migrate
npm run db:seed-dev               # one account per role, password demo-password-123
npm run build && npm start        # http://localhost:3003  (Wholesale :3001, Events :3002)
```

The dev accounts are:

- `owner@nepthic.com` (Super Admin)
- `wholesale-admin@nepthic.com`
- `events-admin@nepthic.com`
- `staff@nepthic.com`
- `door@nepthic.com`
- `new-admin@nepthic.com`, who has no 2FA yet, to try the setup flow

Their 2FA secrets are in `.dev-accounts.json`; add one to an authenticator app to sign in by hand.

**Production:**
1. Run `npm run admin:create -- "Your Name" you@nepthic.com` to create the first Super Admin. It prints a temporary password.
2. Work through [../docs/security-checklist.md](../docs/security-checklist.md).

## Scripts

| Command | What it does |
|---|---|
| `npm run build` / `npm start` | Production build and server (port 3003) |
| `npm run keys` | New signing key pair and encryption key |
| `npm run admin:create -- "Name" email` | First Super Admin (prints a temporary password, shown once) |
| `npm run db:seed-dev` | Development accounts for every role (refuses in production) |
| `npm test` | Unit tests: 2FA codes, roles, IP allowlist, form parsing |
| `npm run typecheck` | TypeScript |

The end-to-end and security checks are in `../checks/` (`portal-e2e.py`, `security.py`, `independence.py`).

## Environment

See `.env.example`. The important ones:

- **`PORTAL_PRIVATE_KEY`**: the portal only. Never put it on a site.
- **`PORTAL_ENCRYPTION_KEY`**: encrypts 2FA secrets.
- **`PORTAL_IDLE_MINUTES`**: idle timeout, 30 by default.
- **`PORTAL_IP_ALLOWLIST`**: optional. Other IPs get a 404.
- **`*_URL`, `*_API_URL`**: each site's address, and the address of its admin API. An empty `CLOTHING_API_URL` means "not connected".

## Layout

```
app/login/          sign-in, 2FA setup/verify, first password
app/(portal)/       overview, clothing/, wholesale/, events/, admins/, audit/, account/
app/scan/           door scanner (Door staff land here)
app/go/[site]       "View live site" (signed one-time preview hand-off)
app/files/…         site images for the portal (return photos, galleries)
app/actions.ts      one server action for every site action (role → 2FA if sensitive → call → audit)
core/               auth & sessions, TOTP, roles, signed site client, audit, admins
db/                 admins, sessions, login attempts, audit log (no customer data)
```
