-- =============================================
-- 026_deudas_compartidas.sql
-- Deuda bilateral cross-user derivada de un gasto compartido.
-- Segundo caso cross-user (RLS bilateral por rol). Sigue el precedente de 024.
-- Correr manualmente en Supabase SQL Editor (después de 025).
-- =============================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Tabla deudas_compartidas
--    Snapshots de nombres (privacidad: no leer profiles ajeno).
--    `proyecto_id` se usa recién en 027 (FK agregada ahí).
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.deudas_compartidas (
  id                      uuid primary key default gen_random_uuid(),
  acreedor_id             uuid not null references public.profiles(id) on delete cascade,
  deudor_id               uuid not null references public.profiles(id) on delete cascade,
  acreedor_nombre         text,
  deudor_nombre           text,
  conexion_id             uuid references public.conexiones(id) on delete set null,
  monto                   numeric(12,2) not null check (monto > 0),
  moneda                  text not null default 'ARS',
  concepto                text,
  movimiento_origen_id    uuid,   -- gasto del acreedor (ref opaca; null si origen='proyecto')
  participante_id         uuid references public.gastos_compartidos_participantes(id) on delete set null,
  proyecto_id             uuid,   -- FK agregada en 027
  origen                  text not null default 'gasto' check (origen in ('gasto','proyecto')),
  estado                  text not null default 'pendiente'
                            check (estado in ('pendiente','pago_marcado','confirmada','rechazada')),
  deudor_cuenta_id        uuid,   -- opaca; elegida por el deudor al marcar "pagué"
  acreedor_cuenta_id      uuid,   -- opaca; elegida por el acreedor al confirmar
  mov_ingreso_acreedor_id uuid,
  mov_egreso_deudor_id    uuid,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  responded_at            timestamptz,
  constraint deudas_no_self check (acreedor_id <> deudor_id)
);

-- Clave natural: 1 deuda viva por (gasto, deudor). Evita duplicados en re-upsert.
create unique index if not exists deudas_gasto_uq
  on public.deudas_compartidas (movimiento_origen_id, deudor_id)
  where origen = 'gasto' and estado in ('pendiente','pago_marcado','confirmada');

create index if not exists deudas_deudor_idx
  on public.deudas_compartidas (deudor_id) where estado in ('pendiente','pago_marcado');
create index if not exists deudas_acreedor_idx
  on public.deudas_compartidas (acreedor_id) where estado in ('pendiente','pago_marcado');

alter table public.deudas_compartidas enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RLS bilateral por rol
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "deudas_select_involucrados" on public.deudas_compartidas;
create policy "deudas_select_involucrados" on public.deudas_compartidas for select
  using (auth.uid() = acreedor_id or auth.uid() = deudor_id);

drop policy if exists "deudas_insert_acreedor" on public.deudas_compartidas;
create policy "deudas_insert_acreedor" on public.deudas_compartidas for insert
  with check (auth.uid() = acreedor_id and estado = 'pendiente');

-- Deudor: pendiente -> pago_marcado | rechazada
drop policy if exists "deudas_update_deudor" on public.deudas_compartidas;
create policy "deudas_update_deudor" on public.deudas_compartidas for update
  using      (auth.uid() = deudor_id and estado = 'pendiente')
  with check (auth.uid() = deudor_id and estado in ('pago_marcado','rechazada'));

-- Acreedor: pago_marcado -> confirmada|pendiente ; confirmada -> pago_marcado (revertir)
drop policy if exists "deudas_update_acreedor" on public.deudas_compartidas;
create policy "deudas_update_acreedor" on public.deudas_compartidas for update
  using      (auth.uid() = acreedor_id and estado in ('pago_marcado','confirmada'))
  with check (auth.uid() = acreedor_id and estado in ('confirmada','pendiente','pago_marcado'));

drop policy if exists "deudas_delete_acreedor" on public.deudas_compartidas;
create policy "deudas_delete_acreedor" on public.deudas_compartidas for delete
  using (auth.uid() = acreedor_id and estado in ('pendiente','rechazada'));

drop trigger if exists deudas_updated_at on public.deudas_compartidas;
create trigger deudas_updated_at before update on public.deudas_compartidas
  for each row execute function public.handle_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Trigger BEFORE UPDATE: valida el par exacto (rol por auth.uid(), old->new).
