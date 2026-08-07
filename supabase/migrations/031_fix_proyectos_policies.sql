-- =============================================
-- 031_fix_proyectos_policies.sql
-- FIX: la 027 quedó a medias (el `alter table deudas_compartidas ... FK`
-- cortaba la ejecución antes de crear las policies → proyectos con RLS activada
-- pero sin `proy_insert` → todo INSERT viola RLS al crear un viaje).
-- Este script es AUTOCONTENIDO e IDEMPOTENTE: recrea función + RLS + grants +
-- todas las policies de la familia proyectos, SIN depender de deudas_compartidas.
-- Correr en Supabase SQL Editor.
-- =============================================

-- Helper anti-recursión (por si no se creó)
create or replace function public.puede_ver_proyecto(p_proyecto_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.proyectos p
    where p.id = p_proyecto_id and p.created_by = auth.uid()
  ) or exists (
    select 1 from public.proyecto_miembros m
    where m.proyecto_id = p_proyecto_id and m.usuario_id = auth.uid()
  );
$$;
revoke all on function public.puede_ver_proyecto(uuid) from public, anon;
grant execute on function public.puede_ver_proyecto(uuid) to authenticated;

-- RLS on
alter table public.proyectos               enable row level security;
alter table public.proyecto_miembros       enable row level security;
alter table public.proyecto_gastos         enable row level security;
alter table public.proyecto_gasto_pagadores enable row level security;
alter table public.proyecto_gasto_splits   enable row level security;

-- Grants (por si las tablas quedaron sin permisos para authenticated)
grant select, insert, update, delete on
  public.proyectos, public.proyecto_miembros, public.proyecto_gastos,
  public.proyecto_gasto_pagadores, public.proyecto_gasto_splits
  to authenticated;

-- proyectos
drop policy if exists "proy_select" on public.proyectos;
create policy "proy_select" on public.proyectos for select
  using (public.puede_ver_proyecto(id));
drop policy if exists "proy_insert" on public.proyectos;
create policy "proy_insert" on public.proyectos for insert
  with check (created_by = auth.uid());
drop policy if exists "proy_update_owner" on public.proyectos;
create policy "proy_update_owner" on public.proyectos for update
  using (created_by = auth.uid()) with check (created_by = auth.uid());
drop policy if exists "proy_delete_owner" on public.proyectos;
create policy "proy_delete_owner" on public.proyectos for delete
  using (created_by = auth.uid());

-- miembros
drop policy if exists "miembro_select" on public.proyecto_miembros;
create policy "miembro_select" on public.proyecto_miembros for select
  using (public.puede_ver_proyecto(proyecto_id));
drop policy if exists "miembro_write_owner" on public.proyecto_miembros;
create policy "miembro_write_owner" on public.proyecto_miembros for all
  using      (exists (select 1 from public.proyectos p where p.id = proyecto_id and p.created_by = auth.uid()))
  with check (exists (select 1 from public.proyectos p where p.id = proyecto_id and p.created_by = auth.uid()));

-- gastos
drop policy if exists "pg_select" on public.proyecto_gastos;
create policy "pg_select" on public.proyecto_gastos for select
  using (public.puede_ver_proyecto(proyecto_id));
drop policy if exists "pg_insert" on public.proyecto_gastos;
create policy "pg_insert" on public.proyecto_gastos for insert
  with check (public.puede_ver_proyecto(proyecto_id) and creado_por = auth.uid());
drop policy if exists "pg_update_creador" on public.proyecto_gastos;
create policy "pg_update_creador" on public.proyecto_gastos for update
  using (creado_por = auth.uid()) with check (creado_por = auth.uid());
drop policy if exists "pg_delete_creador" on public.proyecto_gastos;
create policy "pg_delete_creador" on public.proyecto_gastos for delete
  using (creado_por = auth.uid());

-- splits
drop policy if exists "split_select" on public.proyecto_gasto_splits;
create policy "split_select" on public.proyecto_gasto_splits for select
  using (exists (select 1 from public.proyecto_gastos g
                 where g.id = gasto_id and public.puede_ver_proyecto(g.proyecto_id)));
drop policy if exists "split_write_creador" on public.proyecto_gasto_splits;
create policy "split_write_creador" on public.proyecto_gasto_splits for all
  using      (exists (select 1 from public.proyecto_gastos g where g.id = gasto_id and g.creado_por = auth.uid()))
  with check (exists (select 1 from public.proyecto_gastos g where g.id = gasto_id and g.creado_por = auth.uid()));

-- pagadores
drop policy if exists "pag_select" on public.proyecto_gasto_pagadores;
create policy "pag_select" on public.proyecto_gasto_pagadores for select
  using (exists (select 1 from public.proyecto_gastos g
                 where g.id = gasto_id and public.puede_ver_proyecto(g.proyecto_id)));
drop policy if exists "pag_write_creador" on public.proyecto_gasto_pagadores;
create policy "pag_write_creador" on public.proyecto_gasto_pagadores for all
  using      (exists (select 1 from public.proyecto_gastos g where g.id = gasto_id and g.creado_por = auth.uid()))
  with check (exists (select 1 from public.proyecto_gastos g where g.id = gasto_id and g.creado_por = auth.uid()));
