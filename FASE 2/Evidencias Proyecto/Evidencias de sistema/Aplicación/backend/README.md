# Casino DUOC UC — Backend (Sprint 1 y 2)

Backend del MVP de la Plataforma de Gestión y Análisis de la Oferta
Gastronómica del Casino DUOC UC. APT122, Fase 2.

## Sprint 1 y 2: qué incluye

**Sprint 1** (semanas 5-6): login, roles, gestión básica de preparaciones.
**Sprint 2** (semanas 7-8): planificación de menú, alérgenos, nutrición.

| Historia | Descripción | Endpoint |
|---|---|---|
| HU-14 | Distinción de roles (estudiante / personal / administrador) | Middleware `requiereRol` |
| HU-15 | Login con correo institucional | `POST /api/auth/login` |
| HU-01 | Registrar una preparación con ingredientes | `POST /api/preparaciones` |
| HU-02 | Editar / desactivar una preparación | `PUT /api/preparaciones/:id`, `PATCH /api/preparaciones/:id/desactivar` |
| RF-08 | Consulta pública del menú del día con disponibilidad más reciente | `GET /api/menu/hoy` |
| HU-03 | Planificar el menú: un plato principal por categoría + compartidos | `POST /api/menu/planificacion` |
| HU-04 | Publicar el menú del día | `PATCH /api/menu/:id/publicar` |
| HU-12 | Asignar alérgenos desde catálogo fijo | `PUT /api/preparaciones/:id/alergenos`, `GET /api/preparaciones/alergenos` |
| HU-13 | Registrar información nutricional y marcarla como validada | `PUT /api/preparaciones/:id/nutricion` |

Todas probadas de punta a punta antes de entregarse (ver sección de pruebas
manuales más abajo).

## Requisitos

- Node.js 18+
- PostgreSQL 14+ (con la base de datos ya creada)

## Instalación

```bash
npm install
cp .env.ejemplo .env
# Edita .env con los datos reales de tu conexión a PostgreSQL
```

## Base de datos

```bash
# Crear la base de datos (una sola vez)
createdb casino_duoc

# Cargar el esquema (16 tablas + catálogos iniciales)
psql -d casino_duoc -f database/schema.sql

# Crear usuarios de prueba (uno por rol, contraseña: Test1234)
npm run seed
```

> `schema.sql` corresponde al modelo del Documento de Alcance
> (`modelo_datos_casino_duoc.sql`), con una diferencia: la columna
> `password_hash` en `usuario`, que no estaba en el modelo original
> porque el login se definió recién al armar el backlog. Queda
> documentado aquí para que el cambio sea trazable.

## Levantar el servidor

```bash
npm start
```

Por defecto queda en `http://localhost:3000`.

## Probar manualmente

```bash
# 1. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"personal@duocuc.cl","password":"Test1234"}'
# copia el "token" de la respuesta

# 2. Crear una preparación (requiere rol Personal Casino o Administrador)
curl -X POST http://localhost:3000/api/preparaciones \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"nombre":"Charquicán","precio":2500,"ingredientes":["Zapallo","Papa","Choclo"]}'

# 3. Listar preparaciones (acceso público, sin token)
curl http://localhost:3000/api/preparaciones

# 4. Menú del día con disponibilidad (acceso público, sin token)
curl http://localhost:3000/api/menu/hoy
curl "http://localhost:3000/api/menu/hoy?categoria=Vegetariano"

# 5. Planificar un plato principal para una categoría
curl -X POST http://localhost:3000/api/menu/planificacion \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"fecha":"2026-09-20","id_preparacion":1,"tipo_componente":"Plato Principal","categoria":"Principal","cantidad_planificada":30}'

# 6. Planificar un componente compartido (sin categoría)
curl -X POST http://localhost:3000/api/menu/planificacion \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"fecha":"2026-09-20","id_preparacion":5,"tipo_componente":"Entrada","cantidad_planificada":80}'

# 7. Publicar el menú (usa el id_menu que devolvió el paso 5)
curl -X PATCH http://localhost:3000/api/menu/1/publicar -H "Authorization: Bearer TOKEN"

# 8. Asignar alérgenos desde el catálogo fijo
curl -X PUT http://localhost:3000/api/preparaciones/5/alergenos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"alergenos":["Frutos secos"]}'

# 9. Cargar información nutricional y marcarla como validada
curl -X PUT http://localhost:3000/api/preparaciones/5/nutricion \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"calorias":120,"proteinas_g":3,"carbohidratos_g":10,"grasas_g":5,"fuente":"Nutricionista Silvia Aguilera","validado":true}'
```

