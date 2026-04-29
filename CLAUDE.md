# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev       # dev server on http://localhost:3000
npm run build     # production build (also type-checks)
npm run lint      # ESLint
```

There are no automated tests. Verification is done manually against Supabase.

## Architecture

### Next.js 16 breaking changes
- **Middleware is now `proxy.ts`** (not `middleware.ts`). The export is `proxy`, not `middleware`. Don't create a `middleware.ts`.
- Read `node_modules/next/dist/docs/` before using any Next.js API — v16 has additional breaking changes from training data.

### Route structure
```
app/
  (auth)/          # Unauthenticated: login, signup — centered card layout, max-w-sm
  (app)/           # Authenticated: requires session + onboarding_completado = true
    dashboard/
  onboarding/      # After signup, before (app) — not inside either group
```

`(app)/layout.tsx` enforces auth + onboarding gate server-side via Supabase `getUser()`. Missing session → `/login`. Missing `onboarding_completado` → `/onboarding`.

### Supabase clients — two separate files, never mix them
- `lib/supabase/server.ts` — **async**, uses `await cookies()`. Use in Server Components, Server Actions, and Route Handlers.
- `lib/supabase/client.ts` — **sync**, uses `createBrowserClient`. Use only in `"use client"` components.

### Server Actions pattern
All DB mutations go in `lib/supabase/actions/`. Files use `"use server"` at the top. Call `createClient()` from `lib/supabase/server.ts` inside the action. Always call `supabase.auth.getUser()` first — RLS enforces `auth.uid() = user_id` on every user table, so unauthenticated writes silently fail.

### Database schema highlights
- All user tables have `user_id uuid` referencing `profiles(id)` with RLS policy `auth.uid() = user_id`.
- `profesiones_templates` is global (no `user_id`), readable by authenticated users, not writable from client.
- `profiles.modo` enum: `personal | profesional | ambos`.
- `cuentas.tipo` enum: `efectivo | banco | tarjeta | otro`.
- `categorias.tipo` enum: `ingreso | egreso` (no "ambos" at DB level).
- `movimientos.tipo` enum: `ingreso | egreso`.
- Numeric money columns use `numeric(12,2)`.
- Migrations live in `supabase/migrations/` and are run **manually** in Supabase SQL Editor — there is no CLI migration runner configured.

### Types
`types/supabase.ts` is maintained manually. When the schema changes, update this file too (or regenerate: `npx supabase gen types typescript --project-id voeyfiwlmhsdqdajwgrw > types/supabase.ts`). Row-level helper types (`Profile`, `Cuenta`, `Tarjeta`, etc.) are exported from the bottom of that file.

### Styling
- **Dark mode only** — `html` always has `dark` class; there is no light theme in V1.
- Tailwind v4 via `@import "tailwindcss"` in `globals.css` — no `tailwind.config.js`.
- shadcn/ui with `style: "base-nova"`. Add components with `npx shadcn add <component>`.
- Custom design tokens beyond shadcn defaults: `--surface`, `--surface-2`, `--success`, `--warning`, `--subtle`.
- `cn()` utility in `lib/utils.ts` (`clsx` + `tailwind-merge`).
- Path alias `@/` maps to the repo root.
