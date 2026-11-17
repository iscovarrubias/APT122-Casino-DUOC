BEGIN;

ALTER TABLE menu_preparacion
    ADD COLUMN IF NOT EXISTS precio NUMERIC(8,0) CHECK (precio >= 0);

UPDATE menu_preparacion mp SET precio = p.precio
FROM preparacion p
WHERE p.id_preparacion = mp.id_preparacion AND mp.id_categoria_menu IS NOT NULL AND mp.precio IS NULL;
ALTER TABLE preparacion ALTER COLUMN precio SET DEFAULT 0;

UPDATE informacion_nutricional SET validado = TRUE WHERE validado = FALSE;
ALTER TABLE informacion_nutricional ALTER COLUMN validado SET DEFAULT TRUE;

ALTER TABLE ingrediente DROP COLUMN IF EXISTS fuente_nutricional;
ALTER TABLE ingrediente DROP COLUMN IF EXISTS dato_de_ejemplo;

COMMIT;
