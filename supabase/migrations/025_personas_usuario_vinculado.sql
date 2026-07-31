-- =============================================
-- 025_personas_usuario_vinculado.sql
-- Vincular una persona de la agenda a un usuario real conectado.
-- Al aceptarse una conexión, se crea automáticamente una persona vinculada
-- en la agenda de AMBOS usuarios (así se puede usar en gastos compartidos).
-- Correr manualmente en Supabase SQL Editor (después de 024).
-- =============================================

-- 1. Columna de vínculo persona -> usuario real
alter table public.personas
  add column if not exists usuario_vinculado_id uuid null
    references public.profiles(id) on delete set null;

create index if not exists personas_usuario_vinculado_idx
  on public.personas (usuario_vinculado_id) where usuario_vinculado_id is not null;

-- 2. Trigger: al aceptarse una conexión, crear la persona vinculada de cada lado.
--    SECURITY DEFINER porque inserta filas en la agenda de AMBOS usuarios
--    (un usuario no puede insertar en personas del otro por RLS).
create or replace function public.sincronizar_personas_conexion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado = 'aceptada' and (old.estado is distinct from 'aceptada') then
    -- Persona en la agenda del solicitante -> apunta al receptor
    if not exists (
      select 1 from public.personas
      where user_id = new.solicitante_id
        and usuario_vinculado_id = new.receptor_id
    ) then
      insert into public.personas (user_id, nombre, usuario_vinculado_id)
      values (new.solicitante_id, coalesce(new.receptor_nombre, 'Usuario'), new.receptor_id);
    end if;

    -- Persona en la agenda del receptor -> apunta al solicitante
    if not exists (
      select 1 from public.personas
      where user_id = new.receptor_id
        and usuario_vinculado_id = new.solicitante_id
    ) then
      insert into public.personas (user_id, nombre, usuario_vinculado_id)
      values (new.receptor_id, coalesce(new.solicitante_nombre, 'Usuario'), new.solicitante_id);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists conexiones_sincronizar_personas on public.conexiones;
create trigger conexiones_sincronizar_personas
  after update on public.conexiones
  for each row execute function public.sincronizar_personas_conexion();

-- 3. Backfill: conexiones YA aceptadas antes de este trigger.
--    Deja a las contrapartes existentes en la agenda de cada uno.
do $$
declare
  c record;
begin
  for c in select * from public.conexiones where estado = 'aceptada' loop
    if not exists (
      select 1 from public.personas
      where user_id = c.solicitante_id and usuario_vinculado_id = c.receptor_id
    ) then
      insert into public.personas (user_id, nombre, usuario_vinculado_id)
      values (c.solicitante_id, coalesce(c.receptor_nombre, 'Usuario'), c.receptor_id);
    end if;

    if not exists (
      select 1 from public.personas
      where user_id = c.receptor_id and usuario_vinculado_id = c.solicitante_id
    ) then
      insert into public.personas (user_id, nombre, usuario_vinculado_id)
      values (c.receptor_id, coalesce(c.solicitante_nombre, 'Usuario'), c.solicitante_id);
    end if;
  end loop;
end $$;