## Estructura del proyecto
src/
app.js # punto de entrada de Express (CORS, validación de .env al arrancar)
config/db.js # conexión a PostgreSQL (pool)
middleware/
auth.js # verifica el token JWT
roles.js # HU-14: control de acceso por rol
errorHandler.js # manejo de errores centralizado
routes/
auth.routes.js
preparaciones.routes.js
menu.routes.js
controllers/
auth.controller.js # HU-15
preparaciones.controller.js # HU-01, HU-02
menu.controller.js # RF-08: consulta pública del menú del día
models/
usuario.model.js
preparacion.model.js # HU-01, HU-02, HU-12 (alérgenos), HU-13 (nutrición)
menu.model.js # HU-03, HU-04 (planificación) y RF-08 (combo del día)
database/
schema.sql # esquema completo (16 tablas)
seed_sprint1.js # usuarios de prueba


## Decisiones de diseño (evidencia de C4)

- **El control de acceso por rol vive en el backend, no en el frontend**
  (middleware `requiereRol`), tal como se definió en el Documento de
  Arquitectura: un usuario con rol incorrecto es rechazado por la API,
  no solo "escondido" en la interfaz.
- **El login no revela si un correo existe o no.** Contraseña incorrecta y
  correo inexistente devuelven exactamente el mismo mensaje de error
  (criterio de aceptación de HU-15).
- **La consulta de menú (`GET /api/preparaciones`, `GET /api/menu/hoy`) es
  pública, sin sesión.** Solo la gestión (crear, editar, desactivar,
  cambiar disponibilidad) exige login y rol, según quedó definido al
  aclarar que preferencias y opiniones sí requieren cuenta, pero la
  consulta básica no.
- **Desactivar una preparación no la elimina** (columna `activa`), solo deja
  de ofrecerla; se puede reactivar más adelante sin perder su historial de
  ingredientes o de menús pasados en los que apareció.
- **Todos los errores pasan por un manejador central** (`errorHandler.js`),
  que traduce errores de PostgreSQL (`23505` duplicado, `23503` llave
  foránea inválida, `23502` campo obligatorio faltante, `23514` regla de
  validación incumplida) y JSON malformado a mensajes claros para el
  cliente, en vez de exponer el error técnico crudo.
- **El servidor valida `.env` al arrancar** (`JWT_SECRET`, `DATABASE_URL`):
  si falta alguno, falla de inmediato con un mensaje claro, en vez de
  arrancar "bien" y recién romperse en el primer login.

## Pendiente para próximos sprints

- Endpoints de disponibilidad (HU-06, HU-07) — Sprint 3.
- Registro de usuarios (`POST /api/auth/registro`), que no estaba en el
  backlog original de este sprint. Falta evaluar si se necesita o si los
  usuarios se cargan directamente por el administrador.
- Pruebas automatizadas, por ahora las pruebas fueron manuales vía curl,
  falta el plan de pruebas formal con matriz de trazabilidad, que
  corresponde al Sprint 5 según el plan de trabajo.
- Confirmar con administración de la sede si el stack definitivo será
  este (Node.js/Express + PostgreSQL) o el alternativo (Laravel/MySQL).