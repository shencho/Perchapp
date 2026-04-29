-- =============================================
-- 008_seed_categorias.sql — Precargar categorías con subcategorías
-- Ejecutar DESPUÉS de 007_movimientos_schema.sql
-- Idempotente: usa WHERE NOT EXISTS para no duplicar.
-- =============================================

DO $$
DECLARE
  u_id        uuid;
  parent_id   uuid;
  existing_id uuid;
  cat         jsonb;
  sub         text;

  cats jsonb := '[
    {"nombre": "Servicios del hogar", "tipo": "Egreso",  "subs": ["Internet","Luz","Gas","Agua","Expensas"]},
    {"nombre": "Suscripciones",       "tipo": "Egreso",  "subs": ["Streaming","Software","Apps"]},
    {"nombre": "Alimentos",           "tipo": "Egreso",  "subs": ["Supermercado","Carnicería","Verdulería","Delivery"]},
    {"nombre": "Transporte",          "tipo": "Egreso",  "subs": ["Combustible","Peajes","Uber","Estacionamiento"]},
    {"nombre": "Salud",               "tipo": "Egreso",  "subs": ["Prepaga","Medicina","Farmacia","Consultas"]},
    {"nombre": "Esparcimiento",       "tipo": "Egreso",  "subs": ["Salidas","Cine","Viajes","Hobbies"]},
    {"nombre": "Hogar",               "tipo": "Egreso",  "subs": ["Alquiler","Mantenimiento"]},
    {"nombre": "Trabajo",             "tipo": "Ingreso", "subs": ["Honorarios","Comisiones","Sueldo"]},
    {"nombre": "Otros ingresos",      "tipo": "Ingreso", "subs": ["Reintegros","Regalos"]}
  ]';

BEGIN
  FOR u_id IN
    SELECT id FROM public.profiles WHERE onboarding_completado = true
  LOOP
    FOR cat IN SELECT value FROM jsonb_array_elements(cats) LOOP

      -- Buscar categoría padre existente (match por nombre insensible a mayúsculas)
      SELECT id INTO existing_id
        FROM public.categorias
       WHERE user_id          = u_id
         AND lower(nombre)    = lower(cat->>'nombre')
         AND tipo             = cat->>'tipo'
         AND parent_id IS NULL
       LIMIT 1;

      IF existing_id IS NULL THEN
        INSERT INTO public.categorias (user_id, nombre, tipo)
        VALUES (u_id, cat->>'nombre', cat->>'tipo')
        RETURNING id INTO parent_id;
      ELSE
        parent_id := existing_id;
      END IF;

      -- Insertar subcategorías que no existan bajo este padre
      FOR sub IN SELECT jsonb_array_elements_text(cat->'subs') LOOP
        IF NOT EXISTS (
          SELECT 1 FROM public.categorias
           WHERE user_id       = u_id
             AND lower(nombre) = lower(sub)
             AND parent_id     = parent_id
        ) THEN
          INSERT INTO public.categorias (user_id, nombre, tipo, parent_id)
          VALUES (u_id, sub, cat->>'tipo', parent_id);
        END IF;
      END LOOP;

    END LOOP;
  END LOOP;
END;
$$;
