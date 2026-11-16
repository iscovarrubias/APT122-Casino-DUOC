BEGIN;

INSERT INTO composicion_combo (id_categoria_menu, id_tipo_componente, grupo_opcion)
SELECT c.id_categoria_menu, t.id_tipo_componente, 1
FROM categoria_menu c, tipo_componente t
WHERE c.nombre = 'Vegetariano' AND t.nombre = 'Fruta'
ON CONFLICT (id_categoria_menu, id_tipo_componente) DO UPDATE SET grupo_opcion = 1;

UPDATE composicion_combo SET grupo_opcion = 1
WHERE id_categoria_menu = (SELECT id_categoria_menu FROM categoria_menu WHERE nombre = 'Vegetariano')
  AND id_tipo_componente = (SELECT id_tipo_componente FROM tipo_componente WHERE nombre = 'Postre');

ALTER TABLE movimiento_stock DROP CONSTRAINT IF EXISTS movimiento_stock_tipo_check;
ALTER TABLE movimiento_stock
  ADD CONSTRAINT movimiento_stock_tipo_check
  CHECK (tipo IN ('inicio','venta','anulacion','reposicion','ajuste','cierre','correccion'));

COMMIT;
