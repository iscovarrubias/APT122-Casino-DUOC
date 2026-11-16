BEGIN;

ALTER TABLE venta_combo
  ADD COLUMN IF NOT EXISTS tipo_venta VARCHAR(20) NOT NULL DEFAULT 'combo'
    CHECK (tipo_venta IN ('combo', 'solo_plato', 'completo_maquina'));

COMMIT;
