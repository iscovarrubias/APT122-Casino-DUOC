BEGIN;

CREATE INDEX IF NOT EXISTS idx_menu_preparacion_menu ON menu_preparacion (id_menu);
CREATE INDEX IF NOT EXISTS idx_menu_preparacion_preparacion ON menu_preparacion (id_preparacion);

COMMIT;
