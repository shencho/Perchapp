-- =============================================
-- 024_conexiones.sql
-- Relación entre usuarios reales (invitación + aceptación) + notificaciones in-app
-- PRIMER caso cross-user de la app: RLS bilateral en `conexiones`.
-- Correr manualmente en Supabase SQL Editor (después de 023).
-- =============================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Lookup privado por email (NO expone profiles como directorio).
--    SECURITY DEFINER lee auth.users (única fuente del email) sin duplicarlo.
--    Match EXACTO, devuelve solo {id, nombre}, excluye a uno mismo.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.buscar_usuario_por_email(p_email text)
returns table (id uuid, nombre text)
language sql
security definer
set search_path = public, auth
as $$
  select p.id, p.nombre
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(u.email) = lower(trim(p_email))
    and u.id <> auth.uid()
  limit 1;
$$;

revoke all on function public.buscar_usuario_por_email(text) from public, anon;
grant execute on function public.buscar_usuario_por_email(text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Tabla conexiones — relación + invitación entre dos usuarios reales.
--    Snapshot de nombres para NO tener que leer profiles ajeno (privacidad).
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.conexiones (
  id                 uuid primary key default gen_random_uuid(),
  solicitante_id     uuid not null references public.profiles(id) on delete cascade,
  receptor_id        uuid not null references public.profiles(id) on delete cascade,
  solicitante_nombre text,
  receptor_nombre    text,
  estado             text not null default 'pendiente'
                       check (estado in ('pendiente', 'aceptada', 'rechazada')),
  mensaje            text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  responded_at       timestamptz,
  constraint conexiones_no_self check (solicitante_id <> receptor_id)
);

-- Anti-duplicado sobre el PAR NO ORDENADO, solo mientras la conexión está viva.
-- Permite reinvitar tras un rechazo (una fila 'rechazada' queda fuera del índice).
create unique index if not exists conexiones_par_activa_uq
  on public.conexiones (least(solicitante_id, receptor_id), greatest(solicitante_id, receptor_id))
  where estado in ('pendiente', 'aceptada');

create index if not exists conexiones_receptor_pendiente_idx
  on public.conexiones (receptor_id) where estado = 'pendiente';

alter table public.conexiones enable row level security;

-- RLS BILATERAL (primer precedente de la app con dos dueños).
drop policy if exists "conexiones_select_involucrados" on public.conexiones;
create policy "conexiones_select_involucrados" on public.conexiones for select
  using (auth.uid() = solicitante_id or auth.uid() = receptor_id);

drop policy if exists "conexiones_insert_solicitante" on public.conexiones;
create policy "conexiones_insert_solicitante" on public.conexiones for insert
  with check (auth.uid() = solicitante_id and estado = 'pendiente');

-- Solo el receptor puede cambiar el estado, y solo desde 'pendiente'.
drop policy if exists "conexiones_update_receptor" on public.conexiones;
create policy "conexiones_update_receptor" on public.conexiones for update
  using      (auth.uid() = receptor_id and estado = 'pendiente')
  with check (auth.uid() = receptor_id and estado in ('aceptada', 'rechazada'));

drop policy if exists "conexiones_delete_involucrados" on public.conexiones;
create policy "conexiones_delete_involucrados" on public.conexiones for delete
  using (auth.uid() = solicitante_id or auth.uid() = receptor_id);

drop trigger if exists conexiones_updated_at on public.conexiones;
create trigger conexiones_updated_at before update on public.conexiones
  for each row execute function public.handle_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Tabla notificaciones — single-owner, extensible a futuros tipos.
--    RLS estándar: el usuario solo lee/gestiona lo suyo.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.notificaciones (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  tipo       text not null,
  titulo     text not null,
  cuerpo     text,
  ref_id     uuid,
  leida      boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notificaciones_no_leidas_idx
  on public.notificaciones (user_id) where leida = false;

alter table public.notificaciones enable row level security;

drop policy if exists "notificaciones_owner_full_access" on public.notificaciones;
create policy "notificaciones_owner_full_access" on public.notificaciones for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Trigger SECURITY DEFINER: al crearse una invitación, notifica al receptor.
--    El emisor no puede insertar en notificaciones del receptor (RLS lo bloquea);
--    el trigger corre con privilegios y salta esa barrera de forma controlada.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.notificar_invitacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado = 'pendiente' then
    insert into public.notificaciones (user_id, tipo, titulo, cuerpo, ref_id)
    values (
      new.receptor_id,
      'invitacion_recibida',
      coalesce(new.solicitante_nombre, 'Alguien') || ' te quiere conectar',
      new.mensaje,
      new.id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists conexiones_notificar_after_insert on public.conexiones;
create trigger conexiones_notificar_after_insert
  after insert on public.conexiones
  for each row execute function public.notificar_invitacion();

-- (A futuro: trigger AFTER UPDATE que notifique 'invitacion_aceptada' al solicitante.)
