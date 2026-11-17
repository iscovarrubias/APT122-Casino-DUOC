CREATE TABLE alergeno (
    id_alergeno NUMBER(10) NOT NULL,
    nombre VARCHAR2(50) NOT NULL,
    CONSTRAINT alergeno_pk PRIMARY KEY (id_alergeno)
);

CREATE TABLE calificacion (
    id_calificacion NUMBER(10) NOT NULL,
    id_usuario NUMBER(10) NOT NULL,
    id_preparacion NUMBER(10) NOT NULL,
    estrellas NUMBER(5) NOT NULL,
    comentario VARCHAR2(300),
    creado_en TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP NOT NULL,
    CONSTRAINT calificacion_pk PRIMARY KEY (id_calificacion)
);

CREATE TABLE categoria_ingrediente (
    id_categoria_ingrediente NUMBER(10) NOT NULL,
    nombre VARCHAR2(60) NOT NULL,
    CONSTRAINT categoria_ingrediente_pk PRIMARY KEY (id_categoria_ingrediente)
);

CREATE TABLE categoria_menu (
    id_categoria_menu NUMBER(10) NOT NULL,
    nombre VARCHAR2(50) NOT NULL,
    CONSTRAINT categoria_menu_pk PRIMARY KEY (id_categoria_menu)
);

CREATE TABLE composicion_combo (
    id_categoria_menu NUMBER(10) NOT NULL,
    id_tipo_componente NUMBER(10) NOT NULL,
    grupo_opcion NUMBER(5),
    CONSTRAINT composicion_combo_pk PRIMARY KEY (id_categoria_menu, id_tipo_componente)
);

CREATE TABLE concesionario (
    id_concesionario NUMBER(10) NOT NULL,
    nombre VARCHAR2(150) NOT NULL,
    contacto_nombre VARCHAR2(150),
    contacto_email VARCHAR2(150),
    contacto_telefono VARCHAR2(50),
    observaciones VARCHAR2(4000),
    CONSTRAINT concesionario_pk PRIMARY KEY (id_concesionario)
);

CREATE TABLE disponibilidad (
    id_disponibilidad NUMBER(10) NOT NULL,
    id_menu_preparacion NUMBER(10) NOT NULL,
    estado VARCHAR2(20) NOT NULL,
    registrado_en TIMESTAMP NOT NULL,
    id_usuario NUMBER(10),
    observacion VARCHAR2(200),
    CONSTRAINT disponibilidad_pk PRIMARY KEY (id_disponibilidad)
);

CREATE TABLE favorito (
    id_usuario NUMBER(10) NOT NULL,
    id_preparacion NUMBER(10) NOT NULL,
    creado_en TIMESTAMP NOT NULL,
    CONSTRAINT favorito_pk PRIMARY KEY (id_usuario, id_preparacion)
);

CREATE TABLE imagen (
    id_imagen VARCHAR2(36) NOT NULL,
    tipo_mime VARCHAR2(20) NOT NULL,
    datos BLOB NOT NULL,
    tamano NUMBER(10) NOT NULL,
    creado_en TIMESTAMP NOT NULL,
    CONSTRAINT imagen_pk PRIMARY KEY (id_imagen)
);

CREATE TABLE informacion_nutricional (
    id_preparacion NUMBER(10) NOT NULL,
    calorias NUMBER(6,1),
    proteinas_g NUMBER(6,1),
    carbohidratos_g NUMBER(6,1),
    grasas_g NUMBER(6,1),
    validado CHAR(1) NOT NULL,
    fuente VARCHAR2(200),
    actualizado_en TIMESTAMP,
    origen VARCHAR2(10) NOT NULL,
    calculado_en TIMESTAMP,
    validado_por NUMBER(10),
    CONSTRAINT informacion_nutricional_pk PRIMARY KEY (id_preparacion)
);

CREATE TABLE ingrediente (
    id_ingrediente NUMBER(10) NOT NULL,
    nombre VARCHAR2(100) NOT NULL,
    id_categoria_ingrediente NUMBER(10),
    calorias_100g NUMBER(6,1),
    proteinas_100g NUMBER(6,1),
    carbohidratos_100g NUMBER(6,1),
    grasas_100g NUMBER(6,1),
    sin_cuantificar CHAR(1) NOT NULL,
    CONSTRAINT ingrediente_pk PRIMARY KEY (id_ingrediente)
);

CREATE TABLE ingrediente_alergeno (
    id_ingrediente NUMBER(10) NOT NULL,
    id_alergeno NUMBER(10) NOT NULL,
    CONSTRAINT ingrediente_alergeno_pk PRIMARY KEY (id_ingrediente, id_alergeno)
);

