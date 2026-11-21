# Casinos DUOC UC: backend

API REST de la plataforma de gestión y análisis de la oferta gastronómica del Casino DUOC UC (APT122).

Usa Node.js 20+, Express 5 y PostgreSQL 14+. Incluye autenticación con JWT y Microsoft Entra ID, control de acceso por rol, stock exacto por jornada con historial de movimientos, predicción de demanda con backtesting, eventos en tiempo real con SSE, perfil del estudiante y variaciones de receta.

> Referencia completa de los endpoints: [`../docs/API.md`](../docs/API.md)

## Qué incluye por sprint

Cada sprint corresponde a una migración en `database/` (desde la 3, las dos primeras forman parte de `schema.sql`):

| Sprint | Contenido |
|---|---|
| 1 | Login, roles y gestión de preparaciones |
| 2 | Planificación del menú, alérgenos e información nutricional |
| 3 | Disponibilidad del día, historial de menús, análisis básico y zona horaria de Chile |
| 4 | Tipo de componente y subida de imágenes |
| 5 | Ingredientes con composición por 100 g y cálculo nutricional automático |
| 6 | Jornada (inicio, venta y cierre), stock exacto por movimientos, roles Cajero y Nutricionista, SSE |
| 7 | Vista mensual, copia de menús entre fechas y precio por categoría |
| 8 | Perfil del estudiante (alergias, favoritos y calificaciones) y predicción de demanda con backtesting |
| 9 | Categoría preferida del estudiante |
| 10 | Historial de opiniones (`opinion_registro`) que conserva las editadas y eliminadas para el administrador |
| 11 | Correo del autor en el historial de opiniones |
| 12 | Inicio de sesión con Microsoft Entra ID (OIDC con PKCE) y tickets de acceso de un solo uso (`ticket_acceso`) |
| 13 | Índices de rendimiento en `menu_preparacion` |
| 14 | Tema claro u oscuro preferido por usuario |
| 15 | Imágenes de las preparaciones guardadas en la base (`imagen`), así sobreviven a un redespliegue y entran en los respaldos |
| 16 | Componentes Ensalada, Sopa, Pan y Fruta, y composición del combo por categoría (`composicion_combo`) con grupos de opción, como postre o fruta |
| 17 | Ajuste de la composición del combo vegetariano |
| 18 | La categoría "Principal" pasa a llamarse "General" |
| 19 | Tipo de venta: combo, solo plato o completo con bebida de máquina |
| 20 | Opción postre o fruta en el vegetariano y movimiento de corrección para el cierre de jornada |
| 21 | Variaciones de receta (`preparacion.id_preparacion_base`) |

## Historias de usuario y requisitos por endpoint

| Historia | Descripción | Endpoint |
|---|---|---|
| HU-14 | Distinción de roles | Middleware `requiereRol` |
| HU-15 | Login con correo institucional | `POST /api/auth/identificar`, `/login` y `/microsoft/*` |
| HU-01 | Registrar una preparación con ingredientes | `POST /api/preparaciones` |
| HU-02 | Editar o desactivar una preparación | `PUT /api/preparaciones/:id` y `PATCH .../desactivar` |
| HU-03 | Planificar el menú del día | `POST /api/menu/planificacion` |
| HU-04 | Publicar el menú del día | `PATCH /api/menu/:id/publicar` |
| HU-05 | Historial de menús publicados | `GET /api/menu/historial` |
| HU-06 | Registrar disponibilidad | `PATCH /api/menu/componentes/:id/disponibilidad` |
| HU-08 | Consulta pública del menú | `GET /api/menu/hoy` |
| HU-12 | Alérgenos desde un catálogo fijo | `PUT /api/preparaciones/:id/alergenos` |
| HU-13 | Información nutricional | `PUT /api/preparaciones/:id/nutricion` |
| HU-20 | Opiniones y estrellas | `PUT /api/estudiante/calificaciones/:id` |
| RF-21 | Ingredientes por 100 g | `GET /api/ingredientes` |
| RF-22 | Cálculo nutricional desde los ingredientes | `POST /api/preparaciones/calcular-nutricion` |
| RF-24 | Iniciar la jornada | `POST /api/jornada/iniciar` |
| RF-25 | Venta de un combo con un toque | `POST /api/jornada/ventas` |
| RF-26 | Stock exacto en tiempo real | `GET /api/jornada/hoy` y `GET /api/menu/eventos` (SSE) |
| RF-27 | Informe de agotamiento | `GET /api/analisis/mensual` |
| RF-28 | Roles Cajero y Nutricionista | Tabla `rol` (migración del sprint 6) |
|  | Predicción de demanda y su confiabilidad | `GET /api/prediccion/*` |
|  | Variación de una receta | `POST /api/preparaciones` con `id_preparacion_base` |

