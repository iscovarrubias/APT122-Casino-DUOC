BEGIN;

CREATE TABLE IF NOT EXISTS opinion_registro (
    id_opinion      SERIAL PRIMARY KEY,
    id_usuario      INT REFERENCES usuario(id_usuario) ON DELETE SET NULL,
    autor_nombre    VARCHAR(150),
    id_preparacion  INT NOT NULL REFERENCES preparacion(id_preparacion) ON DELETE CASCADE,
    categoria       VARCHAR(50),
    fecha_menu      DATE,
    estrellas       SMALLINT NOT NULL CHECK (estrellas BETWEEN 1 AND 5),
    comentario      VARCHAR(300),
    estado          VARCHAR(10) NOT NULL DEFAULT 'vigente' CHECK (estado IN ('vigente', 'editada', 'eliminada')),
    creado_en       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cerrada_en      TIMESTAMP
);
COMMENT ON TABLE opinion_registro IS
    'Historial append-only de opiniones. Una opinión editada queda como "editada" y se crea una nueva "vigente"; '
    'una opinión que el estudiante elimina queda como "eliminada" (no se borra). categoria y fecha_menu indican de qué menú era.';

CREATE INDEX IF NOT EXISTS idx_opinion_registro_prep ON opinion_registro (id_preparacion);
CREATE INDEX IF NOT EXISTS idx_opinion_registro_fecha ON opinion_registro (creado_en);
CREATE UNIQUE INDEX IF NOT EXISTS ux_opinion_registro_vigente
    ON opinion_registro (id_usuario, id_preparacion) WHERE estado = 'vigente';

INSERT INTO opinion_registro (id_usuario, autor_nombre, id_preparacion, estrellas, comentario, estado, creado_en)
SELECT c.id_usuario, u.nombre, c.id_preparacion, c.estrellas, c.comentario, 'vigente', c.actualizado_en
FROM calificacion c
JOIN usuario u ON u.id_usuario = c.id_usuario
WHERE NOT EXISTS (
    SELECT 1 FROM opinion_registro o
    WHERE o.id_usuario = c.id_usuario AND o.id_preparacion = c.id_preparacion AND o.estado = 'vigente'
);

COMMIT;
