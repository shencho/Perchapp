-- =============================================
-- 003_triggers.sql — Triggers y funciones
-- Ejecutar DESPUÉS de 002_rls.sql
-- =============================================

-- Función genérica para actualizar updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger updated_at en profiles
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- Trigger updated_at en conversaciones_ia
create trigger conversaciones_ia_updated_at
  before update on public.conversaciones_ia
  for each row execute function public.handle_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Crea automáticamente una fila en profiles cuando se registra un usuario nuevo.
-- Usa security definer para poder insertar incluso con RLS activo.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Ejecutar handle_new_user() cuando se crea un auth.user
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