## Requisitos

- Node.js 20+
- PostgreSQL 14+
- `pg_dump` y `psql` en el PATH, solo para los respaldos y para cargar los scripts SQL de datos

## Instalación

```bash
npm install
cp .env.ejemplo .env      # completa DATABASE_URL y JWT_SECRET (ver la tabla de variables)

createdb casino_duoc
npm run migrar            # crea el esquema y aplica las migraciones pendientes
npm run seed              # usuarios de prueba (contraseña Test1234)
psql -d casino_duoc -f database/seed_demo.sql    # catálogo y menús de demostración
npm run seed:ventas       # historial de ventas simuladas para la predicción

npm start                 # http://localhost:3000
```

`npm run migrar` registra lo aplicado en la tabla `schema_migraciones`. Si la base ya tenía las migraciones aplicadas a mano, hay que ejecutar una vez `npm run migrar -- --baseline`.

> `seed_demo.sql` borra las preparaciones, los menús y las ventas antes de insertar, no se debe correr sobre una base con datos que se quieran conservar.

Los usuarios de prueba son solo para desarrollo. En una base publicada hay que cambiar sus contraseñas o eliminarlos, porque aparecen en este repositorio público.

### Con Docker

Desde la carpeta `Aplicacion`: `docker compose up --build`, el detalle está en el [README de la aplicación](../README.md).

## Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| `DATABASE_URL` | Sí | Cadena de conexión a PostgreSQL |
| `JWT_SECRET` | Sí | Secreto de firma, en producción debe tener al menos 32 caracteres y ser distinto del ejemplo |
| `PORT` / `HOST` | No | Por defecto `3000` y `0.0.0.0` |
| `NODE_ENV` | No | `production` activa las comprobaciones estrictas y HSTS |
| `CORS_ORIGIN` | En producción | URL del frontend, si son varias se separan por coma |
| `JWT_EXPIRES_IN` / `JWT_EXPIRES_IN_KIOSCO` | No | Por defecto `8h` y `7d` |
| `SSO_SIMULADO` | No | `true` permite el ingreso de estudiantes sin contraseña, solo para demostraciones locales y prohibido en producción |
| `HORA_CIERRE_AUTOMATICO` | No | Hora en que se cierra la jornada si nadie la cerró, por defecto `15:00` |
| `HORA_INICIO_AUTOMATICO` | No | Hora (`HH:MM`) desde la que la jornada de hoy se inicia sola con las cantidades planificadas, si queda vacía la inicia el personal desde Caja |
| `DEMO_VENTAS_SIMULADAS` / `DEMO_VENTAS_POR_MINUTO` | No | Solo para demostraciones, con `true` registra combos simulados mientras la jornada está abierta, al ritmo indicado (por defecto `0.7` por minuto) |
| `TRUST_PROXY` | No | Número de proxies de confianza, para obtener la IP real detrás de un proxy |
| `LIMITE_LOGIN_POR_CUENTA` / `LIMITE_LOGIN_POR_IP` / `LIMITE_IDENTIFICAR_POR_IP` | No | Límites del limitador, por defecto 8, 40 y 600 intentos cada 15 minutos |
| `EVENTOS_MAX_CONEXIONES` / `EVENTOS_MAX_POR_IP` | No | Límites de conexiones SSE |
| `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, `ENTRA_CLIENT_SECRET`, `ENTRA_REDIRECT_URI` | Para Microsoft | Configuración de Entra ID, ver [`../docs/LOGIN_MICROSOFT.md`](../docs/LOGIN_MICROSOFT.md) |
| `ENTRA_DOMINIOS_ESTUDIANTES` / `ENTRA_DOMINIOS_PERSONAL` | No | Dominios permitidos, por ejemplo `duocuc.cl` y `duoc.cl,profesor.duoc.cl` |
| `FRONTEND_URL` | Para Microsoft | Página a la que vuelve el usuario después de iniciar sesión |
| `TEST_DATABASE_URL` | Para las pruebas de integración | Base exclusiva de pruebas, su nombre debe contener `test` o `prueba` |
| `RESPALDO_DIR` / `RESPALDO_CONSERVAR` | No | Carpeta de los respaldos y cuántos conservar, por defecto 14 |

## Jornada automática y datos de demostración

La jornada se cierra sola a la hora de `HORA_CIERRE_AUTOMATICO`, y el cierre se revisa tanto desde el panel del personal como desde la consulta pública del menú, así el menú deja de mostrarse disponible aunque nadie abra el panel.

El inicio automático y las ventas simuladas (`src/utils/demo.js`) se activan con sus variables y no dependen de un reloj externo, se ejecutan cuando el servidor recibe visitas y cada minuto mientras está encendido. Por eso funcionan aunque el hosting gratuito haya apagado el servidor a la hora de inicio: la primera visita después de esa hora inicia la jornada y pone al día las ventas que faltan desde el inicio. Después del cierre no se vuelve a iniciar sola y las ventas simuladas se detienen.

Las jornadas iniciadas por el sistema quedan con `iniciada_por` vacío y las ventas simuladas sin usuario, así se pueden borrar después:

```sql
BEGIN;
DELETE FROM movimiento_stock WHERE id_menu_preparacion IN (
  SELECT mp.id_menu_preparacion FROM menu_preparacion mp JOIN jornada j ON j.id_menu = mp.id_menu WHERE j.iniciada_por IS NULL);
