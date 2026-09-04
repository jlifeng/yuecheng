# Database Guidelines

> Database patterns and conventions for this project (Supabase / PostgreSQL).

---

## Overview

- Backend for the mini-program is **Supabase** (Postgres + REST + Edge Functions). The mini-program talks to Supabase REST directly (`/rest/v1/<table>`); no Nest app is in the hot path for the V1 fulfillment flow.
- A `yuecheng-api` (Nest) project exists but most modules are **in-memory stubs** (order timeline, invoice, incident) and are NOT wired into the mini-program. Do not assume Nest is the source of truth — Supabase tables are.
- Settlement is **offline only**: the platform is an information broker. Persist fees for the record (`order_fees`) but never wire payment.

## Migrations

- Location: `supabase/migrations/<YYYYMMDD>_<slug>.sql`.
- **Migrations MUST be idempotent / re-runnable.** Use:
  - `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`
  - `CREATE TABLE IF NOT EXISTS ...`
  - `CREATE INDEX IF NOT EXISTS ...`
  - Wrap constraint addition in `DO $$ ... IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = ...) THEN ... END $$;`
  - Add value `CHECK` constraints with `DO $$` guards when they may already hold conflicting data, or only add after backfill.
- Include a **history backfill** block when introducing a status enum that existing rows must map into (e.g. coarse `demands.status` → new `fulfillment_status`).
- **RLS is NOT added by the migration.** If RLS is enabled on the project, every new table/column the client reads or writes needs an explicit policy, otherwise the client gets 401/403. Treat missing policies as a release blocker — do not leave it implicit.

## Naming Conventions

- Tables: `snake_case`, plural (`demands`, `bids`, `order_events`, `order_fees`, `drivers`, `vehicles`).
- Columns: `snake_case` (`passenger_id`, `fulfillment_status`, `created_at`).
- Timestamps: `<event>_at TIMESTAMPTZ DEFAULT NOW()`; FKs `<entity>_id`; booleans avoided in favor of status strings.
- Indexes: `idx_<table>_<cols>`.
- Client-facing TS types use camelCase (`orderFee.totalAmount`), mapped from snake_case rows at the service layer.

## Schema Patterns

- **Audit / event log**: separate append-only table keyed by the parent id (`order_events(demand_id, event_type, actor_id, note, created_at)`). Index `(demand_id, created_at)`. Write one row per state transition. Don't overload the parent row with status history.
- **One-row-per-parent record**: `order_fees` has `UNIQUE(demand_id)` so upsert (`Prefer: resolution=merge-duplicates`) is the natural write.
- FK with `ON DELETE SET NULL` for soft references (assignment), `ON DELETE CASCADE` for owned children (events, fees).

## Query Patterns (Supabase REST)

- Always send `apikey` + `Authorization: Bearer <accessToken>`.
- GET: use `?select=...` projection and `?col=eq.val` filters; join related tables via `&select=*,drivers(*)` syntax when possible to avoid N+1.
- PATCH: set `Prefer: return=minimal` for fire-and-forget; `return=representation` when the caller needs the updated row.
- UPSERT: `Prefer: resolution=merge-duplicates` with a `PATCH`/`POST` on the unique key.
- Insert audit events right after the state PATCH; a failed event insert should NOT roll back the main write (log + continue), unless the event is the source of truth for the transition.

## Common Mistakes

- Forgetting RLS policies on a new table → client 401/403 in production even though dev (no RLS) works.
- Adding a `CHECK` constraint before backfilling legacy rows → migration fails on existing data.
- Treating `demands.status` (coarse) and a fine-grained status as the same field — they are two layers; see [[fulfillment-state-machine]].
- Calling a Nest stub endpoint from the mini-program assuming it persists — it does not.
