-- =============================================
-- 008_seed_categorias.sql — Precargar categorías con subcategorías
-- Ejecutar DESPUÉS de 007_movimientos_schema.sql
-- Idempotente: usa WHERE NOT EXISTS para no duplicar.
-- =============================================

DO $$
DECLARE
  v_user_id     uuid;
  v_parent_id   uuid;
  v_existing_id uuid;
  v_cat         jsonb;
  v_sub         text;

  v_cats jsonb := '[
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
  FOR v_user_id IN
    SELECT id FROM public.profiles WHERE onboarding_completado = true
  LOOP
    FOR v_cat IN SELECT value FROM jsonb_array_elements(v_cats) LOOP

      -- Buscar categoría padre existente (match por nombre insensible a mayúsculas)
      SELECT c.id INTO v_existing_id
        FROM public.categorias c
       WHERE c.user_id       = v_user_id
         AND lower(c.nombre) = lower(v_cat->>'nombre')
         AND c.tipo          = v_cat->>'tipo'
         AND c.parent_id     IS NULL
       LIMIT 1;

      IF v_existing_id IS NULL THEN
        INSERT INTO public.categorias (user_id, nombre, tipo)
        VALUES (v_user_id, v_cat->>'nombre', v_cat->>'tipo')
        RETURNING id INTO v_parent_id;
      ELSE
        v_parent_id := v_existing_id;
      END IF;

      -- Insertar subcategorías que no existan bajo este padre
      FOR v_sub IN SELECT jsonb_array_elements_text(v_cat->'subs') LOOP
        IF NOT EXISTS (
          SELECT 1 FROM public.categorias c
           WHERE c.user_id       = v_user_id
             AND lower(c.nombre) = lower(v_sub)
             AND c.parent_id     = v_parent_id
        ) THEN
          INSERT INTO public.categorias (user_id, nombre, tipo, parent_id)
          VALUES (v_user_id, v_sub, v_cat->>'tipo', v_parent_id);
        END IF;
      END LOOP;

    END LOOP;
  END LOOP;
END;
$$;
