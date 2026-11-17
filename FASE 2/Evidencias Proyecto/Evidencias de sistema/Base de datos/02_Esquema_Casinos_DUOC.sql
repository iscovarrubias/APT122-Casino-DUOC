SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

CREATE TABLE public.alergeno (
    id_alergeno integer NOT NULL,
    nombre character varying(50) NOT NULL
);

CREATE SEQUENCE public.alergeno_id_alergeno_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.alergeno_id_alergeno_seq OWNED BY public.alergeno.id_alergeno;

CREATE TABLE public.calificacion (
    id_calificacion integer NOT NULL,
    id_usuario integer NOT NULL,
    id_preparacion integer NOT NULL,
    estrellas smallint NOT NULL,
    comentario character varying(300),
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT calificacion_estrellas_check CHECK (((estrellas >= 1) AND (estrellas <= 5)))
);

CREATE SEQUENCE public.calificacion_id_calificacion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.calificacion_id_calificacion_seq OWNED BY public.calificacion.id_calificacion;

CREATE TABLE public.categoria_ingrediente (
    id_categoria_ingrediente integer NOT NULL,
    nombre character varying(60) NOT NULL
);

CREATE SEQUENCE public.categoria_ingrediente_id_categoria_ingrediente_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.categoria_ingrediente_id_categoria_ingrediente_seq OWNED BY public.categoria_ingrediente.id_categoria_ingrediente;

CREATE TABLE public.categoria_menu (
    id_categoria_menu integer NOT NULL,
    nombre character varying(50) NOT NULL
);

CREATE SEQUENCE public.categoria_menu_id_categoria_menu_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.categoria_menu_id_categoria_menu_seq OWNED BY public.categoria_menu.id_categoria_menu;

CREATE TABLE public.composicion_combo (
    id_categoria_menu integer NOT NULL,
    id_tipo_componente integer NOT NULL,
    grupo_opcion smallint,
    CONSTRAINT composicion_combo_grupo_opcion_check CHECK (((grupo_opcion IS NULL) OR (grupo_opcion > 0)))
);

CREATE TABLE public.concesionario (
    id_concesionario integer NOT NULL,
    nombre character varying(150) NOT NULL,
    contacto_nombre character varying(150),
    contacto_email character varying(150),
    contacto_telefono character varying(50),
    observaciones text
);

CREATE SEQUENCE public.concesionario_id_concesionario_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.concesionario_id_concesionario_seq OWNED BY public.concesionario.id_concesionario;

CREATE TABLE public.disponibilidad (
    id_disponibilidad integer NOT NULL,
    id_menu_preparacion integer NOT NULL,
    estado character varying(20) NOT NULL,
    registrado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id_usuario integer,
    observacion character varying(200),
    CONSTRAINT disponibilidad_estado_check CHECK (((estado)::text = ANY ((ARRAY['disponible'::character varying, 'baja_disponibilidad'::character varying, 'agotado'::character varying])::text[])))
);

CREATE SEQUENCE public.disponibilidad_id_disponibilidad_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.disponibilidad_id_disponibilidad_seq OWNED BY public.disponibilidad.id_disponibilidad;

