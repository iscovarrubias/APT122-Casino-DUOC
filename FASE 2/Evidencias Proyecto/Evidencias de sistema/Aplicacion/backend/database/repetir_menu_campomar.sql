-- repetir_menu_campomar.sql
-- Copia el menú Campomar ya cargado (lunes a viernes de la semana v_origen)
-- a las próximas v_semanas semanas, publicado y con disponibilidad "disponible".
--
-- Seguro de volver a correr:
--   * Si un día destino ya tiene una jornada iniciada (alguien probó la caja), se omite.
--   * Si un día destino ya tiene menú sin jornada, se reemplaza por el de Campomar.
--   * Todo va en una transacción: si algo falla, no queda nada a medias.

BEGIN;

DO $$
DECLARE
    v_origen  DATE := DATE '2026-11-16';  -- lunes de la semana Campomar que ya está cargada
    v_semanas INT  := 4;                  -- cuántas semanas hacia adelante (4 = hasta el 18/12)
    v_sede    INT;
    v_src     INT;
    v_dst     INT;
    v_fecha   DATE;
BEGIN
    SELECT id_sede INTO v_sede FROM sede ORDER BY id_sede LIMIT 1;

    FOR s IN 1..v_semanas LOOP
        FOR d IN 0..4 LOOP
            v_fecha := v_origen + (s * 7) + d;

            SELECT id_menu INTO v_src FROM menu WHERE id_sede = v_sede AND fecha = v_origen + d;
            IF v_src IS NULL OR NOT EXISTS (SELECT 1 FROM menu_preparacion WHERE id_menu = v_src) THEN
                RAISE EXCEPTION 'No hay menú de origen para el %. Revisa v_origen.', v_origen + d;
            END IF;

            SELECT id_menu INTO v_dst FROM menu WHERE id_sede = v_sede AND fecha = v_fecha;

            IF v_dst IS NOT NULL THEN
                IF EXISTS (SELECT 1 FROM jornada WHERE id_menu = v_dst) THEN
                    RAISE NOTICE 'Se omite el % (ya tiene una jornada iniciada).', v_fecha;
                    CONTINUE;
                END IF;
                DELETE FROM menu_preparacion WHERE id_menu = v_dst;  -- disponibilidad se borra en cascada
                UPDATE menu SET publicado = TRUE WHERE id_menu = v_dst;
            ELSE
                INSERT INTO menu (id_sede, fecha, publicado)
                VALUES (v_sede, v_fecha, TRUE)
                RETURNING id_menu INTO v_dst;
            END IF;

            INSERT INTO menu_preparacion
                (id_menu, id_preparacion, id_categoria_menu, id_tipo_componente, cantidad_planificada, precio)
            SELECT v_dst, id_preparacion, id_categoria_menu, id_tipo_componente, cantidad_planificada, precio
            FROM menu_preparacion
            WHERE id_menu = v_src;

            INSERT INTO disponibilidad (id_menu_preparacion, estado)
            SELECT id_menu_preparacion, 'disponible'
            FROM menu_preparacion
            WHERE id_menu = v_dst;

            RAISE NOTICE 'Cargado el % (copia del %).', v_fecha, v_origen + d;
        END LOOP;
    END LOOP;
END $$;

COMMIT;

-- Verificación: debería mostrar del 16/11 al 18/12, días hábiles, publicados y con componentes.
SELECT m.fecha,
       to_char(m.fecha, 'TMDay') AS dia,
       m.publicado,
       COUNT(mp.id_menu_preparacion) AS componentes
FROM menu m
LEFT JOIN menu_preparacion mp ON mp.id_menu = m.id_menu
WHERE m.fecha BETWEEN DATE '2026-11-16' AND DATE '2026-12-18'
GROUP BY m.fecha, m.publicado
ORDER BY m.fecha;