DELETE FROM venta_combo WHERE id_jornada IN (SELECT id_jornada FROM jornada WHERE iniciada_por IS NULL);
DELETE FROM jornada WHERE iniciada_por IS NULL;
COMMIT;
```

Para la demostración pública, `database/seed_menu_campomar.sql` carga el menú del afiche real de Campomar en la semana en curso y `database/repetir_menu_campomar.sql` lo copia a las semanas siguientes.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm start` | Inicia el servidor |
| `npm run dev` | Inicia el servidor con recarga automática |
| `npm run migrar` | Aplica las migraciones pendientes |
| `npm run seed` | Crea los usuarios de prueba |
| `npm run seed:ventas` | Genera ventas simuladas de los últimos días para la predicción |
| `npm test` | Pruebas unitarias y de seguridad, sin base de datos |
| `npm run test:db` | Pruebas de integración de jornada, estudiante y acceso |
| `npm run test:bd` | Seguridad, robustez, rendimiento, recetas, estimación pública y correos contra una base real |
| `npm run test:rendimiento` | Solo la carga de hora punta, con la tabla de tiempos medidos |
| `npm run test:todo` | Todas las pruebas, una tras otra |
| `npm run test:cov` | Todas las pruebas con el informe de cobertura, falla si baja del 80 % de líneas |
| `npm run respaldo` | Respaldo de la base con `pg_dump` |
| `npm run respaldo:verificar` | Respalda la base, la restaura en la base de pruebas y compara tabla por tabla |
| `npm run formato` / `npm run formato:revisar` | Ordena el código con Prettier / revisa el formato sin cambiar nada |

## Pruebas

Son 163 casos en el backend, con un 89 % de líneas cubiertas. Las pruebas que usan base de datos levantan la API completa y le hablan por HTTP igual que lo haría el frontend, así que prueban el sistema de punta a punta y no piezas aisladas.

| Archivo | Tipo | Qué cubre |
|---|---|---|
| `tests/nutricion.test.js` | Unitaria | Cálculo nutricional por porción con la regla "todo o nada" |
| `tests/prediccion.test.js` | Unitaria | Demanda, hora de agotamiento y backtesting |
| `tests/entra.test.js` | Unitaria, con un servidor Entra simulado | PKCE, `state`, `nonce`, firma y audiencia del token |
| `tests/seguridad.test.js` | Seguridad | Encabezados, rutas protegidas, limitador y arranque en producción |
| `tests/utilidades.test.js` | Unitaria | Fechas en hora de Chile (incluido el cambio de horario y fechas imposibles), estado por stock, caché del menú y límite de conexiones en tiempo real |
| `tests/subida-errores.test.js` | Unitaria | Detección de imágenes por sus primeros bytes y traducción de cada error de PostgreSQL a una respuesta clara |
| `tests/demo.test.js` | Unitaria, con la base simulada | Inicio automático a la hora configurada y ventas simuladas de la demostración |
| `tests/bd/seguridad.bd.test.js` | Seguridad con base real | Tokens falsos, vencidos o sin firma, roles leídos desde la base, cuentas desactivadas al instante, correos que no se pueden adivinar, bcrypt, campos inyectados, inyección SQL, HTML malicioso, archivos disfrazados de imagen y aislamiento entre estudiantes |
| `tests/bd/robustez.bd.test.js` | Robustez con base real | Recorre todas las rutas con identificadores inválidos, fechas imposibles, tipos equivocados y JSON roto, y exige que ninguna responda 500 ni muestre detalles internos |
| `tests/bd/rendimiento.bd.test.js` | Rendimiento con base real | Hora punta de 80 estudiantes a la vez, la caja vendiendo mientras el público consulta con el stock cuadrando exacto, anulaciones simultáneas, agotamiento con dos cajas, 50 inicios de sesión al mismo tiempo y el aviso en tiempo real a 300 pantallas |
| `tests/bd/preparaciones.bd.test.js` | Funcional con base real | Los 8 tipos de preparación, variaciones de receta (también de otra variación), gramos por ingrediente y fotos guardadas en la base |
| `tests/integracion/jornada.integracion.js` | Integración con base de datos | Ventas concurrentes, stock, SSE, cierre, nutrición y precios |
| `tests/integracion/estudiante.integracion.js` | Integración con base de datos | Perfil, opiniones e historial, copia de menús y predicción |
| `tests/integracion/acceso.integracion.js` | Integración con base de datos | Tickets de acceso y método de ingreso |