CREATE TABLE public.favorito (
    id_usuario integer NOT NULL,
    id_preparacion integer NOT NULL,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.imagen (
    id_imagen uuid DEFAULT gen_random_uuid() NOT NULL,
    tipo_mime character varying(20) NOT NULL,
    datos bytea NOT NULL,
    tamano integer NOT NULL,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT imagen_tamano_check CHECK ((tamano > 0)),
    CONSTRAINT imagen_tipo_mime_check CHECK (((tipo_mime)::text = ANY ((ARRAY['image/jpeg'::character varying, 'image/png'::character varying, 'image/webp'::character varying, 'image/gif'::character varying])::text[])))
);

CREATE TABLE public.informacion_nutricional (
    id_preparacion integer NOT NULL,
    calorias numeric(6,1),
    proteinas_g numeric(6,1),
    carbohidratos_g numeric(6,1),
    grasas_g numeric(6,1),
    validado boolean DEFAULT true NOT NULL,
    fuente character varying(200),
    actualizado_en timestamp without time zone,
    origen character varying(10) DEFAULT 'manual'::character varying NOT NULL,
    calculado_en timestamp without time zone,
    validado_por integer,
    CONSTRAINT informacion_nutricional_origen_check CHECK (((origen)::text = ANY ((ARRAY['calculada'::character varying, 'manual'::character varying])::text[])))
);

CREATE TABLE public.ingrediente (
    id_ingrediente integer NOT NULL,
    nombre character varying(100) NOT NULL,
    id_categoria_ingrediente integer,
    calorias_100g numeric(6,1),
    proteinas_100g numeric(6,1),
    carbohidratos_100g numeric(6,1),
    grasas_100g numeric(6,1),
    sin_cuantificar boolean DEFAULT false NOT NULL,
    CONSTRAINT ingrediente_calorias_100g_check CHECK ((calorias_100g >= (0)::numeric)),
    CONSTRAINT ingrediente_carbohidratos_100g_check CHECK ((carbohidratos_100g >= (0)::numeric)),
    CONSTRAINT ingrediente_grasas_100g_check CHECK ((grasas_100g >= (0)::numeric)),
    CONSTRAINT ingrediente_proteinas_100g_check CHECK ((proteinas_100g >= (0)::numeric))
);

CREATE TABLE public.ingrediente_alergeno (
    id_ingrediente integer NOT NULL,
    id_alergeno integer NOT NULL
);

CREATE SEQUENCE public.ingrediente_id_ingrediente_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.ingrediente_id_ingrediente_seq OWNED BY public.ingrediente.id_ingrediente;

CREATE TABLE public.jornada (
    id_jornada integer NOT NULL,
    id_menu integer NOT NULL,
    estado character varying(10) DEFAULT 'abierta'::character varying NOT NULL,
    iniciada_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    iniciada_por integer,
    cerrada_en timestamp without time zone,
    cerrada_por integer,
    cierre_automatico boolean DEFAULT false NOT NULL,
    sobrante_contado boolean DEFAULT false NOT NULL,
    CONSTRAINT jornada_estado_check CHECK (((estado)::text = ANY ((ARRAY['abierta'::character varying, 'cerrada'::character varying])::text[])))
);

CREATE SEQUENCE public.jornada_id_jornada_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.jornada_id_jornada_seq OWNED BY public.jornada.id_jornada;

CREATE TABLE public.menu (
    id_menu integer NOT NULL,
    id_sede integer NOT NULL,
    fecha date NOT NULL,
    publicado boolean DEFAULT false NOT NULL,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE SEQUENCE public.menu_id_menu_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.menu_id_menu_seq OWNED BY public.menu.id_menu;

CREATE TABLE public.menu_preparacion (
    id_menu_preparacion integer NOT NULL,
    id_menu integer NOT NULL,
    id_preparacion integer NOT NULL,
    id_categoria_menu integer,
    id_tipo_componente integer NOT NULL,
    cantidad_planificada integer NOT NULL,
    precio numeric(8,0),
    CONSTRAINT menu_preparacion_cantidad_planificada_check CHECK ((cantidad_planificada >= 0)),
    CONSTRAINT menu_preparacion_precio_check CHECK ((precio >= (0)::numeric))
);

CREATE SEQUENCE public.menu_preparacion_id_menu_preparacion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.menu_preparacion_id_menu_preparacion_seq OWNED BY public.menu_preparacion.id_menu_preparacion;

CREATE TABLE public.movimiento_stock (
    id_movimiento bigint NOT NULL,
    id_menu_preparacion integer NOT NULL,
    tipo character varying(12) NOT NULL,
    delta integer NOT NULL,
    registrado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id_usuario integer,
    id_venta_combo integer,
    observacion character varying(200),
    CONSTRAINT movimiento_stock_delta_check CHECK ((delta <> 0)),
    CONSTRAINT movimiento_stock_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['inicio'::character varying, 'venta'::character varying, 'anulacion'::character varying, 'reposicion'::character varying, 'ajuste'::character varying, 'cierre'::character varying, 'correccion'::character varying])::text[])))
);

CREATE SEQUENCE public.movimiento_stock_id_movimiento_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.movimiento_stock_id_movimiento_seq OWNED BY public.movimiento_stock.id_movimiento;

