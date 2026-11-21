CREATE TABLE IF NOT EXISTS preferencia_correo (
    id_usuario        INT PRIMARY KEY REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    menu_semanal      BOOLEAN NOT NULL DEFAULT FALSE,
    avisos_favoritos  BOOLEAN NOT NULL DEFAULT FALSE,
    token_baja        UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    actualizado_en    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS correo_enviado (
    id_correo   SERIAL PRIMARY KEY,
    id_usuario  INT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    tipo        VARCHAR(20) NOT NULL CHECK (tipo IN ('semanal', 'favoritos_semana', 'favorito_dia')),
    clave       VARCHAR(20) NOT NULL,
    asunto      VARCHAR(200) NOT NULL,
    modo        VARCHAR(10) NOT NULL,
    enviado_en  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id_usuario, tipo, clave)
);

CREATE INDEX IF NOT EXISTS idx_correo_enviado_clave ON correo_enviado (tipo, clave);
