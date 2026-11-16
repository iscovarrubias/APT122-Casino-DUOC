BEGIN;

CREATE TABLE IF NOT EXISTS imagen (
    id_imagen   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_mime   VARCHAR(20) NOT NULL CHECK (tipo_mime IN ('image/jpeg', 'image/png', 'image/webp', 'image/gif')),
    datos       BYTEA NOT NULL,
    tamano      INT NOT NULL CHECK (tamano > 0),
    creado_en   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE imagen IS
    'Fotos de preparaciones guardadas en la base (sobreviven a recrear contenedores y entran en el respaldo). '
    'preparacion.imagen_url guarda la ruta relativa /api/imagenes/<id_imagen>. Las que quedan sin referencia '
    'por más de un día se eliminan al subir una nueva.';

CREATE INDEX IF NOT EXISTS idx_imagen_creado ON imagen (creado_en);

COMMIT;