--    RLS sola no compara old/new; esto cierra la máquina de estados.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.validar_transicion_deuda()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.estado = old.estado then return new; end if;

  if auth.uid() = old.deudor_id then
    if not (old.estado = 'pendiente' and new.estado in ('pago_marcado','rechazada')) then
      raise exception 'Transición no permitida para el deudor: % -> %', old.estado, new.estado;
    end if;
  elsif auth.uid() = old.acreedor_id then
    if not (
      (old.estado = 'pago_marcado' and new.estado in ('confirmada','pendiente'))
      or (old.estado = 'confirmada' and new.estado = 'pago_marcado')   -- revertir
    ) then
      raise exception 'Transición no permitida para el acreedor: % -> %', old.estado, new.estado;
    end if;
  else
    raise exception 'No autorizado para cambiar esta deuda';
  end if;
  return new;
end $$;

drop trigger if exists deudas_validar_transicion on public.deudas_compartidas;
create trigger deudas_validar_transicion before update on public.deudas_compartidas
  for each row execute function public.validar_transicion_deuda();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Sincronización idempotente de deudas desde un gasto compartido.
--    Se llama al final de upsertParticipantes. Clave natural evita duplicados.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.sincronizar_deudas_gasto(p_movimiento_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_mov       record;
  v_part      record;
  v_conex     uuid;
  v_ac_nombre text;
begin
  select id, user_id, concepto, moneda into v_mov
    from public.movimientos where id = p_movimiento_id;
  if v_mov is null or v_mov.user_id <> auth.uid() then
    raise exception 'Movimiento no encontrado o no autorizado';
  end if;

  select nombre into v_ac_nombre from public.profiles where id = auth.uid();

  for v_part in
    select gcp.id as participante_id, gcp.monto, gcp.persona_nombre,
           pe.usuario_vinculado_id as deudor
    from public.gastos_compartidos_participantes gcp
    join public.personas pe on pe.id = gcp.persona_id
    where gcp.movimiento_id = p_movimiento_id
      and gcp.user_id = auth.uid()
      and gcp.estado = 'pendiente'
      and pe.usuario_vinculado_id is not null
  loop
    select id into v_conex from public.conexiones
      where estado = 'aceptada'
        and ((solicitante_id = auth.uid() and receptor_id = v_part.deudor)
          or (receptor_id   = auth.uid() and solicitante_id = v_part.deudor))
      limit 1;

    insert into public.deudas_compartidas
      (acreedor_id, deudor_id, acreedor_nombre, deudor_nombre, conexion_id,
       monto, moneda, concepto, movimiento_origen_id, participante_id, origen, estado)
    values
      (auth.uid(), v_part.deudor, v_ac_nombre, v_part.persona_nombre, v_conex,
       v_part.monto, v_mov.moneda, v_mov.concepto, p_movimiento_id,
       v_part.participante_id, 'gasto', 'pendiente')
    on conflict (movimiento_origen_id, deudor_id)
      where origen = 'gasto' and estado in ('pendiente','pago_marcado','confirmada')
    do update
      set monto = excluded.monto,
          concepto = excluded.concepto,
          participante_id = excluded.participante_id,
          updated_at = now()
      where public.deudas_compartidas.estado = 'pendiente';
  end loop;

  -- Cancelar deudas pendientes de participantes que ya no están en el gasto.
  delete from public.deudas_compartidas d
   where d.movimiento_origen_id = p_movimiento_id
     and d.origen = 'gasto'
     and d.estado = 'pendiente'
     and not exists (
       select 1
       from public.gastos_compartidos_participantes gcp
       join public.personas pe on pe.id = gcp.persona_id
       where gcp.movimiento_id = p_movimiento_id
         and gcp.user_id = auth.uid()
         and gcp.estado = 'pendiente'
         and pe.usuario_vinculado_id = d.deudor_id);
end $$;

revoke all on function public.sincronizar_deudas_gasto(uuid) from public, anon;
grant execute on function public.sincronizar_deudas_gasto(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Notificaciones (SECURITY DEFINER, patrón notificar_invitacion de 024)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.notificar_deuda_nueva()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notificaciones (user_id, tipo, titulo, cuerpo, ref_id)
  values (new.deudor_id, 'deuda_recibida',
          'Le debés a ' || coalesce(new.acreedor_nombre, 'alguien'),
          coalesce(new.concepto, ''), new.id);
  return new;
end $$;

drop trigger if exists deudas_notificar_insert on public.deudas_compartidas;
create trigger deudas_notificar_insert after insert on public.deudas_compartidas
  for each row execute function public.notificar_deuda_nueva();

create or replace function public.notificar_deuda_estado()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.estado = old.estado then return new; end if;
  if new.estado = 'pago_marcado' then
    insert into public.notificaciones (user_id, tipo, titulo, cuerpo, ref_id)
    values (new.acreedor_id, 'deuda_pago_marcado',
            coalesce(new.deudor_nombre, 'Alguien') || ' marcó que te pagó',
            coalesce(new.concepto, ''), new.id);
  elsif new.estado = 'confirmada' then
    insert into public.notificaciones (user_id, tipo, titulo, cuerpo, ref_id)
    values (new.deudor_id, 'deuda_confirmada',
            coalesce(new.acreedor_nombre, 'Alguien') || ' confirmó tu pago',
            coalesce(new.concepto, ''), new.id);
  elsif new.estado = 'rechazada' then
    insert into public.notificaciones (user_id, tipo, titulo, cuerpo, ref_id)
    values (new.acreedor_id, 'deuda_rechazada',
            coalesce(new.deudor_nombre, 'Alguien') || ' rechazó la deuda',
            coalesce(new.concepto, ''), new.id);
  end if;
  return new;
end $$;

drop trigger if exists deudas_notificar_estado on public.deudas_compartidas;
create trigger deudas_notificar_estado after update on public.deudas_compartidas
  for each row execute function public.notificar_deuda_estado();

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RPC conciliar_deuda: escribe ambos lados (Ingreso acreedor + Egreso deudor).
--    Solo el acreedor, solo desde 'pago_marcado'.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.conciliar_deuda(
  p_deuda_id uuid,
  p_acreedor_cuenta_id uuid,
  p_fecha date,
  p_observacion text default null)
returns void language plpgsql security definer set search_path = public as $$
declare d record; v_ing uuid; v_egr uuid;
begin
  select * into d from public.deudas_compartidas where id = p_deuda_id for update;
  if d is null then raise exception 'Deuda no encontrada'; end if;
  if auth.uid() <> d.acreedor_id then raise exception 'Solo el acreedor confirma'; end if;
  if d.estado <> 'pago_marcado' then raise exception 'La deuda no está en pago_marcado'; end if;
  if d.mov_ingreso_acreedor_id is not null then raise exception 'La deuda ya fue conciliada'; end if;

  insert into public.movimientos
    (user_id, tipo, ambito, monto, moneda, concepto, fecha, cuenta_id,
     observaciones, clasificacion, cuotas, frecuencia, cantidad, es_reembolso)
  values
    (d.acreedor_id, 'Ingreso', 'Personal', d.monto, d.moneda,
     'Cobro de ' || coalesce(d.deudor_nombre, 'deuda') || ' por ' || coalesce(d.concepto, 'gasto compartido'),
     p_fecha, p_acreedor_cuenta_id, p_observacion, 'Variable', 1, 'Corriente', 1, true)
  returning id into v_ing;

  insert into public.movimientos
    (user_id, tipo, ambito, monto, moneda, concepto, fecha, cuenta_id,
     observaciones, clasificacion, cuotas, frecuencia, cantidad, es_reembolso)
  values
    (d.deudor_id, 'Egreso', 'Personal', d.monto, d.moneda,
     'Pago a ' || coalesce(d.acreedor_nombre, 'deuda') || ' por ' || coalesce(d.concepto, 'gasto compartido'),
     p_fecha, d.deudor_cuenta_id, null, 'Variable', 1, 'Corriente', 1, true)
  returning id into v_egr;

  update public.deudas_compartidas
     set estado = 'confirmada',
         mov_ingreso_acreedor_id = v_ing,
         mov_egreso_deudor_id = v_egr,
         acreedor_cuenta_id = p_acreedor_cuenta_id,
         responded_at = now(),
         updated_at = now()
   where id = p_deuda_id;
end $$;

revoke all on function public.conciliar_deuda(uuid, uuid, date, text) from public, anon;
grant execute on function public.conciliar_deuda(uuid, uuid, date, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. RPC revertir_conciliacion: borra ambos movimientos y vuelve a 'pago_marcado'.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.revertir_conciliacion(p_deuda_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare d record;
begin
  select * into d from public.deudas_compartidas where id = p_deuda_id for update;
  if d is null then raise exception 'Deuda no encontrada'; end if;
  if auth.uid() <> d.acreedor_id then raise exception 'Solo el acreedor revierte'; end if;
  if d.estado <> 'confirmada' then raise exception 'La deuda no está confirmada'; end if;

  if d.mov_ingreso_acreedor_id is not null then
    delete from public.movimientos where id = d.mov_ingreso_acreedor_id and user_id = d.acreedor_id;
  end if;
  if d.mov_egreso_deudor_id is not null then
    delete from public.movimientos where id = d.mov_egreso_deudor_id and user_id = d.deudor_id;
  end if;

  update public.deudas_compartidas
     set estado = 'pago_marcado',
         mov_ingreso_acreedor_id = null,
         mov_egreso_deudor_id = null,
         acreedor_cuenta_id = null,
         updated_at = now()
   where id = p_deuda_id;
end $$;

revoke all on function public.revertir_conciliacion(uuid) from public, anon;
grant execute on function public.revertir_conciliacion(uuid) to authenticated;
