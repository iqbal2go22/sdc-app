# SiteOne — Supplier Data Collection (SDC)

Web app for collecting supply-chain data (UOM quantities, dimensions, weights, freight class, barcodes, etc.) from ~3,000 SiteOne suppliers across ~36,000 items, with PIM-friendly export and admin reporting on activity, completion, and time spent.

Built per the decision log in `../.claude-memory/sdc-requirements.md` (D1–D26).

## Stack

- **Next.js 16** App Router + **TypeScript strict** + **Tailwind CSS 4**
- **Prisma 7** with `@prisma/adapter-pg` against PostgreSQL
- **Zod** at every API boundary
- **Argon2** (`@node-rs/argon2`) password hashing
- **TanStack Query** for server state on the client
- Hand-rolled session auth (HTTP-only cookies, sessions table) — no Lucia/Auth.js so we don't drag deprecated deps. Pluggable enough that Okta SSO can be added later (see FC1 in the requirements log).

## Local development

### Prerequisites
- Node.js 22.x
- A Postgres instance — either local or hosted (Neon / Supabase free tier works)

### Setup
```bash
# 1. Edit .env: set DATABASE_URL, AUTH_SECRET, NEXT_PUBLIC_APP_URL

# 2. Push schema to the database
npm run db:push

# 3. Seed: admin user + UOM master + 12 sample items + 1 sample supplier contact
npm run db:seed

# 4. Run the dev server
npm run dev
```

Open <http://localhost:3000>. Sign in as `admin@siteone.com` / `ChangeMe123!` (override via `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD` env vars before seeding).

To exercise the supplier flow:
1. As admin, go to `/admin/kickoff` → **Download Kickoff CSV**.
2. Open the CSV, find the row for `rep@richesseeds.example.com`, copy the `KickoffURL`.
3. Open that URL in an incognito window — you'll be auto-authenticated and prompted to set a password.
4. After setting a password, you land on the supplier item queue with 4 items (RICHES SEEDS).

## Deploying to Replit

The project includes `.replit` and `replit.nix`.

1. **Create a new Repl** by importing this GitHub repo (or upload as a zip).
2. **Add the Postgres database** via Replit's Database panel. `DATABASE_URL` will be auto-injected as a Replit Secret.
3. **Set Replit Secrets:**
   - `AUTH_SECRET` — generate with `openssl rand -hex 32` or any random 32+ char string
   - `NEXT_PUBLIC_APP_URL` — your Repl's public URL (e.g., `https://sdc-app.iqbal.repl.co`)
   - `ADMIN_SEED_EMAIL` — your admin email
   - `ADMIN_SEED_PASSWORD` — your admin password
4. **Run setup once** in the Replit shell:
   ```bash
   npm run db:push
   npm run db:seed
   ```
5. **Click Run.** The app builds with `next build` and starts with `next start`.

### After deploying
- Open `/login`, sign in as admin
- Go to `/admin/uploads` and upload your real `UOM master`, `items` (long format), and `contacts` files
- Go to `/admin/kickoff` and download the CSV; mail-merge it through your sender tool
- Vendors click the link → set passwords → fill in items
- When complete, `/admin/export` downloads the PIM-ready long CSV

## File formats

### Items (long format — D18)
One row per (item × UOM). Item-level columns repeat across an SKU's UOM rows.

```
VendorID,VendorName,SKUID,PIMItemNumber,ProductName,BrandName,TaxonomyClassPath,MFGPartNumber,ImageURL,UOMCode
RICHES_SEEDS,RICHES SEEDS,111197,20-11-250,LESCO Tall Fescue ...,LESCO,Agronomic ...,20-11-250,https://...,EA
RICHES_SEEDS,RICHES SEEDS,111197,20-11-250,LESCO Tall Fescue ...,LESCO,Agronomic ...,20-11-250,https://...,CS
RICHES_SEEDS,RICHES SEEDS,111197,20-11-250,LESCO Tall Fescue ...,LESCO,Agronomic ...,20-11-250,https://...,PL
```

### Contacts
```
VendorID,ContactName,ContactEmail
RICHES_SEEDS,Sample Rep,rep@richesseeds.example.com
```

### UOM master
```
UOMCode,UOMName,DefaultEDIUOM
EA,Each,EA
CS,Case,CS
PL,Pallet,PL
```

CSV or XLSX — both supported.

## Architectural notes

These are the load-bearing decisions from the requirements log that shape how the code is organized — touch them before refactoring.

- **All DB access goes through `@/lib/prisma` only.** No raw SQL outside the data layer. This is what makes a future move off Replit Postgres a `pg_dump` + `pg_restore` (D23, FC10).
- **Identity is split from credentials.** `User` table is the identity; `PasswordCredential` is a separate row. SSO users (FC1) can have an identity without a credential row, and migration to Okta is additive.
- **Sessions are uniform regardless of auth method.** Same cookie, same session table whether the user authenticated by password or by kickoff token.
- **Zod schemas are validated at every API boundary.** Same schemas can be reused on the client for form validation.
- **Validation rules in `@/lib/validation` are config-shaped.** Today they're TS code; the schema includes a `field_rules` table reserved for FC9 (admin UI for editing rules).
- **Smart-merge upserts everywhere** for re-uploads (D10). Re-uploading the items file does not erase vendor-entered data; mid-campaign UOM removals soft-delete `item_uom` rows so vendor work isn't silently lost.
- **Wipes are explicit and type-to-confirm gated** (D11/D12). Available only via `/admin/wipe`.
- **Audit log is coarse-grained** (D20). No field-level edits, no draft-save events. Heartbeat-driven time-on-app via Page Visibility API.
- **PIM export is one canonical long CSV** (D15) including a `Source` column distinguishing file-prescribed UOMs from supplier-added ones (D19).

## What's deliberately deferred

These are reserved spots in the architecture (schema columns, abstractions) but not implemented for the POC:

- **Okta SSO for admins** (FC1) — auth abstraction makes this slot-in
- **Admin MFA** (FC2)
- **Soft-delete recovery for wipes** (FC6) — `wipedAt` columns exist but POC hard-deletes
- **In-app SMTP send** (FC7) — POC uses external mail merge via CSV download
- **Field-level audit log** (FC8) — `field_audit_log` table reserved
- **Admin UI for editing validation rules** (FC9)
- **Migration off Replit Postgres** (FC10)
- **Test suite** — CLAUDE.md mandates tests for production; flag as tech debt for v2

## Security defaults (D6)

- Argon2id password hashing (OWASP 2024 params)
- 8-char minimum, no forced rotation, breach-list check
- 5 failed attempts → 15-minute lockout
- 8-hour session length (workday)
- Session cookies HTTP-only, `SameSite=Lax`, `Secure` in production
- Email-enumeration safe: forgot-password and login both return identical generic responses regardless of whether the email is on the allowlist

## Brand

Tailwind theme variables mirror SiteOne's official palette (D-locked from Convo.txt):
- `--siteone-green: #57810E`
- `--siteone-gray: #414244`
- `--siteone-safety: #DAE343`
- Plus blue, dark blue, green-gray, warm-gray accents.

The supplier UI is a React port of `siteone-sdc-branded.html` — same layout (top progress bar, full-width identifier card, horizontal UOM cards, three sections per card, live calc bar) but with real data, real validation, real persistence.
