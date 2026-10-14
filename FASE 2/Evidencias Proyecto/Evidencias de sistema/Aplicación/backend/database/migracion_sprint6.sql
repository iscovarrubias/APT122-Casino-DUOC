BEGIN;

INSERT INTO rol (nombre) VALUES ('Cajero'), ('Nutricionista') ON CONFLICT (nombre) DO NOTHING;

ALTER TABLE informacion_nutricional
    ADD COLUMN IF NOT EXISTS validado_por INT REFERENCES usuario(id_usuario);

CREATE TABLE IF NOT EXISTS jornada (
    id_jornada        SERIAL PRIMARY KEY,
    id_menu           INT NOT NULL UNIQUE REFERENCES menu(id_menu),
    estado            VARCHAR(10) NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta', 'cerrada')),
    iniciada_en       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    iniciada_por      INT REFERENCES usuario(id_usuario),
    cerrada_en        TIMESTAMP,
    cerrada_por       INT REFERENCES usuario(id_usuario),
    cierre_automatico BOOLEAN NOT NULL DEFAULT FALSE, 
    sobrante_contado  BOOLEAN NOT NULL DEFAULT FALSE  
);

CREATE TABLE IF NOT EXISTS venta_combo (
    id_venta_combo    SERIAL PRIMARY KEY,
    id_jornada        INT NOT NULL REFERENCES jornada(id_jornada),
    id_categoria_menu INT NOT NULL REFERENCES categoria_menu(id_categoria_menu),
    registrada_en     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_usuario        INT REFERENCES usuario(id_usuario),
    anulada           BOOLEAN NOT NULL DEFAULT FALSE,
    anulada_en        TIMESTAMP,
    anulada_por       INT REFERENCES usuario(id_usuario)
);

CREATE TABLE IF NOT EXISTS movimiento_stock (
    id_movimiento       BIGSERIAL PRIMARY KEY,
    id_menu_preparacion INT NOT NULL REFERENCES menu_preparacion(id_menu_preparacion),
    tipo                VARCHAR(12) NOT NULL CHECK (tipo IN ('inicio','venta','anulacion','reposicion','ajuste','cierre')),
    delta               INT NOT NULL CHECK (delta <> 0),
    registrado_en       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_usuario          INT REFERENCES usuario(id_usuario),
    id_venta_combo      INT REFERENCES venta_combo(id_venta_combo),
    observacion         VARCHAR(200)
);
CREATE INDEX IF NOT EXISTS idx_mov_stock_mp ON movimiento_stock (id_menu_preparacion, registrado_en);
CREATE INDEX IF NOT EXISTS idx_mov_stock_combo ON movimiento_stock (id_venta_combo);
CREATE INDEX IF NOT EXISTS idx_venta_combo_jornada ON venta_combo (id_jornada);

CREATE OR REPLACE VIEW venta_efectiva AS
SELECT id_menu_preparacion, cantidad, fecha_hora, origen_dato FROM venta
UNION ALL
SELECT m.id_menu_preparacion, -m.delta, m.registrado_en, 'registrado'::varchar(20)
FROM movimiento_stock m
JOIN venta_combo v ON v.id_venta_combo = m.id_venta_combo
WHERE m.tipo = 'venta' AND NOT v.anulada;

COMMIT;