CREATE TABLE public.opinion_registro (
    id_opinion integer NOT NULL,
    id_usuario integer,
    autor_nombre character varying(150),
    id_preparacion integer NOT NULL,
    categoria character varying(50),
    fecha_menu date,
    estrellas smallint NOT NULL,
    comentario character varying(300),
    estado character varying(10) DEFAULT 'vigente'::character varying NOT NULL,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    cerrada_en timestamp without time zone,
    autor_correo character varying(150),
    CONSTRAINT opinion_registro_estado_check CHECK (((estado)::text = ANY ((ARRAY['vigente'::character varying, 'editada'::character varying, 'eliminada'::character varying])::text[]))),
    CONSTRAINT opinion_registro_estrellas_check CHECK (((estrellas >= 1) AND (estrellas <= 5)))
);

CREATE SEQUENCE public.opinion_registro_id_opinion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.opinion_registro_id_opinion_seq OWNED BY public.opinion_registro.id_opinion;

CREATE TABLE public.preferencia_alergeno (
    id_usuario integer NOT NULL,
    id_alergeno integer NOT NULL
);

CREATE TABLE public.preparacion (
    id_preparacion integer NOT NULL,
    nombre character varying(150) NOT NULL,
    descripcion text,
    precio numeric(8,0) DEFAULT 0 NOT NULL,
    activa boolean DEFAULT true NOT NULL,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id_tipo_componente integer,
    imagen_url character varying(500),
    porciones_receta integer,
    CONSTRAINT preparacion_porciones_receta_check CHECK ((porciones_receta > 0)),
    CONSTRAINT preparacion_precio_check CHECK ((precio >= (0)::numeric))
);

CREATE TABLE public.preparacion_alergeno (
    id_preparacion integer NOT NULL,
    id_alergeno integer NOT NULL
);

CREATE SEQUENCE public.preparacion_id_preparacion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.preparacion_id_preparacion_seq OWNED BY public.preparacion.id_preparacion;

CREATE TABLE public.preparacion_ingrediente (
    id_preparacion integer NOT NULL,
    id_ingrediente integer NOT NULL,
    cantidad_g numeric(8,1),
    CONSTRAINT preparacion_ingrediente_cantidad_g_check CHECK ((cantidad_g > (0)::numeric))
);

CREATE TABLE public.rol (
    id_rol integer NOT NULL,
    nombre character varying(50) NOT NULL
);

CREATE SEQUENCE public.rol_id_rol_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.rol_id_rol_seq OWNED BY public.rol.id_rol;

CREATE TABLE public.sede (
    id_sede integer NOT NULL,
    nombre character varying(100) NOT NULL,
    id_concesionario integer NOT NULL,
    activa boolean DEFAULT true NOT NULL
);

CREATE SEQUENCE public.sede_id_sede_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.sede_id_sede_seq OWNED BY public.sede.id_sede;

CREATE TABLE public.ticket_acceso (
    id character varying(64) NOT NULL,
    sesion jsonb NOT NULL,
    expira_en timestamp with time zone NOT NULL
);

CREATE TABLE public.tipo_componente (
    id_tipo_componente integer NOT NULL,
    nombre character varying(50) NOT NULL
);

CREATE SEQUENCE public.tipo_componente_id_tipo_componente_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.tipo_componente_id_tipo_componente_seq OWNED BY public.tipo_componente.id_tipo_componente;

CREATE TABLE public.usuario (
    id_usuario integer NOT NULL,
    nombre character varying(150) NOT NULL,
    email character varying(150) NOT NULL,
    password_hash character varying(255) NOT NULL,
    id_rol integer NOT NULL,
    id_sede integer NOT NULL,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    id_categoria_preferida integer,
    tema_preferido character varying(10) DEFAULT 'claro'::character varying NOT NULL,
    CONSTRAINT usuario_tema_preferido_check CHECK (((tema_preferido)::text = ANY ((ARRAY['claro'::character varying, 'oscuro'::character varying])::text[])))
);

CREATE SEQUENCE public.usuario_id_usuario_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.usuario_id_usuario_seq OWNED BY public.usuario.id_usuario;

CREATE TABLE public.venta (
    id_venta integer NOT NULL,
    id_menu_preparacion integer NOT NULL,
    cantidad integer NOT NULL,
    fecha_hora timestamp without time zone NOT NULL,
    origen_dato character varying(20) DEFAULT 'simulado'::character varying NOT NULL,
    cargado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT venta_cantidad_check CHECK ((cantidad > 0)),
    CONSTRAINT venta_origen_dato_check CHECK (((origen_dato)::text = ANY ((ARRAY['real'::character varying, 'importado'::character varying, 'simulado'::character varying])::text[])))
);

