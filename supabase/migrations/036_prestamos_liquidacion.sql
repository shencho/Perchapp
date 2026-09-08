-- 036 · El préstamo recuerda de dónde sale la cuota, y puede liquidarse solo
--
-- Hoy `prestamos` no guarda ni cuenta, ni tarjeta, ni categoría, ni método
-- (015_prestamos.sql:8-26). Consecuencias:
--   - cada pago vuelve a preguntar todo, y se puede registrar sin cuenta, con lo
--     cual no mueve ningún saldo pero sí cuenta como gasto;
--   - el movimiento generado cae en "Sin categoría" en estadísticas;
--   - no hay forma de que una cuota fija (el caso de ANSES, misma cuota todos
--     los meses) se aplique sola.

alter table public.prestamos
  add column if not exists cuenta_id    uuid null references public.cuentas(id)     on delete set null,
  add column if not exists tarjeta_id   uuid null references public.tarjetas(id)    on delete set null,
  add column if not exists categoria_id uuid null references public.categorias(id)  on delete set null,
  add column if not exists metodo       text null
    check (metodo in ('Efectivo','Transferencia','Billetera virtual','Crédito','Débito automático','Débito')),
  -- La cuota se ofrece sola cada mes, en el mismo flujo de pendientes que las
  -- plantillas recurrentes. NO se inserta sin intervención: se propone.
  add column if not exists auto_liquidar boolean not null default false,
  -- Sin esto, editar o borrar el préstamo deja huérfano el movimiento del
  -- desembolso y el saldo de la cuenta queda mal para siempre.
  add column if not exists movimiento_desembolso_id uuid null
    references public.movimientos(id) on delete set null;

-- Para auto_liquidar hace falta saber cuánto y qué día; si no, no hay nada que
-- proponer. Se valida en la app (un CHECK acá bloquearía activar el flag antes
-- de completar los datos, que es el orden natural en el formulario).
create index if not exists prestamos_auto_liquidar_idx
  on public.prestamos (user_id) where auto_liquidar;
