# Casino DUOC UC — Backend

Backend del MVP de la Plataforma de Gestión y Análisis de la Oferta
Gastronómica del Casino DUOC UC. APT122, Fase 2.

Node.js + Express + PostgreSQL. API REST con autenticación JWT,
control de acceso por rol, stock exacto por jornada, predicción de
demanda y módulo de perfil del estudiante.

## Qué incluye

**Sprint 1** (semanas 5-6): login, roles, gestión de preparaciones.
**Sprint 2** (semanas 7-8): planificación de menú, alérgenos, nutrición.
**Sprint 3**: disponibilidad del día, historial de menús, análisis básico.
**Sprint 4**: tipo de componente (Entrada, Postre, Bebida), subida de imágenes.
**Sprint 5**: ingredientes con cantidades y datos nutricionales, cálculo automático de nutrición por receta.
**Sprint 6**: jornada (inicio, venta, cierre), stock exacto, roles Cajero y Nutricionista, SSE en tiempo real.
**Sprint 7**: vista mensual del calendario, copiar menús entre fechas.
**Sprint 8**: perfil del estudiante (alergias, favoritos, calificaciones), predicción de demanda con backtesting, opiniones públicas.
**Sprint 9**: categoría preferida del estudiante.

| Historia | Descripción | Endpoint |
|---|---|---|
| HU-14 | Distinción de roles | Middleware `requiereRol` |
| HU-15 | Login con correo institucional | `POST /api/auth/login` |
| HU-01 | Registrar preparación con ingredientes | `POST /api/preparaciones` |
| HU-02 | Editar / desactivar preparación | `PUT /api/preparaciones/:id` |
| HU-03 | Planificar el menú del día | `POST /api/menu/planificacion` |
| HU-04 | Publicar el menú del día | `PATCH /api/menu/:id/publicar` |
| HU-05 | Historial de menús publicados | `GET /api/menu/historial` |
| HU-06 | Registrar disponibilidad durante la jornada | `PATCH /api/menu/componentes/:id/disponibilidad` |
| HU-12 | Asignar alérgenos desde catálogo fijo | `PUT /api/preparaciones/:id/alergenos` |
| HU-13 | Registrar información nutricional | `PUT /api/preparaciones/:id/nutricion` |
| HU-20 | Opiniones y valoración con estrellas | `PUT /api/estudiante/calificaciones/:id` |
| RF-08 | Consulta pública del menú del día | `GET /api/menu/hoy` |
| RF-21 | Ingredientes con composición por 100 g | `GET /api/ingredientes` |
| RF-22 | Cálculo nutricional desde ingredientes | `POST /api/preparaciones/calcular-nutricion` |
| RF-24 | Iniciar jornada del día | `POST /api/jornada/iniciar` |
| RF-25 | Registrar venta de combo con un toque | `POST /api/jornada/ventas` |
| RF-26 | Stock exacto en tiempo real | `GET /api/jornada/hoy` + SSE |
| RF-27 | Ranking mensual de agotamiento | `GET /api/analisis/mensual` |
| RF-28 | Roles Cajero y Nutricionista | `INSERT INTO rol` |

## Requisitos

- Node.js 18+
- PostgreSQL 14+

## Instalación

```bash
npm install
cp .env.ejemplo .env

## Base de datos

createdb casino_duoc

psql -d casino_duoc -f database/schema.sql
psql -d casino_duoc -f database/migracion_sprint3.sql
psql -d casino_duoc -f database/migracion_sprint4.sql
psql -d casino_duoc -f database/migracion_sprint5.sql
psql -d casino_duoc -f database/migracion_sprint6.sql
psql -d casino_duoc -f database/migracion_sprint7.sql
psql -d casino_duoc -f database/migracion_sprint8.sql
psql -d casino_duoc -f database/migracion_sprint9.sql

npm run seed
psql -d casino_duoc -f database/seed_demo.sql
npm run seed:ventas

## Levantar el servidor

```bash
npm start
```
`http://localhost:3000`


```

backend/
├── src/
│   ├── app.js                       
│   ├── config/db.js                
│   ├── middleware/
│   │   ├── auth.js                  
│   │   ├── roles.js                 
│   │   ├── errorHandler.js          
│   │   └── subida.js                
│   ├── routes/
│   │   ├── auth.routes.js           
│   │   ├── preparaciones.routes.js  
│   │   ├── ingrediente.routes.js    
│   │   ├── menu.routes.js           
│   │   ├── jornada.routes.js        
│   │   ├── analisis.routes.js       
│   │   ├── prediccion.routes.js     
│   │   ├── estudiante.routes.js     
│   │   ├── opiniones.routes.js      
│   │   └── usuarios.routes.js       
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── preparaciones.controller.js
│   │   ├── ingrediente.controller.js
│   │   ├── menu.controller.js
│   │   ├── jornada.controller.js
│   │   ├── analisis.controller.js
│   │   ├── prediccion.controller.js
│   │   ├── estudiante.controller.js
│   │   └── usuarios.controller.js
│   ├── models/
│   │   ├── usuario.model.js
│   │   ├── preparacion.model.js
│   │   ├── ingrediente.model.js
│   │   ├── menu.model.js
│   │   ├── jornada.model.js
│   │   ├── analisis.model.js
│   │   ├── prediccion.model.js
│   │   └── estudiante.model.js
│   └── utils/
│       ├── fecha.js                 
│       ├── nutricion.js             
│       ├── prediccion.js            
│       ├── stock.js                 
│       └── eventos.js               
├── database/
│   ├── schema.sql                   
│   ├── migracion_sprint3.sql        
│   ├── migracion_sprint4.sql        
│   ├── migracion_sprint5.sql        
│   ├── migracion_sprint6.sql        
│   ├── migracion_sprint7.sql        
│   ├── migracion_sprint8.sql        
│   ├── migracion_sprint9.sql        
│   ├── seed_sprint1.js              
│   ├── seed_demo.sql                
│   └── seed_ventas_simuladas.js     
└── tests/
    ├── nutricion.test.js
    ├── prediccion.test.js
    └── integracion/
        ├── jornada.integracion.js
        └── estudiante.integracion.js