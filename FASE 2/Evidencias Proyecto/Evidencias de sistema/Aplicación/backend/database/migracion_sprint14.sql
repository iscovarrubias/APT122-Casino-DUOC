BEGIN;

ALTER TABLE usuario
  ADD COLUMN IF NOT EXISTS tema_preferido VARCHAR(10) NOT NULL DEFAULT 'claro'
    CHECK (tema_preferido IN ('claro', 'oscuro'));

COMMIT;