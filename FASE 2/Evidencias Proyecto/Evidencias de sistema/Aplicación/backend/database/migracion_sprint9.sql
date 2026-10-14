BEGIN;

ALTER TABLE usuario
  ADD COLUMN IF NOT EXISTS id_categoria_preferida INT REFERENCES categoria_menu(id_categoria_menu);

COMMIT;