La prueba de rendimiento imprime una tabla con los tiempos medidos. En un computador de desarrollo da estos valores, con el requisito de responder en menos de 2 segundos (se puede ajustar con `RENDIMIENTO_P95_MS`):

| Escenario | Solicitudes | p50 | p95 |
|---|---|---|---|
| Menú público con 80 estudiantes a la vez | 400 | 40 ms | 500 ms |
| Ventas en caja, 12 simultáneas | 120 | 100 ms | 360 ms |
| Menú público durante esas ventas | 300 | 100 ms | 190 ms |
| 50 inicios de sesión al mismo tiempo | 50 | 740 ms | 1.350 ms |
| Aviso en tiempo real a 300 pantallas | 300 | 22 ms | 26 ms |

Las pruebas de robustez encontraron errores reales que ya están corregidos, por ejemplo un identificador como `abc` o una fecha como `2026-02-30` hacían responder 500 a la API, y ahora responden 400 con un mensaje claro.

## Estructura

```text
backend/
├── src/
│   ├── app.js                  Configuración de Express, seguridad y arranque
│   ├── config/db.js            Pool de conexiones a PostgreSQL
│   ├── middleware/             auth (JWT), roles, limitador, subida de imágenes y manejo de errores
│   ├── routes/                 auth, preparaciones, ingrediente, menu, jornada, analisis, prediccion,
│   │                           estudiante, opiniones, usuarios e imagenes
│   ├── controllers/            Validación de la entrada y respuesta HTTP
│   ├── models/                 Acceso a datos (SQL) y transacciones
│   └── utils/                  entra, eventos (SSE), cache, fecha, nutricion, prediccion, stock y demo
├── database/
│   ├── schema.sql              Esquema base
│   ├── migracion_sprintN.sql   Migraciones de la 3 a la 21, las aplica migrar.js
│   ├── migrar.js, respaldo.js y verificar_respaldo.js
│   ├── seed_sprint1.js         Usuarios de prueba
│   ├── seed_demo.sql y seed_demo_nutricion.sql      Catálogo y menús de demostración
│   ├── seed_menu_campomar.sql y repetir_menu_campomar.sql   Menú del afiche de Campomar
│   ├── seed_ventas_simuladas.js y seed_opiniones_demo.sql   Ventas y opiniones de demostración
│   ├── seed_imagenes.js        Fotos de los platos de la demostración
│   ├── limpiar_jornada_hoy.js  Borra la jornada de hoy para volver a probarla
│   └── limpiar_datos.sql       Vacía los datos de operación (destructivo)
└── tests/                      Unitarias, seguridad, robustez, rendimiento e integración
```

## Decisiones de diseño

- **Stock por movimientos:** el stock de cada componente es la suma de `movimiento_stock.delta`, anular una venta crea el movimiento contrario y el historial nunca se edita ni se borra.
- **Planificado y real por separado:** `menu_preparacion` guarda lo planificado y la jornada registra lo que realmente pasa durante el día, como confirmó la entrevista con la encargada del casino.
- **Nutrición "todo o nada":** si falta el dato de algún ingrediente, la información nutricional se muestra como "No disponible" en vez de completarla con supuestos.
- **Opiniones conservadas:** editar o eliminar una opinión no la borra, queda en `opinion_registro` para el análisis del administrador.
- **Variaciones de receta:** cuando un plato se prepara distinto, se crea una preparación nueva enlazada a la original (`id_preparacion_base`), con sus propios ingredientes, alérgenos y nutrición, así la receta original y los menús pasados no cambian.
- **Origen de los datos de venta:** `venta.origen_dato` distingue entre `real`, `importado` y `simulado`, y la predicción avisa cuando trabaja con datos simulados.
