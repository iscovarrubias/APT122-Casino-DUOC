CREATE TABLE concesionario (
    id_concesionario    SERIAL PRIMARY KEY,
    nombre              VARCHAR(150) NOT NULL,
    contacto_nombre     VARCHAR(150),
    contacto_email      VARCHAR(150),
    contacto_telefono   VARCHAR(50),
    observaciones       TEXT
);

CREATE TABLE sede (
    id_sede             SERIAL PRIMARY KEY,
    nombre              VARCHAR(100) NOT NULL,
    id_concesionario    INT NOT NULL REFERENCES concesionario(id_concesionario),
    activa              BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE rol (
    id_rol              SERIAL PRIMARY KEY,
    nombre              VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE usuario (
    id_usuario          SERIAL PRIMARY KEY,
    nombre              VARCHAR(150) NOT NULL,
    email               VARCHAR(150) NOT NULL UNIQUE,
    id_rol              INT NOT NULL REFERENCES rol(id_rol),
    id_sede             INT NOT NULL REFERENCES sede(id_sede),
    creado_en           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categoria_menu (
    id_categoria_menu   SERIAL PRIMARY KEY,
    nombre              VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE tipo_componente (
    id_tipo_componente  SERIAL PRIMARY KEY,
    nombre              VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE alergeno (
    id_alergeno         SERIAL PRIMARY KEY,
    nombre              VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE ingrediente (
    id_ingrediente      SERIAL PRIMARY KEY,
    nombre              VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE preparacion (
    id_preparacion      SERIAL PRIMARY KEY,
    nombre              VARCHAR(150) NOT NULL,
    descripcion         TEXT,
    precio              NUMERIC(8,0) NOT NULL CHECK (precio >= 0),
    activa              BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE preparacion_ingrediente (
    id_preparacion      INT NOT NULL REFERENCES preparacion(id_preparacion) ON DELETE CASCADE,
    id_ingrediente      INT NOT NULL REFERENCES ingrediente(id_ingrediente) ON DELETE RESTRICT,
    PRIMARY KEY (id_preparacion, id_ingrediente)
);

CREATE TABLE preparacion_alergeno (
    id_preparacion      INT NOT NULL REFERENCES preparacion(id_preparacion) ON DELETE CASCADE,
    id_alergeno         INT NOT NULL REFERENCES alergeno(id_alergeno) ON DELETE RESTRICT,
    PRIMARY KEY (id_preparacion, id_alergeno)
);

CREATE TABLE informacion_nutricional (
    id_preparacion      INT PRIMARY KEY REFERENCES preparacion(id_preparacion) ON DELETE CASCADE,
    calorias            NUMERIC(6,1),
    proteinas_g         NUMERIC(6,1),
    carbohidratos_g     NUMERIC(6,1),
    grasas_g            NUMERIC(6,1),
    validado            BOOLEAN NOT NULL DEFAULT FALSE,
    fuente              VARCHAR(200),
    actualizado_en      TIMESTAMP
);

CREATE TABLE menu (
    id_menu             SERIAL PRIMARY KEY,
    id_sede             INT NOT NULL REFERENCES sede(id_sede),
    fecha               DATE NOT NULL,
    publicado           BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id_sede, fecha)
);

CREATE TABLE menu_preparacion (
    id_menu_preparacion SERIAL PRIMARY KEY,
    id_menu             INT NOT NULL REFERENCES menu(id_menu) ON DELETE CASCADE,
    id_preparacion      INT NOT NULL REFERENCES preparacion(id_preparacion),
    id_categoria_menu   INT REFERENCES categoria_menu(id_categoria_menu),
    id_tipo_componente  INT NOT NULL REFERENCES tipo_componente(id_tipo_componente),
    cantidad_planificada INT NOT NULL CHECK (cantidad_planificada >= 0)
);

CREATE UNIQUE INDEX ux_menu_prep_por_categoria
    ON menu_preparacion (id_menu, id_categoria_menu, id_tipo_componente)
    WHERE id_categoria_menu IS NOT NULL;

CREATE UNIQUE INDEX ux_menu_prep_compartido
    ON menu_preparacion (id_menu, id_tipo_componente)
    WHERE id_categoria_menu IS NULL;

CREATE TABLE disponibilidad (
    id_disponibilidad   SERIAL PRIMARY KEY,
    id_menu_preparacion INT NOT NULL REFERENCES menu_preparacion(id_menu_preparacion) ON DELETE CASCADE,
    estado              VARCHAR(20) NOT NULL
        CHECK (estado IN ('disponible', 'baja_disponibilidad', 'agotado')),
    registrado_en       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_usuario          INT REFERENCES usuario(id_usuario),
    observacion         VARCHAR(200)
);
CREATE INDEX idx_disponibilidad_actual
    ON disponibilidad (id_menu_preparacion, registrado_en DESC);

CREATE TABLE venta (
    id_venta            SERIAL PRIMARY KEY,
    id_menu_preparacion INT NOT NULL REFERENCES menu_preparacion(id_menu_preparacion),
    cantidad            INT NOT NULL CHECK (cantidad > 0),
    fecha_hora          TIMESTAMP NOT NULL,
    origen_dato         VARCHAR(20) NOT NULL DEFAULT 'simulado'
        CHECK (origen_dato IN ('real', 'importado', 'simulado')),
    cargado_en          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_venta_fecha ON venta (fecha_hora);
CREATE INDEX idx_venta_menu_preparacion ON venta (id_menu_preparacion);

INSERT INTO concesionario (nombre) VALUES ('Campomar Ltda.');

INSERT INTO sede (nombre, id_concesionario)
    VALUES ('Valparaíso', (SELECT id_concesionario FROM concesionario WHERE nombre = 'Campomar Ltda.'));

INSERT INTO rol (nombre) VALUES ('Estudiante'), ('Personal Casino'), ('Administrador');

INSERT INTO categoria_menu (nombre) VALUES
    ('Principal'), ('JUNAEB'), ('Vegetariano'), ('Hipocalórico');

INSERT INTO tipo_componente (nombre) VALUES
    ('Entrada'), ('Plato Principal'), ('Postre'), ('Bebida');

INSERT INTO alergeno (nombre) VALUES
    ('Gluten'), ('Lácteos'), ('Frutos secos'), ('Mariscos'), ('Huevo'), ('Soya');