CREATE TABLE jornada (
    id_jornada NUMBER(10) NOT NULL,
    id_menu NUMBER(10) NOT NULL,
    estado VARCHAR2(10) NOT NULL,
    iniciada_en TIMESTAMP NOT NULL,
    iniciada_por NUMBER(10),
    cerrada_en TIMESTAMP,
    cerrada_por NUMBER(10),
    cierre_automatico CHAR(1) NOT NULL,
    sobrante_contado CHAR(1) NOT NULL,
    CONSTRAINT jornada_pk PRIMARY KEY (id_jornada)
);

CREATE TABLE menu (
    id_menu NUMBER(10) NOT NULL,
    id_sede NUMBER(10) NOT NULL,
    fecha DATE NOT NULL,
    publicado CHAR(1) NOT NULL,
    creado_en TIMESTAMP NOT NULL,
    CONSTRAINT menu_pk PRIMARY KEY (id_menu)
);

CREATE TABLE menu_preparacion (
    id_menu_preparacion NUMBER(10) NOT NULL,
    id_menu NUMBER(10) NOT NULL,
    id_preparacion NUMBER(10) NOT NULL,
    id_categoria_menu NUMBER(10),
    id_tipo_componente NUMBER(10) NOT NULL,
    cantidad_planificada NUMBER(10) NOT NULL,
    precio NUMBER(8,0),
    CONSTRAINT menu_preparacion_pk PRIMARY KEY (id_menu_preparacion)
);

CREATE TABLE movimiento_stock (
    id_movimiento NUMBER(19) NOT NULL,
    id_menu_preparacion NUMBER(10) NOT NULL,
    tipo VARCHAR2(12) NOT NULL,
    delta NUMBER(10) NOT NULL,
    registrado_en TIMESTAMP NOT NULL,
    id_usuario NUMBER(10),
    id_venta_combo NUMBER(10),
    observacion VARCHAR2(200),
    CONSTRAINT movimiento_stock_pk PRIMARY KEY (id_movimiento)
);

CREATE TABLE opinion_registro (
    id_opinion NUMBER(10) NOT NULL,
    id_usuario NUMBER(10),
    autor_nombre VARCHAR2(150),
    id_preparacion NUMBER(10) NOT NULL,
    categoria VARCHAR2(50),
    fecha_menu DATE,
    estrellas NUMBER(5) NOT NULL,
    comentario VARCHAR2(300),
    estado VARCHAR2(10) NOT NULL,
    creado_en TIMESTAMP NOT NULL,
    cerrada_en TIMESTAMP,
    autor_correo VARCHAR2(150),
    CONSTRAINT opinion_registro_pk PRIMARY KEY (id_opinion)
);

CREATE TABLE preferencia_alergeno (
    id_usuario NUMBER(10) NOT NULL,
    id_alergeno NUMBER(10) NOT NULL,
    CONSTRAINT preferencia_alergeno_pk PRIMARY KEY (id_usuario, id_alergeno)
);

CREATE TABLE preparacion (
    id_preparacion NUMBER(10) NOT NULL,
    nombre VARCHAR2(150) NOT NULL,
    descripcion VARCHAR2(4000),
    precio NUMBER(8,0) NOT NULL,
    activa CHAR(1) NOT NULL,
    creado_en TIMESTAMP NOT NULL,
    id_tipo_componente NUMBER(10),
    imagen_url VARCHAR2(500),
    porciones_receta NUMBER(10),
    CONSTRAINT preparacion_pk PRIMARY KEY (id_preparacion)
);

CREATE TABLE preparacion_alergeno (
    id_preparacion NUMBER(10) NOT NULL,
    id_alergeno NUMBER(10) NOT NULL,
    CONSTRAINT preparacion_alergeno_pk PRIMARY KEY (id_preparacion, id_alergeno)
);

CREATE TABLE preparacion_ingrediente (
    id_preparacion NUMBER(10) NOT NULL,
    id_ingrediente NUMBER(10) NOT NULL,
    cantidad_g NUMBER(8,1),
    CONSTRAINT preparacion_ingrediente_pk PRIMARY KEY (id_preparacion, id_ingrediente)
);

CREATE TABLE rol (
    id_rol NUMBER(10) NOT NULL,
    nombre VARCHAR2(50) NOT NULL,
    CONSTRAINT rol_pk PRIMARY KEY (id_rol)
);

CREATE TABLE sede (
    id_sede NUMBER(10) NOT NULL,
    nombre VARCHAR2(100) NOT NULL,
    id_concesionario NUMBER(10) NOT NULL,
    activa CHAR(1) NOT NULL,
    CONSTRAINT sede_pk PRIMARY KEY (id_sede)
);