CREATE TABLE public.venta_combo (
    id_venta_combo integer NOT NULL,
    id_jornada integer NOT NULL,
    id_categoria_menu integer NOT NULL,
    registrada_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id_usuario integer,
    anulada boolean DEFAULT false NOT NULL,
    anulada_en timestamp without time zone,
    anulada_por integer,
    id_tipo_opcion integer,
    tipo_venta character varying(20) DEFAULT 'combo'::character varying NOT NULL,
    CONSTRAINT venta_combo_tipo_venta_check CHECK (((tipo_venta)::text = ANY ((ARRAY['combo'::character varying, 'solo_plato'::character varying, 'completo_maquina'::character varying])::text[])))
);

CREATE SEQUENCE public.venta_combo_id_venta_combo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.venta_combo_id_venta_combo_seq OWNED BY public.venta_combo.id_venta_combo;

CREATE VIEW public.venta_efectiva AS
 SELECT venta.id_menu_preparacion,
    venta.cantidad,
    venta.fecha_hora,
    venta.origen_dato
   FROM public.venta
UNION ALL
 SELECT m.id_menu_preparacion,
    (- m.delta) AS cantidad,
    m.registrado_en AS fecha_hora,
    'registrado'::character varying(20) AS origen_dato
   FROM (public.movimiento_stock m
     JOIN public.venta_combo v ON ((v.id_venta_combo = m.id_venta_combo)))
  WHERE (((m.tipo)::text = 'venta'::text) AND (NOT v.anulada));

CREATE SEQUENCE public.venta_id_venta_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.venta_id_venta_seq OWNED BY public.venta.id_venta;

ALTER TABLE ONLY public.alergeno ALTER COLUMN id_alergeno SET DEFAULT nextval('public.alergeno_id_alergeno_seq'::regclass);

ALTER TABLE ONLY public.calificacion ALTER COLUMN id_calificacion SET DEFAULT nextval('public.calificacion_id_calificacion_seq'::regclass);

ALTER TABLE ONLY public.categoria_ingrediente ALTER COLUMN id_categoria_ingrediente SET DEFAULT nextval('public.categoria_ingrediente_id_categoria_ingrediente_seq'::regclass);

ALTER TABLE ONLY public.categoria_menu ALTER COLUMN id_categoria_menu SET DEFAULT nextval('public.categoria_menu_id_categoria_menu_seq'::regclass);

ALTER TABLE ONLY public.concesionario ALTER COLUMN id_concesionario SET DEFAULT nextval('public.concesionario_id_concesionario_seq'::regclass);

ALTER TABLE ONLY public.disponibilidad ALTER COLUMN id_disponibilidad SET DEFAULT nextval('public.disponibilidad_id_disponibilidad_seq'::regclass);

ALTER TABLE ONLY public.ingrediente ALTER COLUMN id_ingrediente SET DEFAULT nextval('public.ingrediente_id_ingrediente_seq'::regclass);

ALTER TABLE ONLY public.jornada ALTER COLUMN id_jornada SET DEFAULT nextval('public.jornada_id_jornada_seq'::regclass);

ALTER TABLE ONLY public.menu ALTER COLUMN id_menu SET DEFAULT nextval('public.menu_id_menu_seq'::regclass);

ALTER TABLE ONLY public.menu_preparacion ALTER COLUMN id_menu_preparacion SET DEFAULT nextval('public.menu_preparacion_id_menu_preparacion_seq'::regclass);

ALTER TABLE ONLY public.movimiento_stock ALTER COLUMN id_movimiento SET DEFAULT nextval('public.movimiento_stock_id_movimiento_seq'::regclass);

ALTER TABLE ONLY public.opinion_registro ALTER COLUMN id_opinion SET DEFAULT nextval('public.opinion_registro_id_opinion_seq'::regclass);

ALTER TABLE ONLY public.preparacion ALTER COLUMN id_preparacion SET DEFAULT nextval('public.preparacion_id_preparacion_seq'::regclass);

ALTER TABLE ONLY public.rol ALTER COLUMN id_rol SET DEFAULT nextval('public.rol_id_rol_seq'::regclass);

ALTER TABLE ONLY public.sede ALTER COLUMN id_sede SET DEFAULT nextval('public.sede_id_sede_seq'::regclass);

