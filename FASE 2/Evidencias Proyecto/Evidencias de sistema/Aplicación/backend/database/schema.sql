CREATE TABLE concesionario (
    id_concesionario    SERIAL PRIMARY KEY,
    nombre              VARCHAR(150) NOT NULL,
    contacto_nombre     VARCHAR(150),
    contacto_email      VARCHAR(150),
    contacto_telefono   VARCHAR(50),
    observaciones       TEXT
);
COMMENT ON TABLE concesionario IS
    'Empresa externa que opera el casino (ej. Campomar Ltda.), confirmado por '
    'el jefe de carrera y por información pública de la empresa. El sistema '
    'de caja y los datos de venta son propiedad de esta entidad, no de DUOC.';

CREATE TABLE sede (
    id_sede             SERIAL PRIMARY KEY,
    nombre              VARCHAR(100) NOT NULL,
    id_concesionario    INT NOT NULL REFERENCES concesionario(id_concesionario),
    activa              BOOLEAN NOT NULL DEFAULT TRUE
);
COMMENT ON TABLE sede IS
    'Reservada para una eventual extensión multi-sede (fuera del alcance del '
    'MVP de este semestre, ver sección 6.3 del Documento de Alcance). El MVP '
    'opera con una sola fila: la sede Valparaíso.';

CREATE TABLE rol (
    id_rol              SERIAL PRIMARY KEY,
    nombre              VARCHAR(50) NOT NULL UNIQUE
    -- Valores esperados en el MVP: 'Estudiante', 'Personal Casino', 'Administrador'.
);

CREATE TABLE usuario (
    id_usuario          SERIAL PRIMARY KEY,
    nombre              VARCHAR(150) NOT NULL,
    email               VARCHAR(150) NOT NULL UNIQUE,
    password_hash       VARCHAR(255) NOT NULL,
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
COMMENT ON TABLE tipo_componente IS
    'No confundir con categoria_menu. categoria_menu clasifica la DIETA '
    '(Principal, JUNAEB, Vegetariano, Hipocalórico); tipo_componente '
    'clasifica la PARTE del combo (entrada, plato principal, postre, '
    'bebida). Un mismo combo del día tiene una categoria_menu y cuatro '
    'componentes, uno de cada tipo_componente.';

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
    creado_en           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_tipo_componente  INT REFERENCES tipo_componente(id_tipo_componente)
);
COMMENT ON TABLE preparacion IS
    'Catálogo maestro de platos que el casino puede ofrecer. No lleva fecha '
    'ni categoría: esos datos son de la planificación (ver menu_preparacion), '
    'porque una misma preparación puede repetirse en distintas fechas y '
    'hasta en distintas categorías del mismo día, tal como se observa en el '
    'afiche de Campomar.';

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
COMMENT ON TABLE preparacion_alergeno IS
    'Confirmado por la nutricionista: los alérgenos sí se declaran por '
    'preparación, a diferencia de la información nutricional completa, que '
    'hoy no existe documentada.';

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
COMMENT ON TABLE informacion_nutricional IS
    'Todos los campos numéricos son NULL por defecto y "validado" parte en '
    'FALSE: la nutricionista confirmó que hoy no existe información '
    'nutricional completa documentada por preparación. La aplicación debe '
    'mostrar "no disponible" mientras validado = FALSE, y nunca completar '
    'estos campos con datos supuestos (regla de negocio explícita del '
    'proyecto, no solo una restricción técnica).';


CREATE TABLE menu (
    id_menu             SERIAL PRIMARY KEY,
    id_sede             INT NOT NULL REFERENCES sede(id_sede),
    fecha               DATE NOT NULL,
    publicado           BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id_sede, fecha)
);
COMMENT ON TABLE menu IS
    'Un registro por sede y por fecha. Representa el menú planificado de ese '
    'día, independiente de si luego cambia durante la jornada (ver bloque 5).';

CREATE TABLE menu_preparacion (
    id_menu_preparacion SERIAL PRIMARY KEY,
    id_menu             INT NOT NULL REFERENCES menu(id_menu) ON DELETE CASCADE,
    id_preparacion      INT NOT NULL REFERENCES preparacion(id_preparacion),
    id_categoria_menu   INT REFERENCES categoria_menu(id_categoria_menu),
    id_tipo_componente  INT NOT NULL REFERENCES tipo_componente(id_tipo_componente),
    cantidad_planificada INT NOT NULL CHECK (cantidad_planificada >= 0)
);
COMMENT ON TABLE menu_preparacion IS
    'Entidad central de la planificación. id_categoria_menu es NULABLE a '
    'propósito: el plato principal SÍ varía por categoría (Principal, '
    'JUNAEB, Vegetariano, Hipocalórico), pero la entrada, el postre y la '
    'bebida son compartidos para todas las categorías del mismo día, y se '
    'guardan con id_categoria_menu en NULL para no duplicar la misma fila '
    'cuatro veces. El combo completo que ve un estudiante de una categoría '
    'se arma juntando su plato principal (id_categoria_menu = esa '
    'categoría) con los componentes compartidos del mismo id_menu '
    '(id_categoria_menu IS NULL). Es el dato PLANIFICADO; el estado real '
    'durante la jornada se registra por separado en disponibilidad '
    '(bloque 5), porque una publicación previa del menú no necesariamente '
    'representa lo que estará disponible después (Entrevista 01, punto 8). '
    'La información nutricional, de ingredientes y de alérgenos vive en '
    'preparacion (bloque 3), no aquí: así un mismo jugo o una misma '
    'ensalada que se repite en distintos días no necesita volver a '
    'documentarse cada vez.';

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
COMMENT ON TABLE disponibilidad IS
    'Registro histórico (append-only) de cambios de estado. El estado '
    '"actual" de una preparación es el de mayor registrado_en para ese '
    'id_menu_preparacion; no se hace UPDATE sobre filas existentes, para no '
    'perder el historial de cambios durante la jornada.';


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
COMMENT ON TABLE venta IS
    'Tabla de análisis, no de operación diaria. Se llena con datos simulados '
    '(origen_dato = simulado) mientras no se confirme el escenario A o B con '
    'Campomar/administración de sede. El resto del sistema (menú, '
    'disponibilidad, consulta estudiantil) no depende de esta tabla.';


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