CREATE TABLE ticket_acceso (
    id VARCHAR2(64) NOT NULL,
    sesion CLOB NOT NULL,
    expira_en TIMESTAMP NOT NULL,
    CONSTRAINT ticket_acceso_pk PRIMARY KEY (id)
);

CREATE TABLE tipo_componente (
    id_tipo_componente NUMBER(10) NOT NULL,
    nombre VARCHAR2(50) NOT NULL,
    CONSTRAINT tipo_componente_pk PRIMARY KEY (id_tipo_componente)
);

CREATE TABLE usuario (
    id_usuario NUMBER(10) NOT NULL,
    nombre VARCHAR2(150) NOT NULL,
    email VARCHAR2(150) NOT NULL,
    password_hash VARCHAR2(255) NOT NULL,
    id_rol NUMBER(10) NOT NULL,
    id_sede NUMBER(10) NOT NULL,
    creado_en TIMESTAMP NOT NULL,
    activo CHAR(1) NOT NULL,
    id_categoria_preferida NUMBER(10),
    tema_preferido VARCHAR2(10) NOT NULL,
    CONSTRAINT usuario_pk PRIMARY KEY (id_usuario)
);

CREATE TABLE venta (
    id_venta NUMBER(10) NOT NULL,
    id_menu_preparacion NUMBER(10) NOT NULL,
    cantidad NUMBER(10) NOT NULL,
    fecha_hora TIMESTAMP NOT NULL,
    origen_dato VARCHAR2(20) NOT NULL,
    cargado_en TIMESTAMP NOT NULL,
    CONSTRAINT venta_pk PRIMARY KEY (id_venta)
);

CREATE TABLE venta_combo (
    id_venta_combo NUMBER(10) NOT NULL,
    id_jornada NUMBER(10) NOT NULL,
    id_categoria_menu NUMBER(10) NOT NULL,
    registrada_en TIMESTAMP NOT NULL,
    id_usuario NUMBER(10),
    anulada CHAR(1) NOT NULL,
    anulada_en TIMESTAMP,
    anulada_por NUMBER(10),
    id_tipo_opcion NUMBER(10),
    tipo_venta VARCHAR2(20) NOT NULL,
    CONSTRAINT venta_combo_pk PRIMARY KEY (id_venta_combo)
);

