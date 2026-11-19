# Casino DUOC UC — Backend

API REST del MVP de la Plataforma de Gestión y Análisis de la Oferta Gastronómica del Casino DUOC UC (APT122).

**Node.js 20+ · Express 5 · PostgreSQL 14+.** Autenticación JWT y Microsoft Entra ID, control de acceso por rol, stock exacto por jornada (movimientos), predicción de demanda con backtesting, tiempo real con SSE y módulo de perfil del estudiante.

> Referencia completa de endpoints: [`../docs/API.md`](../docs/API.md)

## Qué incluye (por sprint)

| Sprint | Contenido |
|---|---|
| 1 | Login, roles y gestión de preparaciones |
| 2 | Planificación de menú, alérgenos e información nutricional |
| 3 | Disponibilidad del día, historial de menús, análisis básico, zona horaria de Chile |
| 4 | Tipo de componente (Entrada, Plato Principal, Postre, Bebida) y subida de imágenes |
| 5 | Ingredientes con composición por 100 g y cálculo nutricional automático |
| 6 | Jornada (inicio, venta, cierre), stock exacto por movimientos, roles Cajero y Nutricionista, SSE |
| 7 | Vista mensual del calendario y copia de menús entre fechas; precio por categoría |
| 8 | Perfil del estudiante (alergias, favoritos, calificaciones) y predicción de demanda con backtesting |
| 9 | Categoría preferida del estudiante |
| 10 | Historial de opiniones append-only (`opinion_registro`): editadas y eliminadas se conservan para el administrador |
| 11 | Correo del autor en el historial de opiniones |
| 12 | Inicio de sesión con Microsoft Entra ID (OIDC + PKCE) y tickets de acceso de un solo uso (`ticket_acceso`) |
| 13 | Índices de rendimiento en `menu_preparacion` |

## Historias de usuario y requisitos → endpoint

| Historia | Descripción | Endpoint |
|---|---|---|
| HU-14 | Distinción de roles | Middleware `requiereRol` |
| HU-15 | Login con correo institucional | `POST /api/auth/identificar`, `/login`, `/microsoft/*` |
| HU-01 | Registrar preparación con ingredientes | `POST /api/preparaciones` |
| HU-02 | Editar / desactivar preparación | `PUT /api/preparaciones/:id`, `PATCH .../desactivar` |
| HU-03 | Planificar el menú del día | `POST /api/menu/planificacion` |
| HU-04 | Publicar el menú del día | `PATCH /api/menu/:id/publicar` |
| HU-05 | Historial de menús publicados | `GET /api/menu/historial` |
| HU-06 | Registrar disponibilidad | `PATCH /api/menu/componentes/:id/disponibilidad` |
| HU-08 | Consulta pública del menú | `GET /api/menu/hoy` |
| HU-12 | Alérgenos desde catálogo fijo | `PUT /api/preparaciones/:id/alergenos` |
| HU-13 | Información nutricional | `PUT /api/preparaciones/:id/nutricion` |
| HU-20 | Opiniones y estrellas | `PUT /api/estudiante/calificaciones/:id` |
| RF-21 | Ingredientes por 100 g | `GET /api/ingredientes` |
| RF-22 | Cálculo nutricional desde ingredientes | `POST /api/preparaciones/calcular-nutricion` |
| RF-24 | Iniciar jornada | `POST /api/jornada/iniciar` |
| RF-25 | Venta de combo con un toque | `POST /api/jornada/ventas` |
| RF-26 | Stock exacto en tiempo real | `GET /api/jornada/hoy` + `GET /api/menu/eventos` (SSE) |
| RF-27 | Informe de agotamiento | `GET /api/analisis/mensual` |
| RF-28 | Roles Cajero y Nutricionista | Tabla `rol` (migración sprint 6) |
| — | Predicción de demanda y confiabilidad | `GET /api/prediccion/*` |

## Requisitos

- Node.js 20+
- PostgreSQL 14+
- `pg_dump` / `psql` en el PATH (solo para respaldos y para cargar `seed_demo.sql`)

## Instalación

