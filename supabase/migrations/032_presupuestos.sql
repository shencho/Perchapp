-- =============================================
-- 032_presupuestos.sql
-- Presupuestos por categoría y mes (YYYY-MM). Single-owner.
-- YA APLICADA en producción vía Supabase MCP (apply_migration).
-- =============================================

create table if not exists public.presupuestos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  categoria_id uuid not null references public.categorias(id) on delete cascade,
  anio_mes     text not null,                     -- 'YYYY-MM'
  moneda       text not null default 'ARS',
  monto        numeric(12,2) not null check (monto >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, categoria_id, anio_mes, moneda)
);

create index if not exists presupuestos_user_mes_idx on public.presupuestos (user_id, anio_mes);

alter table public.presupuestos enable row level security;

drop policy if exists "presupuestos_owner" on public.presupuestos;
create policy "presupuestos_owner" on public.presupuestos for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.presupuestos to authenticated;

drop trigger if exists presupuestos_updated_at on public.presupuestos;
create trigger presupuestos_updated_at before update on public.presupuestos
  for each row execute function public.handle_updated_at();