ALTER TABLE ONLY public.tipo_componente ALTER COLUMN id_tipo_componente SET DEFAULT nextval('public.tipo_componente_id_tipo_componente_seq'::regclass);

ALTER TABLE ONLY public.usuario ALTER COLUMN id_usuario SET DEFAULT nextval('public.usuario_id_usuario_seq'::regclass);

ALTER TABLE ONLY public.venta ALTER COLUMN id_venta SET DEFAULT nextval('public.venta_id_venta_seq'::regclass);

ALTER TABLE ONLY public.venta_combo ALTER COLUMN id_venta_combo SET DEFAULT nextval('public.venta_combo_id_venta_combo_seq'::regclass);

ALTER TABLE ONLY public.alergeno
    ADD CONSTRAINT alergeno_nombre_key UNIQUE (nombre);

ALTER TABLE ONLY public.alergeno
    ADD CONSTRAINT alergeno_pkey PRIMARY KEY (id_alergeno);

ALTER TABLE ONLY public.calificacion
    ADD CONSTRAINT calificacion_id_usuario_id_preparacion_key UNIQUE (id_usuario, id_preparacion);

ALTER TABLE ONLY public.calificacion
    ADD CONSTRAINT calificacion_pkey PRIMARY KEY (id_calificacion);

ALTER TABLE ONLY public.categoria_ingrediente
    ADD CONSTRAINT categoria_ingrediente_nombre_key UNIQUE (nombre);

ALTER TABLE ONLY public.categoria_ingrediente
    ADD CONSTRAINT categoria_ingrediente_pkey PRIMARY KEY (id_categoria_ingrediente);

ALTER TABLE ONLY public.categoria_menu
    ADD CONSTRAINT categoria_menu_nombre_key UNIQUE (nombre);

ALTER TABLE ONLY public.categoria_menu
    ADD CONSTRAINT categoria_menu_pkey PRIMARY KEY (id_categoria_menu);

ALTER TABLE ONLY public.composicion_combo
    ADD CONSTRAINT composicion_combo_pkey PRIMARY KEY (id_categoria_menu, id_tipo_componente);

ALTER TABLE ONLY public.concesionario
    ADD CONSTRAINT concesionario_pkey PRIMARY KEY (id_concesionario);

ALTER TABLE ONLY public.disponibilidad
    ADD CONSTRAINT disponibilidad_pkey PRIMARY KEY (id_disponibilidad);

ALTER TABLE ONLY public.favorito
    ADD CONSTRAINT favorito_pkey PRIMARY KEY (id_usuario, id_preparacion);

ALTER TABLE ONLY public.imagen
    ADD CONSTRAINT imagen_pkey PRIMARY KEY (id_imagen);

ALTER TABLE ONLY public.informacion_nutricional
    ADD CONSTRAINT informacion_nutricional_pkey PRIMARY KEY (id_preparacion);

ALTER TABLE ONLY public.ingrediente_alergeno
    ADD CONSTRAINT ingrediente_alergeno_pkey PRIMARY KEY (id_ingrediente, id_alergeno);

ALTER TABLE ONLY public.ingrediente
    ADD CONSTRAINT ingrediente_nombre_key UNIQUE (nombre);

ALTER TABLE ONLY public.ingrediente
    ADD CONSTRAINT ingrediente_pkey PRIMARY KEY (id_ingrediente);

ALTER TABLE ONLY public.jornada
    ADD CONSTRAINT jornada_id_menu_key UNIQUE (id_menu);

ALTER TABLE ONLY public.jornada
    ADD CONSTRAINT jornada_pkey PRIMARY KEY (id_jornada);

ALTER TABLE ONLY public.menu
    ADD CONSTRAINT menu_id_sede_fecha_key UNIQUE (id_sede, fecha);

ALTER TABLE ONLY public.menu
    ADD CONSTRAINT menu_pkey PRIMARY KEY (id_menu);

ALTER TABLE ONLY public.menu_preparacion
    ADD CONSTRAINT menu_preparacion_pkey PRIMARY KEY (id_menu_preparacion);

ALTER TABLE ONLY public.movimiento_stock
    ADD CONSTRAINT movimiento_stock_pkey PRIMARY KEY (id_movimiento);