ALTER TABLE calificacion ADD CONSTRAINT fk_1_calificacion FOREIGN KEY (id_preparacion) REFERENCES preparacion (id_preparacion);
ALTER TABLE calificacion ADD CONSTRAINT fk_2_calificacion FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario);
ALTER TABLE composicion_combo ADD CONSTRAINT fk_3_composicion_combo FOREIGN KEY (id_categoria_menu) REFERENCES categoria_menu (id_categoria_menu);
ALTER TABLE composicion_combo ADD CONSTRAINT fk_4_composicion_combo FOREIGN KEY (id_tipo_componente) REFERENCES tipo_componente (id_tipo_componente);
ALTER TABLE disponibilidad ADD CONSTRAINT fk_5_disponibilidad FOREIGN KEY (id_menu_preparacion) REFERENCES menu_preparacion (id_menu_preparacion);
ALTER TABLE disponibilidad ADD CONSTRAINT fk_6_disponibilidad FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario);
ALTER TABLE favorito ADD CONSTRAINT fk_7_favorito FOREIGN KEY (id_preparacion) REFERENCES preparacion (id_preparacion);
ALTER TABLE favorito ADD CONSTRAINT fk_8_favorito FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario);
ALTER TABLE informacion_nutricional ADD CONSTRAINT fk_9_informacion_nutric FOREIGN KEY (id_preparacion) REFERENCES preparacion (id_preparacion);
ALTER TABLE informacion_nutricional ADD CONSTRAINT fk_10_informacion_nutric FOREIGN KEY (validado_por) REFERENCES usuario (id_usuario);
ALTER TABLE ingrediente ADD CONSTRAINT fk_11_ingrediente FOREIGN KEY (id_categoria_ingrediente) REFERENCES categoria_ingrediente (id_categoria_ingrediente);
ALTER TABLE ingrediente_alergeno ADD CONSTRAINT fk_12_ingrediente_alerge FOREIGN KEY (id_alergeno) REFERENCES alergeno (id_alergeno);
ALTER TABLE ingrediente_alergeno ADD CONSTRAINT fk_13_ingrediente_alerge FOREIGN KEY (id_ingrediente) REFERENCES ingrediente (id_ingrediente);
ALTER TABLE jornada ADD CONSTRAINT fk_14_jornada FOREIGN KEY (cerrada_por) REFERENCES usuario (id_usuario);
ALTER TABLE jornada ADD CONSTRAINT fk_15_jornada FOREIGN KEY (id_menu) REFERENCES menu (id_menu);
ALTER TABLE jornada ADD CONSTRAINT fk_16_jornada FOREIGN KEY (iniciada_por) REFERENCES usuario (id_usuario);
ALTER TABLE menu ADD CONSTRAINT fk_17_menu FOREIGN KEY (id_sede) REFERENCES sede (id_sede);
ALTER TABLE menu_preparacion ADD CONSTRAINT fk_18_menu_preparacion FOREIGN KEY (id_categoria_menu) REFERENCES categoria_menu (id_categoria_menu);
ALTER TABLE menu_preparacion ADD CONSTRAINT fk_19_menu_preparacion FOREIGN KEY (id_menu) REFERENCES menu (id_menu);
ALTER TABLE menu_preparacion ADD CONSTRAINT fk_20_menu_preparacion FOREIGN KEY (id_preparacion) REFERENCES preparacion (id_preparacion);
ALTER TABLE menu_preparacion ADD CONSTRAINT fk_21_menu_preparacion FOREIGN KEY (id_tipo_componente) REFERENCES tipo_componente (id_tipo_componente);
ALTER TABLE movimiento_stock ADD CONSTRAINT fk_22_movimiento_stock FOREIGN KEY (id_menu_preparacion) REFERENCES menu_preparacion (id_menu_preparacion);
ALTER TABLE movimiento_stock ADD CONSTRAINT fk_23_movimiento_stock FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario);
ALTER TABLE movimiento_stock ADD CONSTRAINT fk_24_movimiento_stock FOREIGN KEY (id_venta_combo) REFERENCES venta_combo (id_venta_combo);
ALTER TABLE opinion_registro ADD CONSTRAINT fk_25_opinion_registro FOREIGN KEY (id_preparacion) REFERENCES preparacion (id_preparacion);
ALTER TABLE opinion_registro ADD CONSTRAINT fk_26_opinion_registro FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario);
ALTER TABLE preferencia_alergeno ADD CONSTRAINT fk_27_preferencia_alerge FOREIGN KEY (id_alergeno) REFERENCES alergeno (id_alergeno);
ALTER TABLE preferencia_alergeno ADD CONSTRAINT fk_28_preferencia_alerge FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario);
ALTER TABLE preparacion ADD CONSTRAINT fk_29_preparacion FOREIGN KEY (id_tipo_componente) REFERENCES tipo_componente (id_tipo_componente);
ALTER TABLE preparacion_alergeno ADD CONSTRAINT fk_30_preparacion_alerge FOREIGN KEY (id_alergeno) REFERENCES alergeno (id_alergeno);
ALTER TABLE preparacion_alergeno ADD CONSTRAINT fk_31_preparacion_alerge FOREIGN KEY (id_preparacion) REFERENCES preparacion (id_preparacion);
ALTER TABLE preparacion_ingrediente ADD CONSTRAINT fk_32_preparacion_ingred FOREIGN KEY (id_ingrediente) REFERENCES ingrediente (id_ingrediente);
ALTER TABLE preparacion_ingrediente ADD CONSTRAINT fk_33_preparacion_ingred FOREIGN KEY (id_preparacion) REFERENCES preparacion (id_preparacion);
ALTER TABLE sede ADD CONSTRAINT fk_34_sede FOREIGN KEY (id_concesionario) REFERENCES concesionario (id_concesionario);
ALTER TABLE usuario ADD CONSTRAINT fk_35_usuario FOREIGN KEY (id_categoria_preferida) REFERENCES categoria_menu (id_categoria_menu);
ALTER TABLE usuario ADD CONSTRAINT fk_36_usuario FOREIGN KEY (id_rol) REFERENCES rol (id_rol);
ALTER TABLE usuario ADD CONSTRAINT fk_37_usuario FOREIGN KEY (id_sede) REFERENCES sede (id_sede);
ALTER TABLE venta ADD CONSTRAINT fk_38_venta FOREIGN KEY (id_menu_preparacion) REFERENCES menu_preparacion (id_menu_preparacion);
ALTER TABLE venta_combo ADD CONSTRAINT fk_39_venta_combo FOREIGN KEY (anulada_por) REFERENCES usuario (id_usuario);
ALTER TABLE venta_combo ADD CONSTRAINT fk_40_venta_combo FOREIGN KEY (id_categoria_menu) REFERENCES categoria_menu (id_categoria_menu);
ALTER TABLE venta_combo ADD CONSTRAINT fk_41_venta_combo FOREIGN KEY (id_jornada) REFERENCES jornada (id_jornada);
ALTER TABLE venta_combo ADD CONSTRAINT fk_42_venta_combo FOREIGN KEY (id_tipo_opcion) REFERENCES tipo_componente (id_tipo_componente);
ALTER TABLE venta_combo ADD CONSTRAINT fk_43_venta_combo FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario);
