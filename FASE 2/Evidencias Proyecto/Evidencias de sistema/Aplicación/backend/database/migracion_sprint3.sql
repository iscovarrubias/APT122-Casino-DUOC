ALTER TABLE usuario     ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE preparacion ADD COLUMN IF NOT EXISTS imagen_url VARCHAR(500);
DO $$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET timezone TO %L', current_database(), 'America/Santiago');
END $$;
