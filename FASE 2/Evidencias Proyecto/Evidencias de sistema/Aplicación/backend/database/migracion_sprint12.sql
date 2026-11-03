BEGIN;

CREATE TABLE IF NOT EXISTS ticket_acceso (
  id VARCHAR(64) PRIMARY KEY,
  sesion JSONB NOT NULL,
  expira_en TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ticket_acceso_expira ON ticket_acceso (expira_en);

COMMIT;
