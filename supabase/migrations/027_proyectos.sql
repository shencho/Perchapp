-- =============================================
-- 027_proyectos.sql
-- Proyectos/viajes COLABORATIVOS (Splitwise multiusuario).
-- Ledger compartido separado de los movimientos personales (privacidad).
-- Primer caso N-usuarios. Correr manualmente en Supabase SQL Editor (después de 026).
-- =============================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Tablas
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.proyectos (
  id             uuid primary key default gen_random_uuid(),
  created_by     uuid not null references public.profiles(id) on delete cascade,
  nombre         text not null,
  tipo           text not null default 'grupo' check (tipo in ('evento','viaje','proyecto','grupo')),
  fecha_inicio   date,
  fecha_fin      date,
  moneda_default text not null default 'ARS',
  grupo_origen_id uuid references public.grupos(id) on delete set null,
  archivado      boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.proyecto_miembros (
  id          uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  usuario_id  uuid references public.profiles(id) on delete cascade,   -- miembro-usuario conectado
  persona_id  uuid references public.personas(id) on delete set null,  -- no-usuario (solo nombre)
  nombre      text not null,
  rol         text not null default 'miembro' check (rol in ('owner','miembro')),
  created_at  timestamptz not null default now(),
  constraint miembro_identidad check (usuario_id is not null or persona_id is not null)
);
create unique index if not exists proy_miembro_usuario_uq
  on public.proyecto_miembros (proyecto_id, usuario_id) where usuario_id is not null;
create index if not exists proy_miembro_usuario_idx
  on public.proyecto_miembros (usuario_id) where usuario_id is not null;

create table if not exists public.proyecto_gastos (
  id          uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  creado_por  uuid not null references public.profiles(id) on delete cascade,
  concepto    text,
  monto_total numeric(12,2) not null check (monto_total > 0),
  moneda      text not null default 'ARS',
  fecha       date not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists proy_gastos_proyecto_idx on public.proyecto_gastos (proyecto_id);

create table if not exists public.proyecto_gasto_pagadores (
  id           uuid primary key default gen_random_uuid(),
  gasto_id     uuid not null references public.proyecto_gastos(id) on delete cascade,
  miembro_id   uuid not null references public.proyecto_miembros(id) on delete cascade,
  monto_pagado numeric(12,2) not null
);
create index if not exists proy_pag_gasto_idx on public.proyecto_gasto_pagadores (gasto_id);

create table if not exists public.proyecto_gasto_splits (
  id              uuid primary key default gen_random_uuid(),
  gasto_id        uuid not null references public.proyecto_gastos(id) on delete cascade,
  miembro_id      uuid not null references public.proyecto_miembros(id) on delete cascade,
  monto_consumido numeric(12,2) not null,
  modo            text not null default 'a_repartir' check (modo in ('fijo','a_repartir'))
);
create index if not exists proy_split_gasto_idx on public.proyecto_gasto_splits (gasto_id);

-- FK diferida de deudas (026) al proyecto
alter table public.deudas_compartidas
  drop constraint if exists deudas_proyecto_fk;
alter table public.deudas_compartidas
  add constraint deudas_proyecto_fk foreign key (proyecto_id)
  references public.proyectos(id) on delete set null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Helper anti-recursión (una policy de proyecto_miembros que hace EXISTS sobre
--    proyecto_miembros se auto-referenciaría → recursión). SECURITY DEFINER lo corta.
-- ─────────────────────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RLS multiusuario
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.proyectos               enable row level security;
alter table public.proyecto_miembros       enable row level security;
alter table public.proyecto_gastos         enable row level security;
alter table public.proyecto_gasto_pagadores enable row level security;
alter table public.proyecto_gasto_splits   enable row level security;

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

-- miembros (SELECT vía helper definer, WRITE solo owner del proyecto)
drop policy if exists "miembro_select" on public.proyecto_miembros;
create policy "miembro_select" on public.proyecto_miembros for select
  using (public.puede_ver_proyecto(proyecto_id));
drop policy if exists "miembro_write_owner" on public.proyecto_miembros;
create policy "miembro_write_owner" on public.proyecto_miembros for all
  using      (exists (select 1 from public.proyectos p where p.id = proyecto_id and p.created_by = auth.uid()))
  with check (exists (select 1 from public.proyectos p where p.id = proyecto_id and p.created_by = auth.uid()));

-- gastos: cualquier miembro ve todo; escribe solo el creador del gasto
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

-- splits / pagadores: SELECT si sos miembro del proyecto del gasto; WRITE si sos su creador
drop policy if exists "split_select" on public.proyecto_gasto_splits;
create policy "split_select" on public.proyecto_gasto_splits for select
  using (exists (select 1 from public.proyecto_gastos g
                 where g.id = gasto_id and public.puede_ver_proyecto(g.proyecto_id)));
drop policy if exists "split_write_creador" on public.proyecto_gasto_splits;
create policy "split_write_creador" on public.proyecto_gasto_splits for all
  using      (exists (select 1 from public.proyecto_gastos g where g.id = gasto_id and g.creado_por = auth.uid()))
  with check (exists (select 1 from public.proyecto_gastos g where g.id = gasto_id and g.creado_por = auth.uid()));

drop policy if exists "pag_select" on public.proyecto_gasto_pagadores;
create policy "pag_select" on public.proyecto_gasto_pagadores for select
  using (exists (select 1 from public.proyecto_gastos g
                 where g.id = gasto_id and public.puede_ver_proyecto(g.proyecto_id)));
drop policy if exists "pag_write_creador" on public.proyecto_gasto_pagadores;
create policy "pag_write_creador" on public.proyecto_gasto_pagadores for all
  using      (exists (select 1 from public.proyecto_gastos g where g.id = gasto_id and g.creado_por = auth.uid()))
  with check (exists (select 1 from public.proyecto_gastos g where g.id = gasto_id and g.creado_por = auth.uid()));

drop trigger if exists proyectos_updated_at on public.proyectos;
create trigger proyectos_updated_at before update on public.proyectos
  for each row execute function public.handle_updated_at();
drop trigger if exists proyecto_gastos_updated_at on public.proyecto_gastos;
create trigger proyecto_gastos_updated_at before update on public.proyecto_gastos
  for each row execute function public.handle_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Notificaciones (SECURITY DEFINER)
-- ─────────────────────────────────────────────────────────────────────────────
-- Te agregan a un proyecto (usuario distinto del creador)
create or replace function public.notificar_miembro_proyecto()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_nombre text; v_owner uuid;
begin
  if new.usuario_id is null then return new; end if;
  select nombre, created_by into v_nombre, v_owner from public.proyectos where id = new.proyecto_id;
  if new.usuario_id <> v_owner then
    insert into public.notificaciones (user_id, tipo, titulo, cuerpo, ref_id)
    values (new.usuario_id, 'proyecto_agregado',
            'Te sumaron a "' || coalesce(v_nombre,'un proyecto') || '"', null, new.proyecto_id);
  end if;
  return new;
end $$;
drop trigger if exists proy_miembro_notif on public.proyecto_miembros;
create trigger proy_miembro_notif after insert on public.proyecto_miembros
  for each row execute function public.notificar_miembro_proyecto();

-- Te cargan un gasto en un proyecto (1 notif por gasto a miembros-usuario != creador)
create or replace function public.notificar_gasto_proyecto()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_nombre text; m record;
begin
  select nombre into v_nombre from public.proyectos where id = new.proyecto_id;
  for m in
    select distinct usuario_id from public.proyecto_miembros
    where proyecto_id = new.proyecto_id and usuario_id is not null and usuario_id <> new.creado_por
  loop
    insert into public.notificaciones (user_id, tipo, titulo, cuerpo, ref_id)
    values (m.usuario_id, 'proyecto_gasto_nuevo',
            'Nuevo gasto en "' || coalesce(v_nombre,'proyecto') || '"',
            coalesce(new.concepto,''), new.proyecto_id);
  end loop;
  return new;
end $$;
drop trigger if exists proy_gasto_notif on public.proyecto_gastos;
create trigger proy_gasto_notif after insert on public.proyecto_gastos
  for each row execute function public.notificar_gasto_proyecto();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RPC crear_deuda_proyecto: materializa una transferencia del balance como deuda
--    bilateral (origen='proyecto'). SECURITY DEFINER, acotada: caller miembro,
--    deudor y acreedor miembros-usuario, conexión aceptada, anti-duplicado por par vivo.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.crear_deuda_proyecto(
  p_proyecto_id uuid,
  p_deudor_id   uuid,
  p_acreedor_id uuid,
  p_monto       numeric,
  p_moneda      text,
  p_concepto    text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_conex uuid; v_ac_nombre text; v_de_nombre text; v_id uuid;
begin
  if not public.puede_ver_proyecto(p_proyecto_id) then
    raise exception 'No sos miembro del proyecto';
  end if;
  if p_deudor_id = p_acreedor_id then raise exception 'Deudor y acreedor iguales'; end if;
  if p_monto is null or p_monto <= 0 then raise exception 'Monto inválido'; end if;

  -- Ambos deben ser miembros-usuario del proyecto
  if not exists (select 1 from public.proyecto_miembros where proyecto_id=p_proyecto_id and usuario_id=p_deudor_id)
     or not exists (select 1 from public.proyecto_miembros where proyecto_id=p_proyecto_id and usuario_id=p_acreedor_id) then
    raise exception 'Deudor y acreedor deben ser miembros-usuario';
  end if;

  -- Debe existir conexión aceptada entre ambos
  select id into v_conex from public.conexiones
    where estado='aceptada'
      and ((solicitante_id=p_deudor_id and receptor_id=p_acreedor_id)
        or (receptor_id=p_deudor_id and solicitante_id=p_acreedor_id))
    limit 1;
  if v_conex is null then raise exception 'No hay conexión aceptada entre las partes'; end if;

  -- Anti-duplicado: no crear si ya hay una deuda viva de este proyecto para el par/moneda
  if exists (
    select 1 from public.deudas_compartidas
    where origen='proyecto' and proyecto_id=p_proyecto_id
      and deudor_id=p_deudor_id and acreedor_id=p_acreedor_id and moneda=p_moneda
      and estado in ('pendiente','pago_marcado','confirmada')
  ) then
    return null;
  end if;

  select nombre into v_ac_nombre from public.profiles where id=p_acreedor_id;
  select nombre into v_de_nombre from public.profiles where id=p_deudor_id;

  insert into public.deudas_compartidas
    (acreedor_id, deudor_id, acreedor_nombre, deudor_nombre, conexion_id,
     monto, moneda, concepto, proyecto_id, origen, estado)
  values
    (p_acreedor_id, p_deudor_id, v_ac_nombre, v_de_nombre, v_conex,
     p_monto, p_moneda, p_concepto, p_proyecto_id, 'proyecto', 'pendiente')
  returning id into v_id;

  return v_id;
end $$;

revoke all on function public.crear_deuda_proyecto(uuid,uuid,uuid,numeric,text,text) from public, anon;
grant execute on function public.crear_deuda_proyecto(uuid,uuid,uuid,numeric,text,text) to authenticated;