```bash
npm install
cp .env.ejemplo .env      # completa DATABASE_URL y JWT_SECRET (ver tabla de variables)

createdb casino_duoc
npm run migrar            # crea el esquema y aplica las migraciones pendientes
npm run seed              # usuarios de prueba (contraseña Test1234)
psql -d casino_duoc -f database/seed_demo.sql    # catálogo y menús de demostración
npm run seed:ventas       # historial de ventas simuladas para la predicción

npm start                 # http://localhost:3000
```

`npm run migrar` registra lo aplicado en la tabla `schema_migraciones`. Si tu base ya tenía las migraciones aplicadas a mano, ejecuta una vez `npm run migrar -- --baseline`.

> `seed_demo.sql` **borra** preparaciones, menús y ventas antes de insertar. 

### Con Docker

Desde la raíz del repositorio: `docker compose up --build`. Ver el README raíz.

## Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| `DATABASE_URL` | Sí | Cadena de conexión a PostgreSQL |
| `JWT_SECRET` | Sí | Secreto de firma. En producción: mínimo 32 caracteres y distinto del ejemplo |
| `PORT` / `HOST` | No | Por defecto `3000` / `0.0.0.0` |
| `NODE_ENV` | No | `production` activa comprobaciones estrictas y HSTS |
| `CORS_ORIGIN` | Producción | URL(s) del frontend, separadas por coma |
| `JWT_EXPIRES_IN` / `JWT_EXPIRES_IN_KIOSCO` | No | Por defecto `8h` / `7d` |
| `SSO_SIMULADO` | No | `true` permite el acceso de estudiantes sin contraseña (solo demostración; **prohibido en producción**) |
| `HORA_CIERRE_AUTOMATICO` | No | Hora en que se cierran jornadas olvidadas. Por defecto `15:00` |
| `HORA_INICIO_AUTOMATICO` | No | Hora (`HH:MM`) desde la que la jornada de hoy se inicia sola con las cantidades planificadas. Vacía = desactivado (la inicia el personal desde Caja) |
| `DEMO_VENTAS_SIMULADAS` / `DEMO_VENTAS_POR_MINUTO` | No | **Solo demostración.** `true` registra combos simulados mientras la jornada está abierta, al ritmo indicado (por defecto `0.7` por minuto). Se guardan sin usuario (`venta_combo.id_usuario IS NULL`) |
| `TRUST_PROXY` | No | Número de proxies de confianza (para la IP real tras un proxy) |
| `LIMITE_LOGIN_POR_CUENTA` / `LIMITE_LOGIN_POR_IP` / `LIMITE_IDENTIFICAR_POR_IP` | No | Límites del limitador (8 / 40 / 600 por 15 min) |
| `EVENTOS_MAX_CONEXIONES` / `EVENTOS_MAX_POR_IP` | No | Límites de conexiones SSE (1000 / 40) |
| `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, `ENTRA_CLIENT_SECRET`, `ENTRA_REDIRECT_URI` | Para Microsoft | Configuración de Entra ID. Ver [`../docs/LOGIN_MICROSOFT.md`](../docs/LOGIN_MICROSOFT.md) |
| `ENTRA_DOMINIOS_ESTUDIANTES` / `ENTRA_DOMINIOS_PERSONAL` | No | Dominios permitidos (`duocuc.cl` / `duoc.cl,profesor.duoc.cl`) |
| `FRONTEND_URL` | Para Microsoft | A dónde vuelve el usuario tras iniciar sesión |
| `TEST_DATABASE_URL` | Para pruebas de integración | Base **exclusiva** de pruebas (su nombre debe contener `test` o `prueba`) |
| `RESPALDO_DIR` / `RESPALDO_CONSERVAR` | No | Carpeta y número de respaldos a conservar (14) |

### Automatizaciones de la demostración

El inicio automático y las ventas simuladas (`src/utils/demo.js`) no dependen de un reloj externo: se ejecutan cuando el servidor recibe visitas y cada minuto mientras está encendido. Así funcionan aunque el hosting gratuito haya dormido el servidor a la hora de inicio: la primera visita después de esa hora inicia la jornada y pone al día las ventas desde el inicio. Antes de iniciar la jornada, el menú público muestra *"Aún no inicia la jornada"* en lugar de *"Disponible"*.

Para borrar las jornadas iniciadas automáticamente y sus ventas simuladas:

```sql
BEGIN;
DELETE FROM movimiento_stock WHERE id_menu_preparacion IN (
  SELECT mp.id_menu_preparacion FROM menu_preparacion mp JOIN jornada j ON j.id_menu = mp.id_menu WHERE j.iniciada_por IS NULL);
