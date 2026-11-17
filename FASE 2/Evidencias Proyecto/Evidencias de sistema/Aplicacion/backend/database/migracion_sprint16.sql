BEGIN;
INSERT INTO tipo_componente (nombre) VALUES
  ('Ensalada'), ('Sopa'), ('Pan'), ('Fruta')
ON CONFLICT (nombre) DO NOTHING;
UPDATE preparacion p
SET id_tipo_componente = (SELECT id_tipo_componente FROM tipo_componente WHERE nombre = 'Ensalada')
WHERE p.id_tipo_componente = (SELECT id_tipo_componente FROM tipo_componente WHERE nombre = 'Entrada')
  AND p.nombre ILIKE '%ensalada%';

UPDATE preparacion p
SET id_tipo_componente = (SELECT id_tipo_componente FROM tipo_componente WHERE nombre = 'Sopa')
WHERE p.id_tipo_componente = (SELECT id_tipo_componente FROM tipo_componente WHERE nombre = 'Entrada')
  AND (p.nombre ILIKE '%sopa%' OR p.nombre ILIKE '%consomé%' OR p.nombre ILIKE '%crema de%');

CREATE TABLE IF NOT EXISTS composicion_combo (
    id_categoria_menu  INT NOT NULL REFERENCES categoria_menu(id_categoria_menu) ON DELETE CASCADE,
    id_tipo_componente INT NOT NULL REFERENCES tipo_componente(id_tipo_componente) ON DELETE CASCADE,
    grupo_opcion       SMALLINT NULL CHECK (grupo_opcion IS NULL OR grupo_opcion > 0),
    PRIMARY KEY (id_categoria_menu, id_tipo_componente)
);

COMMENT ON TABLE composicion_combo IS
    'Qué componentes incluye cada categoría de menú. Si dos tipos comparten el mismo '
    'grupo_opcion, son mutuamente excluyentes y el cajero debe elegir uno (ej. Postre o '
    'Fruta en General y Vegetariano). Con grupo_opcion = NULL, el tipo siempre está '
    'incluido (si ese día se cargó en menu_preparacion). Los tipos que no aparecen para '
    'una categoría no aplican: JUNAEB no tiene ensalada ni sopa ni postre/fruta; '
    'Hipocalórico no tiene postre ni pan.';

CREATE INDEX IF NOT EXISTS idx_composicion_tipo
    ON composicion_combo (id_tipo_componente);

INSERT INTO composicion_combo (id_categoria_menu, id_tipo_componente, grupo_opcion)
SELECT c.id_categoria_menu, t.id_tipo_componente, v.grupo
FROM (VALUES
  ('General',    'Ensalada', NULL),
  ('General',    'Sopa',     NULL),
  ('General',    'Pan',      NULL),
  ('General',    'Bebida',   NULL),
  ('General',    'Postre',   1),
  ('General',    'Fruta',    1),
  ('Vegetariano',  'Ensalada', NULL),
  ('Vegetariano',  'Sopa',     NULL),
  ('Vegetariano',  'Pan',      NULL),
  ('Vegetariano',  'Bebida',   NULL),
  ('Vegetariano',  'Postre',   1),
  ('Vegetariano',  'Fruta',    1),
  ('Hipocalórico', 'Ensalada', NULL),
  ('Hipocalórico', 'Sopa',     NULL),
  ('Hipocalórico', 'Fruta',    NULL),
  ('Hipocalórico', 'Bebida',   NULL),
  ('JUNAEB',       'Bebida',   NULL)
) AS v(categoria, tipo, grupo)
JOIN categoria_menu c ON c.nombre = v.categoria
JOIN tipo_componente t ON t.nombre = v.tipo
ON CONFLICT (id_categoria_menu, id_tipo_componente) DO NOTHING;
ALTER TABLE venta_combo
  ADD COLUMN IF NOT EXISTS id_tipo_opcion INT REFERENCES tipo_componente(id_tipo_componente);

COMMENT ON COLUMN venta_combo.id_tipo_opcion IS
    'Si la categoría tenía un grupo_opcion (ej. Postre vs Fruta), guarda el tipo elegido. '
    'NULL si la categoría no tiene opciones mutuamente excluyentes. Se llena también '
    'cuando solo había una opción disponible ese día (para conservar el dato en análisis).';

COMMIT;