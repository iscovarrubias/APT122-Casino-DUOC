BEGIN;

CREATE TABLE IF NOT EXISTS preferencia_alergeno (
    id_usuario  INT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    id_alergeno INT NOT NULL REFERENCES alergeno(id_alergeno) ON DELETE CASCADE,
    PRIMARY KEY (id_usuario, id_alergeno)
);

CREATE TABLE IF NOT EXISTS favorito (
    id_usuario     INT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    id_preparacion INT NOT NULL REFERENCES preparacion(id_preparacion) ON DELETE CASCADE,
    creado_en      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_usuario, id_preparacion)
);

CREATE TABLE IF NOT EXISTS calificacion (
    id_calificacion SERIAL PRIMARY KEY,
    id_usuario      INT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    id_preparacion  INT NOT NULL REFERENCES preparacion(id_preparacion) ON DELETE CASCADE,
    estrellas       SMALLINT NOT NULL CHECK (estrellas BETWEEN 1 AND 5),
    comentario      VARCHAR(300),
    creado_en       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id_usuario, id_preparacion)
);
CREATE INDEX IF NOT EXISTS idx_calificacion_preparacion ON calificacion (id_preparacion);

COMMIT;
