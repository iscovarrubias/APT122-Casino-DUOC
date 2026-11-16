BEGIN;

INSERT INTO menu_preparacion (id_menu, id_preparacion, id_categoria_menu, id_tipo_componente, cantidad_planificada)
SELECT m.id_menu, p.id_preparacion, c.id_categoria_menu, t.id_tipo_componente,
       COALESCE((
         SELECT x.cantidad_planificada FROM menu_preparacion x
         WHERE x.id_menu = m.id_menu AND x.id_categoria_menu = c.id_categoria_menu
           AND x.id_tipo_componente = tp.id_tipo_componente
         LIMIT 1
       ), 30)
FROM menu m
CROSS JOIN categoria_menu c
JOIN tipo_componente t ON t.nombre = 'Bebida'
JOIN tipo_componente tp ON tp.nombre = 'Plato Principal'
JOIN (SELECT MIN(id_preparacion) AS id_preparacion FROM preparacion WHERE nombre = 'Agua mineral') p
  ON p.id_preparacion IS NOT NULL
WHERE c.nombre IN ('JUNAEB', 'Hipocalórico')
  AND EXISTS (
    SELECT 1 FROM menu_preparacion y
    WHERE y.id_menu = m.id_menu AND y.id_categoria_menu = c.id_categoria_menu
      AND y.id_tipo_componente = tp.id_tipo_componente
  )
  AND NOT EXISTS (
    SELECT 1 FROM menu_preparacion z
    WHERE z.id_menu = m.id_menu AND z.id_categoria_menu = c.id_categoria_menu
      AND z.id_tipo_componente = t.id_tipo_componente
  );

COMMIT;