ALTER TABLE ONLY public.opinion_registro
    ADD CONSTRAINT opinion_registro_pkey PRIMARY KEY (id_opinion);

ALTER TABLE ONLY public.preferencia_alergeno
    ADD CONSTRAINT preferencia_alergeno_pkey PRIMARY KEY (id_usuario, id_alergeno);

ALTER TABLE ONLY public.preparacion_alergeno
    ADD CONSTRAINT preparacion_alergeno_pkey PRIMARY KEY (id_preparacion, id_alergeno);

ALTER TABLE ONLY public.preparacion_ingrediente
    ADD CONSTRAINT preparacion_ingrediente_pkey PRIMARY KEY (id_preparacion, id_ingrediente);

ALTER TABLE ONLY public.preparacion
    ADD CONSTRAINT preparacion_pkey PRIMARY KEY (id_preparacion);

ALTER TABLE ONLY public.rol
    ADD CONSTRAINT rol_nombre_key UNIQUE (nombre);

ALTER TABLE ONLY public.rol
    ADD CONSTRAINT rol_pkey PRIMARY KEY (id_rol);

ALTER TABLE ONLY public.sede
    ADD CONSTRAINT sede_pkey PRIMARY KEY (id_sede);

ALTER TABLE ONLY public.ticket_acceso
    ADD CONSTRAINT ticket_acceso_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tipo_componente
    ADD CONSTRAINT tipo_componente_nombre_key UNIQUE (nombre);

ALTER TABLE ONLY public.tipo_componente
    ADD CONSTRAINT tipo_componente_pkey PRIMARY KEY (id_tipo_componente);

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_email_key UNIQUE (email);

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_pkey PRIMARY KEY (id_usuario);

ALTER TABLE ONLY public.venta_combo
    ADD CONSTRAINT venta_combo_pkey PRIMARY KEY (id_venta_combo);

ALTER TABLE ONLY public.venta
    ADD CONSTRAINT venta_pkey PRIMARY KEY (id_venta);

CREATE INDEX idx_calificacion_preparacion ON public.calificacion USING btree (id_preparacion);

CREATE INDEX idx_composicion_tipo ON public.composicion_combo USING btree (id_tipo_componente);

CREATE INDEX idx_disponibilidad_actual ON public.disponibilidad USING btree (id_menu_preparacion, registrado_en DESC);

CREATE INDEX idx_imagen_creado ON public.imagen USING btree (creado_en);

CREATE INDEX idx_menu_preparacion_menu ON public.menu_preparacion USING btree (id_menu);

CREATE INDEX idx_menu_preparacion_preparacion ON public.menu_preparacion USING btree (id_preparacion);

CREATE INDEX idx_mov_stock_combo ON public.movimiento_stock USING btree (id_venta_combo);

CREATE INDEX idx_mov_stock_mp ON public.movimiento_stock USING btree (id_menu_preparacion, registrado_en);

CREATE INDEX idx_opinion_registro_fecha ON public.opinion_registro USING btree (creado_en);

CREATE INDEX idx_opinion_registro_prep ON public.opinion_registro USING btree (id_preparacion);

CREATE INDEX idx_preparacion_tipo ON public.preparacion USING btree (id_tipo_componente);

CREATE INDEX idx_ticket_acceso_expira ON public.ticket_acceso USING btree (expira_en);

CREATE INDEX idx_venta_combo_jornada ON public.venta_combo USING btree (id_jornada);

CREATE INDEX idx_venta_fecha ON public.venta USING btree (fecha_hora);

CREATE INDEX idx_venta_menu_preparacion ON public.venta USING btree (id_menu_preparacion);

CREATE UNIQUE INDEX ux_menu_prep_compartido ON public.menu_preparacion USING btree (id_menu, id_tipo_componente) WHERE (id_categoria_menu IS NULL);

CREATE UNIQUE INDEX ux_menu_prep_por_categoria ON public.menu_preparacion USING btree (id_menu, id_categoria_menu, id_tipo_componente) WHERE (id_categoria_menu IS NOT NULL);

CREATE UNIQUE INDEX ux_opinion_registro_vigente ON public.opinion_registro USING btree (id_usuario, id_preparacion) WHERE ((estado)::text = 'vigente'::text);

ALTER TABLE ONLY public.calificacion
    ADD CONSTRAINT calificacion_id_preparacion_fkey FOREIGN KEY (id_preparacion) REFERENCES public.preparacion(id_preparacion) ON DELETE CASCADE;

