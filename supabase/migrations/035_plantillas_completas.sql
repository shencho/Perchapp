-- 035 · La plantilla recurrente replica el movimiento completo
--
-- Problema: la plantilla guardaba 12 de los ~24 campos del movimiento, así que
-- lo que se generaba el mes siguiente no era el mismo gasto. Faltaban necesidad,
-- observaciones, descripcion, cantidad y frecuencia (que además estaba
-- hardcodeada en "Corriente" al generar, sin importar el original).
--
-- Y el caso peor era el gasto compartido: la plantilla guardaba TU PARTE como
-- monto_estimado y generaba un gasto entero NO compartido. El total real y la
-- deuda de los demás se perdían, porque gastos_compartidos_participantes cuelga
-- de un movimiento concreto (013:67) y no tiene forma de colgar de una plantilla.

alter table public.plantillas_recurrentes
  add column if not exists descripcion   text,
  add column if not exists observaciones text,
  add column if not exists necesidad     integer check (necesidad between 1 and 5),
  add column if not exists cantidad      integer not null default 1 check (cantidad >= 1),
  add column if not exists frecuencia    text not null default 'Corriente'
    check (frecuencia in ('Corriente', 'No corriente')),
  add column if not exists es_compartido boolean not null default false,
  add column if not exists gc_mi_parte   numeric(12,2);

-- Participantes de la plantilla: espeja gastos_compartidos_participantes, pero
-- colgando de la plantilla en vez del movimiento. Sin `estado` ni
-- `cuenta_destino_id`: eso es del cobro real, no de la plantilla.
create table if not exists public.plantilla_participantes (
  id             uuid default gen_random_uuid() not null primary key,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  plantilla_id   uuid not null references public.plantillas_recurrentes(id) on delete cascade,
  persona_nombre text not null,
  persona_id     uuid null references public.personas(id) on delete set null,
  monto          numeric(12,2) not null,
  modo           text not null default 'a_repartir' check (modo in ('fijo', 'a_repartir')),
  created_at     timestamptz not null default now()
);

create index if not exists plantilla_participantes_plantilla_idx
  on public.plantilla_participantes (plantilla_id);

alter table public.plantilla_participantes enable row level security;

drop policy if exists "plantilla_participantes: owner full access" on public.plantilla_participantes;
create policy "plantilla_participantes: owner full access"
  on public.plantilla_participantes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