DELETE FROM venta_combo WHERE id_jornada IN (SELECT id_jornada FROM jornada WHERE iniciada_por IS NULL);
DELETE FROM jornada WHERE iniciada_por IS NULL;
COMMIT;
```

## Scripts

| Comando | Qué hace |
|---|---|
| `npm start` / `npm run dev` | Servidor / servidor con recarga automática |
| `npm run migrar` | Aplica migraciones pendientes |
| `npm run seed` · `npm run seed:ventas` | Usuarios de prueba · ventas simuladas |
| `npm test` | Pruebas unitarias y de seguridad (sin base de datos) |
| `npm run test:db` | Pruebas de integración (jornada, estudiante, acceso) |
| `npm run respaldo` · `npm run respaldo:verificar` | Respaldo con `pg_dump` · respalda, restaura en la base de pruebas y compara |

## Pruebas

| Archivo | Tipo | Qué cubre |
|---|---|---|
| `tests/nutricion.test.js` | Unitaria | Cálculo nutricional por porción, "todo o nada" |
| `tests/prediccion.test.js` | Unitaria | Demanda, hora de agotamiento y backtesting |
| `tests/entra.test.js` | Unitaria (servidor Entra simulado) | PKCE, `state`, `nonce`, firma y audiencia del token |
| `tests/seguridad.test.js` | Seguridad | Encabezados, rutas protegidas, limitador, arranque en producción |
| `tests/integracion/jornada.integracion.js` | Integración (BD) | Ventas concurrentes, stock, SSE, cierre, nutrición, precios |
| `tests/integracion/estudiante.integracion.js` | Integración (BD) | Perfil, opiniones e historial, copia de menús, predicción |
| `tests/integracion/acceso.integracion.js` | Integración (BD) | Tickets de acceso y método de ingreso |

## Estructura

```
backend/
├── src/
│   ├── app.js                  Configuración de Express, seguridad y arranque
│   ├── config/db.js            Pool de PostgreSQL
│   ├── middleware/             auth (JWT) · roles · limitador · subida (multer) · errorHandler
│   ├── routes/                 auth · preparaciones · ingrediente · menu · jornada · analisis
│   │                           prediccion · estudiante · opiniones · usuarios
│   ├── controllers/            Validación de entrada y respuesta HTTP
│   ├── models/                 Acceso a datos (SQL) y transacciones
│   └── utils/                  entra · eventos (SSE) · fecha · nutricion · prediccion · stock
├── database/
│   ├── schema.sql              Esquema base
│   ├── migracion_sprintN.sql   Migraciones 3 a 13 (aplicadas por migrar.js)
│   ├── migrar.js · respaldo.js · verificar_respaldo.js
│   ├── seed_sprint1.js · seed_demo.sql · seed_demo_nutricion.sql · seed_ventas_simuladas.js
│   └── limpiar_datos.sql       Vacía los datos de operación (¡destructivo!)
├── tests/                      Unitarias, seguridad e integración
└── uploads/                    Imágenes subidas (no se versiona)
```

## Decisiones de diseño

- **Stock por movimientos (append-only):** el stock es la suma de `movimiento_stock.delta`; anular una venta crea el movimiento contrario. Nunca se edita ni se borra el historial.
- **Nutrición "todo o nada":** el sistema nunca completa datos nutricionales con supuestos; si falta un dato, muestra "No disponible".
- **Opiniones conservadas:** editar o eliminar una opinión no la borra; queda en `opinion_registro` para análisis del administrador.
- **Origen de los datos de venta:** `venta.origen_dato` distingue `real`, `importado` y `simulado`; los análisis avisan cuando incluyen datos simulados.