ALTER TABLE ONLY public.calificacion
    ADD CONSTRAINT calificacion_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario) ON DELETE CASCADE;

ALTER TABLE ONLY public.composicion_combo
    ADD CONSTRAINT composicion_combo_id_categoria_menu_fkey FOREIGN KEY (id_categoria_menu) REFERENCES public.categoria_menu(id_categoria_menu) ON DELETE CASCADE;

ALTER TABLE ONLY public.composicion_combo
    ADD CONSTRAINT composicion_combo_id_tipo_componente_fkey FOREIGN KEY (id_tipo_componente) REFERENCES public.tipo_componente(id_tipo_componente) ON DELETE CASCADE;

ALTER TABLE ONLY public.disponibilidad
    ADD CONSTRAINT disponibilidad_id_menu_preparacion_fkey FOREIGN KEY (id_menu_preparacion) REFERENCES public.menu_preparacion(id_menu_preparacion) ON DELETE CASCADE;

ALTER TABLE ONLY public.disponibilidad
    ADD CONSTRAINT disponibilidad_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.favorito
    ADD CONSTRAINT favorito_id_preparacion_fkey FOREIGN KEY (id_preparacion) REFERENCES public.preparacion(id_preparacion) ON DELETE CASCADE;

ALTER TABLE ONLY public.favorito
    ADD CONSTRAINT favorito_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario) ON DELETE CASCADE;

ALTER TABLE ONLY public.informacion_nutricional
    ADD CONSTRAINT informacion_nutricional_id_preparacion_fkey FOREIGN KEY (id_preparacion) REFERENCES public.preparacion(id_preparacion) ON DELETE CASCADE;

ALTER TABLE ONLY public.informacion_nutricional
    ADD CONSTRAINT informacion_nutricional_validado_por_fkey FOREIGN KEY (validado_por) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.ingrediente_alergeno
    ADD CONSTRAINT ingrediente_alergeno_id_alergeno_fkey FOREIGN KEY (id_alergeno) REFERENCES public.alergeno(id_alergeno) ON DELETE RESTRICT;

ALTER TABLE ONLY public.ingrediente_alergeno
    ADD CONSTRAINT ingrediente_alergeno_id_ingrediente_fkey FOREIGN KEY (id_ingrediente) REFERENCES public.ingrediente(id_ingrediente) ON DELETE CASCADE;

ALTER TABLE ONLY public.ingrediente
    ADD CONSTRAINT ingrediente_id_categoria_ingrediente_fkey FOREIGN KEY (id_categoria_ingrediente) REFERENCES public.categoria_ingrediente(id_categoria_ingrediente);

ALTER TABLE ONLY public.jornada
    ADD CONSTRAINT jornada_cerrada_por_fkey FOREIGN KEY (cerrada_por) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.jornada
    ADD CONSTRAINT jornada_id_menu_fkey FOREIGN KEY (id_menu) REFERENCES public.menu(id_menu);

ALTER TABLE ONLY public.jornada
    ADD CONSTRAINT jornada_iniciada_por_fkey FOREIGN KEY (iniciada_por) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.menu
    ADD CONSTRAINT menu_id_sede_fkey FOREIGN KEY (id_sede) REFERENCES public.sede(id_sede);

ALTER TABLE ONLY public.menu_preparacion
    ADD CONSTRAINT menu_preparacion_id_categoria_menu_fkey FOREIGN KEY (id_categoria_menu) REFERENCES public.categoria_menu(id_categoria_menu);

ALTER TABLE ONLY public.menu_preparacion
    ADD CONSTRAINT menu_preparacion_id_menu_fkey FOREIGN KEY (id_menu) REFERENCES public.menu(id_menu) ON DELETE CASCADE;

ALTER TABLE ONLY public.menu_preparacion
    ADD CONSTRAINT menu_preparacion_id_preparacion_fkey FOREIGN KEY (id_preparacion) REFERENCES public.preparacion(id_preparacion);

ALTER TABLE ONLY public.menu_preparacion
    ADD CONSTRAINT menu_preparacion_id_tipo_componente_fkey FOREIGN KEY (id_tipo_componente) REFERENCES public.tipo_componente(id_tipo_componente);

