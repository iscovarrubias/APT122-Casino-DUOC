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


## Requisitos

- Node.js 18+
- PostgreSQL 14+

## Instalación

```bash
npm install
cp .env.ejemplo .env
```

## Base de datos

```bash
createdb casino_duoc

psql -d casino_duoc -f database/schema.sql

npm run seed
```

## Levantar el servidor

```bash
npm start
```
`http://localhost:3000`


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

