-- =============================================
-- 028_control.sql
-- Tablero de control interno de bugs/fixes (solo admins: founder + Nico).
-- Gate por profiles.es_admin. Correr manualmente en Supabase SQL Editor.
-- =============================================

-- 1. Flag admin
alter table public.profiles
  add column if not exists es_admin boolean not null default false;

-- >>> Después de correr esto, prendé el flag para vos y Nico:
--     update public.profiles set es_admin = true where id in ('<uuid-benja>', '<uuid-nico>');
--     (los uuid salen de: select id, (select email from auth.users u where u.id = p.id) from public.profiles p;)

-- 2. Tabla de reportes
create table if not exists public.bug_reports (
  id               uuid primary key default gen_random_uuid(),
  sector           text not null,
  titulo           text not null,
  descripcion      text,
  diagnostico      text,
  fix_descripcion  text,
  estado           text not null default 'nuevo' check (estado in ('nuevo','en_progreso','resuelto')),
  autor_id         uuid references public.profiles(id) on delete set null,
  autor_nombre     text,
  fecha_reporte    date not null default current_date,
  fecha_resolucion date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists bug_reports_sector_idx on public.bug_reports (sector);
create index if not exists bug_reports_estado_idx on public.bug_reports (estado);

alter table public.bug_reports enable row level security;

-- Solo admins ven/gestionan el tablero
drop policy if exists "bug_reports_admin_all" on public.bug_reports;
create policy "bug_reports_admin_all" on public.bug_reports for all
  using      (exists (select 1 from public.profiles p where p.id = auth.uid() and p.es_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.es_admin));

drop trigger if exists bug_reports_updated_at on public.bug_reports;
create trigger bug_reports_updated_at before update on public.bug_reports
  for each row execute function public.handle_updated_at();

-- 3. Seed: historial de lo ya hecho + fallas abiertas de la tanda actual.
insert into public.bug_reports (sector, titulo, descripcion, diagnostico, fix_descripcion, estado, autor_nombre, fecha_reporte, fecha_resolucion) values
  ('Conexiones', 'Conectar cuentas reales (invitar + aceptar)', 'Vincular dos usuarios de Perchapp con invitación por email y aceptación.', 'La app era 100% single-owner; no existía relación cross-user.', 'Migración 024: tabla conexiones con RLS bilateral, lookup por email (SECURITY DEFINER), notificaciones in-app (campana + toast).', 'resuelto', 'Claude', date '2026-07-24', date '2026-07-25'),
  ('Conexiones', 'Auto-crear persona al aceptar conexión', 'Al conectarse, el otro no aparecía en la agenda para sumarlo a gastos compartidos.', 'Faltaba vínculo persona↔usuario y auto-alta en ambas agendas.', 'Migración 025: personas.usuario_vinculado_id + trigger que crea la persona vinculada en ambos lados + backfill.', 'resuelto', 'Claude', date '2026-07-25', date '2026-07-25'),
  ('Gastos compartidos', 'Deuda no aparecía en la contraparte', 'Un gasto compartido con un usuario conectado no notificaba ni mostraba la deuda del otro lado.', 'La deuda vivía de un solo lado (creador); no había objeto cross-user.', 'Migración 026: deudas_compartidas (RLS bilateral por rol), notificación al deudor, conciliación pagué/recibí que genera Ingreso+Egreso.', 'resuelto', 'Claude', date '2026-07-27', date '2026-07-28'),
  ('Proyectos', 'Proyectos/viajes colaborativos (Splitwise)', 'Agrupar gastos compartidos entre varios participantes con balances.', 'No existía el concepto de proyecto multiusuario.', 'Migración 027: proyectos + ledger compartido + RLS N-usuarios + balance por moneda + saldar (materializa deudas bilaterales). UI /gastos-compartidos.', 'resuelto', 'Claude', date '2026-07-28', date '2026-07-28'),
  ('Navegación/UI', 'Fecha y Cantidad se solapaban en mobile', 'En el form de movimientos los campos se pisaban en pantallas chicas.', 'Grid grid-cols-2 fijo; el input date nativo desbordaba la celda.', 'Grid responsive (grid-cols-1 sm:grid-cols-2) + w-full/min-w-0.', 'resuelto', 'Benja', date '2026-07-28', date '2026-07-28'),
  ('Navegación/UI', 'Botón Guardar oculto en el modal (mobile)', 'No se podía ver/tocar el botón de aceptar al cargar/editar un movimiento.', 'El footer estaba dentro del área scrolleable y max-h en vh (barra del navegador tapaba el fondo).', 'Footer fijo fuera del scroll + max-h con dvh.', 'resuelto', 'Benja', date '2026-07-28', date '2026-07-28'),
  ('Navegación/UI', 'Campana pisaba el botón de acción', 'La campana de notificaciones se superponía con "Nuevo movimiento".', 'Campana mobile era fixed top-right sobre el contenido.', 'Barra superior mobile sticky (logo + campana); el contenido fluye debajo.', 'resuelto', 'Benja', date '2026-07-28', date '2026-07-28'),
  ('IA/Interpret', 'Error "Unexpected non-whitespace character after JSON"', 'Al usar Interpretar, a veces fallaba el parseo del JSON del modelo.', 'extractJsonFromResponse recortaba indexOf/lastIndexOf; rompía si el modelo agregaba texto o llaves después del objeto.', 'Extracción del primer objeto JSON balanceado (conteo de llaves) + prefill de assistant "{".', 'resuelto', 'Benja', date '2026-07-29', date '2026-07-29'),
  ('Tarjetas', 'Selector de tarjeta ilegible (truncado)', 'La lista de selección era angosta y no se veía el nombre completo de tarjetas parecidas.', 'El popup copiaba el ancho del trigger (w-anchor + overflow-x-hidden + whitespace-nowrap).', 'Dropdown crece al contenido (min-w anchor + max-w), items con wrap y title; bloque tarjeta w-full.', 'resuelto', 'Benja', date '2026-07-29', date '2026-07-29'),
  ('Movimientos', 'Labels confusos (Fecha vencimiento / Cantidad)', 'No se entendía qué significaban esos campos.', 'Fecha vencimiento = vencimiento del resumen de tarjeta; Cantidad = unidades × monto.', 'Renombrados a "Vencimiento de la tarjeta" y "Cantidad (unidades)" con hints.', 'resuelto', 'Benja', date '2026-07-29', date '2026-07-29'),
  ('Cuotas', 'Gasto en cuotas no se prorratea por mes', 'Muestra el total en el mes de registro en vez de una cuota por mes según cierre de tarjeta.', 'Un gasto en cuotas se guarda como 1 solo movimiento con el monto total.', null, 'en_progreso', 'Benja', date '2026-07-29', null),
  ('Cuotas', 'Cuotas no se reflejan en proyecciones', 'Los gastos no corrientes/cuotas no aparecen en los meses siguientes del cash-flow.', 'Cash-flow proyecta con promedio plano de 3 meses; ignora movimientos futuros reales.', null, 'en_progreso', 'Benja', date '2026-07-29', null),
  ('Movimientos', 'Compra/venta de USD (transferencia cross-moneda)', 'Poder comprar/vender dólares con una transferencia que reste en pesos y sume en dólares (y viceversa).', 'Feature nueva: transferencia entre cuentas de distinta moneda con tipo de cambio.', null, 'nuevo', 'Benja', date '2026-07-29', null);