ALTER TABLE ONLY public.movimiento_stock
    ADD CONSTRAINT movimiento_stock_id_menu_preparacion_fkey FOREIGN KEY (id_menu_preparacion) REFERENCES public.menu_preparacion(id_menu_preparacion);

ALTER TABLE ONLY public.movimiento_stock
    ADD CONSTRAINT movimiento_stock_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.movimiento_stock
    ADD CONSTRAINT movimiento_stock_id_venta_combo_fkey FOREIGN KEY (id_venta_combo) REFERENCES public.venta_combo(id_venta_combo);

ALTER TABLE ONLY public.opinion_registro
    ADD CONSTRAINT opinion_registro_id_preparacion_fkey FOREIGN KEY (id_preparacion) REFERENCES public.preparacion(id_preparacion) ON DELETE CASCADE;

ALTER TABLE ONLY public.opinion_registro
    ADD CONSTRAINT opinion_registro_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario) ON DELETE SET NULL;

ALTER TABLE ONLY public.preferencia_alergeno
    ADD CONSTRAINT preferencia_alergeno_id_alergeno_fkey FOREIGN KEY (id_alergeno) REFERENCES public.alergeno(id_alergeno) ON DELETE CASCADE;

ALTER TABLE ONLY public.preferencia_alergeno
    ADD CONSTRAINT preferencia_alergeno_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario) ON DELETE CASCADE;

ALTER TABLE ONLY public.preparacion_alergeno
    ADD CONSTRAINT preparacion_alergeno_id_alergeno_fkey FOREIGN KEY (id_alergeno) REFERENCES public.alergeno(id_alergeno) ON DELETE RESTRICT;

ALTER TABLE ONLY public.preparacion_alergeno
    ADD CONSTRAINT preparacion_alergeno_id_preparacion_fkey FOREIGN KEY (id_preparacion) REFERENCES public.preparacion(id_preparacion) ON DELETE CASCADE;

ALTER TABLE ONLY public.preparacion
    ADD CONSTRAINT preparacion_id_tipo_componente_fkey FOREIGN KEY (id_tipo_componente) REFERENCES public.tipo_componente(id_tipo_componente);

ALTER TABLE ONLY public.preparacion_ingrediente
    ADD CONSTRAINT preparacion_ingrediente_id_ingrediente_fkey FOREIGN KEY (id_ingrediente) REFERENCES public.ingrediente(id_ingrediente) ON DELETE RESTRICT;

ALTER TABLE ONLY public.preparacion_ingrediente
    ADD CONSTRAINT preparacion_ingrediente_id_preparacion_fkey FOREIGN KEY (id_preparacion) REFERENCES public.preparacion(id_preparacion) ON DELETE CASCADE;

ALTER TABLE ONLY public.sede
    ADD CONSTRAINT sede_id_concesionario_fkey FOREIGN KEY (id_concesionario) REFERENCES public.concesionario(id_concesionario);

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_id_categoria_preferida_fkey FOREIGN KEY (id_categoria_preferida) REFERENCES public.categoria_menu(id_categoria_menu);

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_id_rol_fkey FOREIGN KEY (id_rol) REFERENCES public.rol(id_rol);

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_id_sede_fkey FOREIGN KEY (id_sede) REFERENCES public.sede(id_sede);

ALTER TABLE ONLY public.venta_combo
    ADD CONSTRAINT venta_combo_anulada_por_fkey FOREIGN KEY (anulada_por) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.venta_combo
    ADD CONSTRAINT venta_combo_id_categoria_menu_fkey FOREIGN KEY (id_categoria_menu) REFERENCES public.categoria_menu(id_categoria_menu);

ALTER TABLE ONLY public.venta_combo
    ADD CONSTRAINT venta_combo_id_jornada_fkey FOREIGN KEY (id_jornada) REFERENCES public.jornada(id_jornada);

ALTER TABLE ONLY public.venta_combo
    ADD CONSTRAINT venta_combo_id_tipo_opcion_fkey FOREIGN KEY (id_tipo_opcion) REFERENCES public.tipo_componente(id_tipo_componente);

ALTER TABLE ONLY public.venta_combo
    ADD CONSTRAINT venta_combo_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.venta
    ADD CONSTRAINT venta_id_menu_preparacion_fkey FOREIGN KEY (id_menu_preparacion) REFERENCES public.menu_preparacion(id_menu_preparacion);
