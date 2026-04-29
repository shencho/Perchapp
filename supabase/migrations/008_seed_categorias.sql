-- =============================================
-- 008_seed_categorias.sql — Precargar categorías con subcategorías
-- Ejecutar DESPUÉS de 007_movimientos_schema.sql
-- Idempotente: no inserta si ya existe categoría con igual nombre+tipo (case-insensitive).
-- =============================================
--
-- Para usuarios que ya pasaron onboarding, agrega las categorías base
-- con sus subcategorías. No duplica si ya existe una con el mismo nombre+tipo.
-- =============================================

DO $$
DECLARE
  u_id        uuid;
  parent_id   uuid;
  existing_id uuid;

  -- (nombre_padre, tipo, subcategorías[])
  type cat_def IS (nombre text, tipo text, subs text[]);

  cats cat_def[] := ARRAY[
    ROW('Servicios del hogar', 'Egreso',   ARRAY['Internet','Luz','Gas','Agua','Expensas'])::cat_def,
    ROW('Suscripciones',       'Egreso',   ARRAY['Streaming','Software','Apps'])::cat_def,
    ROW('Alimentos',           'Egreso',   ARRAY['Supermercado','Carnicería','Verdulería','Delivery'])::cat_def,
    ROW('Transporte',          'Egreso',   ARRAY['Combustible','Peajes','Uber','Estacionamiento'])::cat_def,
    ROW('Salud',               'Egreso',   ARRAY['Prepaga','Medicina','Farmacia','Consultas'])::cat_def,
    ROW('Esparcimiento',       'Egreso',   ARRAY['Salidas','Cine','Viajes','Hobbies'])::cat_def,
    ROW('Hogar',               'Egreso',   ARRAY['Alquiler','Mantenimiento'])::cat_def,
    ROW('Trabajo',             'Ingreso',  ARRAY['Honorarios','Comisiones','Sueldo'])::cat_def,
    ROW('Otros ingresos',      'Ingreso',  ARRAY['Reintegros','Regalos'])::cat_def
  ];

  cat    cat_def;
  sub    text;

BEGIN
  FOR u_id IN
    SELECT id FROM public.profiles WHERE onboarding_completado = true
  LOOP
    FOREACH cat IN ARRAY cats LOOP

      -- Buscar si ya existe la categoría padre para este usuario
      SELECT id INTO existing_id
        FROM public.categorias
       WHERE user_id = u_id
         AND lower(nombre) = lower(cat.nombre)
         AND tipo = cat.tipo
         AND parent_id IS NULL
       LIMIT 1;

      IF existing_id IS NULL THEN
        -- Insertar padre
        INSERT INTO public.categorias (user_id, nombre, tipo)
        VALUES (u_id, cat.nombre, cat.tipo)
        RETURNING id INTO parent_id;
      ELSE
        parent_id := existing_id;
      END IF;

      -- Insertar subcategorías que no existan ya
      FOREACH sub IN ARRAY cat.subs LOOP
        IF NOT EXISTS (
          SELECT 1 FROM public.categorias
           WHERE user_id  = u_id
             AND lower(nombre) = lower(sub)
             AND parent_id = parent_id
        ) THEN
          INSERT INTO public.categorias (user_id, nombre, tipo, parent_id)
          VALUES (u_id, sub, cat.tipo, parent_id);
        END IF;
      END LOOP;

    END LOOP;
  END LOOP;
END;
$$;
