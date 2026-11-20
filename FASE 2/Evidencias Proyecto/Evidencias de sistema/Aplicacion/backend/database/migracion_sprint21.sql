BEGIN;

ALTER TABLE preparacion
  ADD COLUMN IF NOT EXISTS id_preparacion_base INT REFERENCES preparacion(id_preparacion) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_preparacion_base ON preparacion (id_preparacion_base);

COMMIT;
