-- =============================================================================
-- PROYECTO APT122 · Plataforma de Gestión y Análisis de la Oferta Gastronómica
--                    del Casino DUOC UC (sede Valparaíso)
-- =============================================================================
-- Este script traduce a SQL el modelo de datos preliminar del Documento de
-- Alcance del Proyecto, sección 8, ya validado con:
--   - Entrevista 01 con la encargada del casino.
--   - Encuesta a 31 estudiantes.
--   - Entrevista con Silvia Aguilera (nutricionista y administradora del casino).
--   - Afiche oficial de planificación mensual de Campomar Ltda.
--
-- Cada bloque de tablas incluye un comentario explicando en qué hallazgo
-- confirmado se basa la decisión de diseño, para que quede trazable como
-- evidencia de C3 (justificación de decisiones de modelo de datos).
-- =============================================================================


-- =============================================================================
-- BLOQUE 1: CATÁLOGOS Y CONTEXTO INSTITUCIONAL
-- =============================================================================
-- Decisión de diseño clave: el concesionario (Campomar) y la sede se modelan
-- como DATOS, no como reglas fijas del sistema. Esto responde directamente a
-- la sección 6.3 del Documento de Alcance: el proyecto no debe asumir
-- "Campomar" como una regla hardcodeada, para no cerrar la puerta a que en
-- el futuro (fuera del alcance de este semestre) el sistema pueda adaptarse
-- a otra sede u otro concesionario sin rediseñar el modelo.
-- =============================================================================

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
-- Campo agregado en Sprint 1 (HU-15): no estaba en el modelo original del
-- Documento de Alcance porque el login se definio recien al escribir el
-- backlog. Se documenta aqui el cambio para que quede trazable.


-- =============================================================================
-- BLOQUE 2: CATÁLOGOS DEL MENÚ
-- =============================================================================
-- La categoría de menú (Principal, JUNAEB, Vegetariano, Hipocalórico) está
-- confirmada por el afiche oficial de Campomar "Planifica tu Almuerzo". Se
-- modela como catálogo propio y no como texto libre, porque el afiche muestra
-- que una misma sede ofrece varias categorías simultáneas por día.
--
-- El catálogo de alérgenos está confirmado directamente por la nutricionista:
-- gluten, lácteos, frutos secos, mariscos, huevo y soya.
-- =============================================================================

CREATE TABLE categoria_menu (
    id_categoria_menu   SERIAL PRIMARY KEY,
    nombre              VARCHAR(50) NOT NULL UNIQUE
    -- Valores confirmados por el afiche de Campomar (sept. 2026):
    -- 'Principal', 'JUNAEB', 'Vegetariano', 'Hipocalórico'.
);

CREATE TABLE tipo_componente (
    id_tipo_componente  SERIAL PRIMARY KEY,
    nombre              VARCHAR(50) NOT NULL UNIQUE
    -- Valores: 'Entrada', 'Plato Principal', 'Postre', 'Bebida'.
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
    -- Catálogo confirmado por la nutricionista: 'Gluten', 'Lácteos',
    -- 'Frutos secos', 'Mariscos', 'Huevo', 'Soya'.
);

CREATE TABLE ingrediente (
    id_ingrediente      SERIAL PRIMARY KEY,
    nombre              VARCHAR(100) NOT NULL UNIQUE
);


-- =============================================================================
-- BLOQUE 3: PREPARACIONES Y SUS RELACIONES
-- =============================================================================

CREATE TABLE preparacion (
    id_preparacion      SERIAL PRIMARY KEY,
    nombre              VARCHAR(150) NOT NULL,
    descripcion         TEXT,
    precio              NUMERIC(8,0) NOT NULL CHECK (precio >= 0),
    activa              BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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


-- =============================================================================
-- BLOQUE 4: PLANIFICACIÓN DEL MENÚ (la "minuta")
-- =============================================================================
-- Confirmado por la nutricionista: la minuta se define mensualmente, lo que
-- coincide con el afiche de Campomar (planificación de septiembre completa).
-- =============================================================================

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

-- Un plato principal por categoría y por día.
CREATE UNIQUE INDEX ux_menu_prep_por_categoria
    ON menu_preparacion (id_menu, id_categoria_menu, id_tipo_componente)
    WHERE id_categoria_menu IS NOT NULL;

-- Un componente compartido (entrada/postre/bebida) por día, no por categoría.
CREATE UNIQUE INDEX ux_menu_prep_compartido
    ON menu_preparacion (id_menu, id_tipo_componente)
    WHERE id_categoria_menu IS NULL;


-- =============================================================================
-- BLOQUE 5: DISPONIBILIDAD REAL (ejecución del día)
-- =============================================================================
-- Esta es la decisión de diseño más importante del modelo, y está confirmada
-- textualmente por la Entrevista 01, punto 8: "el menú que se planifica
-- inicialmente puede cambiar el mismo día, por lo que una publicación previa
-- del menú no necesariamente representa exactamente lo que estará disponible
-- posteriormente". Por eso disponibilidad es una tabla de eventos (log
-- histórico, append-only), no un simple campo de estado sobre menu_preparacion:
-- así se conserva el historial de cambios de disponibilidad durante el día,
-- en vez de perder esa información cada vez que se actualiza.
-- =============================================================================

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


-- =============================================================================
-- BLOQUE 6: VENTAS (componente de innovación, condicionado)
-- =============================================================================
-- El origen de estos datos depende del escenario que resulte viable, según
-- la sección 7 del Documento de Alcance. La columna origen_dato deja esa
-- decisión explícita en el propio dato, en vez de asumir un único escenario:
--   - 'real'      -> Escenario A: integración directa con el sistema de caja
--                    de Campomar (requiere autorización institucional).
--   - 'importado' -> Escenario B: carga desde archivo exportado por Campomar.
--   - 'simulado'  -> Escenario C: datos de prueba generados por el equipo.
--                    Es el escenario base mientras no se resuelvan A o B.
-- =============================================================================

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


-- =============================================================================
-- DATOS DE CATÁLOGO INICIALES (seed)
-- =============================================================================
-- Solo catálogos confirmados por las entrevistas; no se insertan preparaciones
-- ni menús reales aquí, eso corresponde a la carga de datos de Fase 2.
-- =============================================================================

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
