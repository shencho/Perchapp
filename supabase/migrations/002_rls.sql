-- =============================================
-- 002_rls.sql — Row Level Security
-- Ejecutar DESPUÉS de 001_schema.sql
-- =============================================

-- Habilitar RLS en todas las tablas de usuario
alter table public.profiles           enable row level security;
alter table public.cuentas            enable row level security;
alter table public.tarjetas           enable row level security;
alter table public.categorias         enable row level security;
alter table public.clientes           enable row level security;
alter table public.servicios_cliente  enable row level security;
alter table public.tarifas_historial  enable row level security;
alter table public.registros_trabajo  enable row level security;
alter table public.pagos_cliente      enable row level security;
alter table public.movimientos        enable row level security;
alter table public.conversaciones_ia  enable row level security;
alter table public.feature_flags      enable row level security;
alter table public.profesiones_templates enable row level security;

-- ── profiles ──────────────────────────────────────────────────────────────────
create policy "profiles: owner full access"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── cuentas ───────────────────────────────────────────────────────────────────
create policy "cuentas: owner full access"
  on public.cuentas for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── tarjetas ──────────────────────────────────────────────────────────────────
create policy "tarjetas: owner full access"
  on public.tarjetas for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── categorias ────────────────────────────────────────────────────────────────
create policy "categorias: owner full access"
  on public.categorias for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── clientes ──────────────────────────────────────────────────────────────────
create policy "clientes: owner full access"
  on public.clientes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── servicios_cliente ─────────────────────────────────────────────────────────
create policy "servicios_cliente: owner full access"
  on public.servicios_cliente for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── tarifas_historial ─────────────────────────────────────────────────────────
create policy "tarifas_historial: owner full access"
  on public.tarifas_historial for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── registros_trabajo ─────────────────────────────────────────────────────────
create policy "registros_trabajo: owner full access"
  on public.registros_trabajo for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── pagos_cliente ─────────────────────────────────────────────────────────────
create policy "pagos_cliente: owner full access"
  on public.pagos_cliente for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── movimientos ───────────────────────────────────────────────────────────────
create policy "movimientos: owner full access"
  on public.movimientos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── conversaciones_ia ─────────────────────────────────────────────────────────
create policy "conversaciones_ia: owner full access"
  on public.conversaciones_ia for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── feature_flags ─────────────────────────────────────────────────────────────
create policy "feature_flags: owner full access"
  on public.feature_flags for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── profesiones_templates ─────────────────────────────────────────────────────
-- Solo lectura para usuarios autenticados; nadie puede escribir desde el cliente
create policy "profesiones_templates: authenticated read"
  on public.profesiones_templates for select
  using (auth.role() = 'authenticated');
