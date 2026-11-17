BEGIN;

DELETE FROM composicion_combo
WHERE id_categoria_menu = (SELECT id_categoria_menu FROM categoria_menu WHERE nombre = 'Vegetariano')
  AND id_tipo_componente = (SELECT id_tipo_componente FROM tipo_componente WHERE nombre = 'Fruta');

UPDATE composicion_combo SET grupo_opcion = NULL
WHERE id_categoria_menu = (SELECT id_categoria_menu FROM categoria_menu WHERE nombre = 'Vegetariano')
  AND id_tipo_componente = (SELECT id_tipo_componente FROM tipo_componente WHERE nombre = 'Postre');

COMMIT;