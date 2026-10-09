ALTER TABLE preparacion
  ADD COLUMN IF NOT EXISTS id_tipo_componente INT REFERENCES tipo_componente(id_tipo_componente);

CREATE INDEX IF NOT EXISTS idx_preparacion_tipo
  ON preparacion (id_tipo_componente);