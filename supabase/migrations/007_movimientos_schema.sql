-- =============================================
-- 007_movimientos_schema.sql — Extender tabla movimientos
-- Ejecutar DESPUÉS de 006_ajustes_schema.sql
-- Idempotente: usa ADD COLUMN IF NOT EXISTS y DROP/ADD constraint.
-- =============================================

-- ── tipo: capitalizar valores existentes + agregar Transferencia ──────────────
alter table public.movimientos drop constraint if exists movimientos_tipo_check;

update public.movimientos set tipo = 'Ingreso' where tipo = 'ingreso';
update public.movimientos set tipo = 'Egreso'  where tipo = 'egreso';

alter table public.movimientos add constraint movimientos_tipo_check
  check (tipo in ('Ingreso', 'Egreso', 'Transferencia'));

-- ── columnas nuevas ───────────────────────────────────────────────────────────
alter table public.movimientos
  add column if not exists ambito           text default 'Personal'
                                            check (ambito in ('Personal', 'Profesional')),
  add column if not exists moneda           text default 'ARS',
  add column if not exists tipo_cambio      numeric(12,2),
  add column if not exists concepto         text,
  add column if not exists clasificacion    text default 'Variable'
                                            check (clasificacion in ('Fijo', 'Variable', 'Cuotas')),
  add column if not exists cuotas           integer default 1,
  add column if not exists frecuencia       text default 'Corriente'
                                            check (frecuencia in ('Corriente', 'No corriente')),
  add column if not exists necesidad        integer check (necesidad between 1 and 5),
  add column if not exists metodo           text
                                            check (metodo in (
                                              'Efectivo', 'Transferencia', 'Billetera virtual',
                                              'Crédito', 'Débito automático', 'Débito'
                                            )),
  add column if not exists tarjeta_id       uuid references public.tarjetas(id) on delete set null,
  add column if not exists fecha_vencimiento date,
  add column if not exists debita_de        text check (debita_de in ('cuenta', 'tarjeta')),
  add column if not exists cuenta_destino_id uuid references public.cuentas(id) on delete set null,
  add column if not exists cantidad         integer default 1,
  add column if not exists unitario         numeric(12,2),
  add column if not exists observaciones    text,
  add column if not exists cliente_id       uuid references public.clientes(id) on delete set null;

-- ── RLS: la policy existente cubre user_id, no hay cambios necesarios ─────────
