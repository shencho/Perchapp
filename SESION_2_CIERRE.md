# Cierre de Sesión 2 — MANGO (ex-Perchapp)
**Fecha:** 26 de abril de 2025

---

## Qué quedó hecho

### Sesión 1 (base del proyecto)
- Next.js 16 + TypeScript + Tailwind CSS + shadcn/ui
- Integración con Supabase (auth, SSR)
- Registro con email/password (con confirmación por email)
- Login con email/password
- Rutas protegidas: grupo `(app)` requiere sesión activa
- Callback de autenticación (`/auth/callback`)
- Componentes UI base: Button, Input, Label, Card, Header
- Deploy del repo a GitHub

### Sesión 2 (schema + onboarding)
- **4 migraciones SQL** listas para correr en Supabase:
  - `001_schema.sql` — 13 tablas: profiles, cuentas, tarjetas, categorias, clientes, servicios_cliente, tarifas_historial, registros_trabajo, pagos_cliente, movimientos, conversaciones_ia, profesiones_templates, feature_flags
  - `002_rls.sql` — RLS habilitado + policies de acceso por `user_id` en cada tabla
  - `003_triggers.sql` — trigger `on_auth_user_created` (crea perfil automáticamente al registrarse) + `updated_at` automático
  - `004_seed.sql` — 5 profesiones: Psicopedagogía, Coaching, Consultoría, Profesor, Genérico
- **Tipos TypeScript** (`types/supabase.ts`) — todas las tablas con Row / Insert / Update + helpers de tipo
- **Onboarding wizard** (`/onboarding`) — 4 pasos: nombre, profesión, modo, nombre del asistente
- **Server Action** `createProfile.ts` — al completar onboarding: crea perfil + cuenta Efectivo + categorías base + categorías por profesión + feature_flags → redirect a `/dashboard`
- **Layout protegido actualizado** — verifica `onboarding_completado` antes de mostrar el dashboard; si no completó, redirige a `/onboarding`
- **Google OAuth** — botón "Continuar con Google" en login y signup (código listo; falta activar en Google Cloud Console + Supabase)
- **Rename completo** `industria` → `profesion` / `industrias_templates` → `profesiones_templates` en todos los archivos

---

## Pendientes manuales para mañana

### Ejecutar las 4 migrations en Supabase (en orden)
Ir a: **Supabase → SQL Editor → New query** → pegar y correr cada archivo:

1. `supabase/migrations/001_schema.sql` — crea las 13 tablas
2. `supabase/migrations/002_rls.sql` — activa RLS y policies
3. `supabase/migrations/003_triggers.sql` — trigger de nuevo usuario
4. `supabase/migrations/004_seed.sql` — inserta las 5 profesiones

> Correrlos en ese orden exacto. Cada uno depende del anterior.

### Verificar que funciona
Después de las migrations:
1. Crear una cuenta nueva → confirmar email → entrar → debe aparecer el onboarding
2. Completar los 4 pasos → llegar al dashboard
3. En Supabase → Table Editor: verificar filas en `profiles`, `cuentas`, `categorias`

### Google OAuth (opcional, cuando quieras)
1. Google Cloud Console → nuevo proyecto `MANGO` → OAuth consent screen → Credentials → OAuth client ID (Web)
2. Redirect URI: `https://voeyfiwlmhsdqdajwgrw.supabase.co/auth/v1/callback`
3. Supabase → Authentication → Providers → Google → pegar Client ID y Secret

### Cambios al cierre de Sesión 2 (segunda tanda)
- **6 áreas genéricas** reemplazan las 5 profesiones anteriores:
  - Salud y bienestar / Educación / Servicios profesionales / Creatividad y digital / Belleza y cuidado personal / Otro / Genérico
  - Cada área tiene `modalidades` (array) y categorías de ingreso y egreso
  - Migration lista en `supabase/migrations/005_profesiones_v2.sql` — **pendiente correr en Supabase**
- **Slogan "No te cuelgues"** agregado en:
  - `/login` y `/signup`: debajo del título "MANGO", tipografía xs, color muted (slogan eliminado en PR1a)
  - Onboarding paso 1: grande y centrado sobre el formulario
- **Onboarding paso 2** actualizado: cards con nombre del área + fila de ejemplos en texto chico

---

### Pendiente manual — ejecutar en Supabase SQL Editor
```
supabase/migrations/005_profesiones_v2.sql
```
Esta migration agrega la columna `modalidades`, borra las 5 profesiones anteriores e inserta las 6 nuevas áreas.

---

## Por dónde arrancar en la Sesión 3

Con el schema en prod y el onboarding funcionando, la Sesión 3 puede apuntar a:

### Opción A — Dashboard funcional (recomendado)
- Mostrar saldo de cuentas y últimos movimientos reales desde la DB
- Formulario para cargar un movimiento (ingreso/egreso)
- Listar movimientos del mes con totales

### Opción B — Gestión de clientes
- CRUD de clientes
- Asociar servicios a clientes con tarifa y frecuencia
- Registrar sesiones de trabajo

### Opción C — Asistente IA (Perchita)
- Integrar Claude API (claude-sonnet-4-6)
- Chat básico que lee el contexto financiero del usuario
- Guardar conversaciones en `conversaciones_ia`

> Sugerencia: arrancar por **Opción A** para tener una app usable rápido,
> luego Opción C para el diferencial, luego Opción B.
