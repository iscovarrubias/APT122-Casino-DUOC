# Casinos DUOC UC — Plataforma de gestión y consulta del menú

Proyecto APT122

Los estudiantes consultan el menú del casino desde la web antes de ir, mientra que el personal planifica el menú, controla la jornada y analiza la oferta.

## Equipo

| Integrante | Rol en el proyecto | Responsabilidades principales |
|---|---|---|
| Isabella Covarrubias | Líder técnica y desarrolladora full-stack | Definió la arquitectura del sistema (backend Express + PostgreSQL, frontend React) y las decisiones técnicas transversales: autenticación con JWT y Microsoft Entra ID, diseño del modelo de datos, control de acceso por rol, predicción de demanda y comunicación en tiempo real vía SSE. Implementó la mayor parte del código del backend y del frontend, y diseñó la identidad visual y el sistema de diseño (tema claro/oscuro, componentes reutilizables, iconografía). Coordinó el alcance del MVP y la priorización del backlog. |
| Diego Díaz | Analista de calidad, infraestructura y documentación | Revisó y ajustó el código para asegurar que cumpliera los requisitos funcionales y las condiciones del alcance definidas para el proyecto, verificando consistencia entre lo implementado y lo especificado. Diseñó y validó el comportamiento responsive de la interfaz en móvil, tablet y escritorio. Mantuvo actualizada la documentación técnica (API, UML, guía de despliegue, manuales) y apoyó la revisión de entregables y de la base de pruebas. |


## Qué hace

**Estudiantes (la consulta del menú no requiere cuenta)**
- Menú del día por categoría (General, JUNAEB, Vegetariano, Hipocalórico) con precio, calorías, ingredientes, tabla nutricional y alérgenos.
- Disponibilidad en tiempo real: cuánto queda de cada plato, lo agotado o con la jornada cerrada se ve en gris.
- Menú semanal y preguntas frecuentes.
- Con sesión institucional: alergias propias, favoritos con alerta, calificación con estrellas y opiniones.

**Personal del casino**
- *Caja*: venta de un combo con un toque, descuenta stock exacto del plato y de los acompañamientos. 
- *Disponibilidad*: estado de la jornada, porciones restantes, cierre con conteo de sobrantes.
- *Planificación del menú*: por día y por mes, con sugerencia de cantidades según el historial, copia de menús y exportación (Excel / imagen).
- *Ingredientes y preparaciones*: catálogo con valores por 100 g, cálculo nutricional automático y alérgenos de catálogo fijo.
- *Análisis*: ventas y agotamiento, predicción de demanda (con su error medido contra datos pasados), opiniones y favoritos.
- *Usuarios y roles*: Administrador, Personal Casino, Cajero, Nutricionista, Estudiante.

## Tecnología

| Capa | Herramientas |
|---|---|
| Frontend | React 19, Vite 8, CSS propio (sistema de diseño en `diseno.css`), tema claro/oscuro, ExcelJS |
| Backend | Node.js, Express 5, JWT, bcrypt, SSE |
| Base de datos | PostgreSQL 14+ |
| Autenticación | Contraseña (personal) y Microsoft Entra ID (OIDC + PKCE) |
| Calidad | `node:test`, Vitest, oxlint, GitHub Actions |
| Despliegue | Docker y Docker Compose |

## Estructura del repositorio

```
backend/        API REST, modelos, migraciones SQL, pruebas
frontend/       Aplicación web (React)
docs/           API.md, LOGIN_MICROSOFT.md, diagramas UML
.github/        Integración continua
docker-compose.yml   Levanta base de datos + backend + frontend
```

## Puesta en marcha con Docker 

Requisito: Docker Desktop (o Docker Engine + Compose).

```bash
cp .env.example .env          # Se debe cambiar JWT_SECRET y POSTGRES_PASSWORD
docker compose up --build     
```

- Aplicación: http://localhost:8080
- API: http://localhost:3000/api/health

Las migraciones se aplican solas al arrancar, para cargar datos de demostración (una sola vez):

```bash
docker compose exec backend npm run seed
docker compose exec -T db psql -U casino -d casino_duoc < backend/database/seed_demo.sql
docker compose exec backend npm run seed:ventas
```

Detener: `docker compose down` (los datos se conservan). Borrar también los datos: `docker compose down -v`.

## Puesta en marcha sin Docker

Requisitos: Node.js 22+ y PostgreSQL 14+.

```bash
# 1. Base de datos
createdb casino_duoc

# 2. Backend
cd backend
npm install
cp .env.ejemplo .env        # completa DATABASE_URL y JWT_SECRET
npm run migrar              # crea el esquema y aplica las migraciones pendientes
npm run seed                # usuarios de prueba
psql "$DATABASE_URL" -f database/seed_demo.sql
npm run seed:ventas         # historial simulado para la predicción
npm start                   # http://localhost:3000

# 3. Frontend 
cd frontend
npm install
cp .env.example .env
npm run dev                 # http://localhost:5173
```

Usuarios de prueba (contraseña `Test1234`): `admin@duocuc.cl`, `personal@duocuc.cl`, `estudiante@duocuc.cl`. Son solo para desarrollo.

## Pruebas

```bash
cd backend
npm test            # unitarias y de seguridad (no necesitan base de datos)
npm run test:db     # integración (necesita TEST_DATABASE_URL, base exclusiva de pruebas)

cd ../frontend
npm test            # pruebas de componentes (Vitest)
npm run lint
npm run build
```

`TEST_DATABASE_URL` debe apuntar a una base distinta de `DATABASE_URL` y con "test" o "prueba" en el nombre: las pruebas crean y borran datos. 
GitHub Actions ejecuta todo esto en cada push y pull request (`.github/workflows/ci.yml`).

## Seguridad

- Contraseñas con bcrypt; sesiones con JWT con expiración.
- Límite de intentos fallidos de login por cuenta e IP.
- Control de acceso por rol en cada ruta del personal.
- En producción el servidor **no arranca** si el `JWT_SECRET` es de ejemplo o tiene menos de 32 caracteres, si falta `CORS_ORIGIN` o si `SSO_SIMULADO=true`.
- Encabezados de seguridad, `x-powered-by` desactivado, cuerpo JSON limitado a 100 kb, subidas de imágenes verificadas por contenido.
- Acceso único por correo: el sistema detecta el rol y el método (contraseña, Microsoft o demostración).
- **Microsoft Entra ID** está implementado (OIDC con PKCE, `state` y `nonce`, validación de firma del token, tickets de un solo uso) y se activa con las variables `ENTRA_*`. Probado con un tenant de pruebas: ver [`docs/LOGIN_MICROSOFT.md`](docs/LOGIN_MICROSOFT.md).
- `SSO_SIMULADO` existe solo para demostración: permite entrar con un correo `@duocuc.cl` sin contraseña.

## Respaldos

```bash
cd backend
npm run respaldo                      # crea backend/respaldos/casino_AAAAMMDD_HHMM.sql (conserva los últimos 14)
psql "$DATABASE_URL" -f backend/respaldos/casino_AAAAMMDD_HHMM.sql    # restaurar
npm run respaldo:verificar            # respalda DATABASE_URL, lo restaura en TEST_DATABASE_URL y compara tabla por tabla
```

Requiere `pg_dump` instalado.

## Limitaciones conocidas

- El acceso con Microsoft está probado con un tenant de pruebas, falta la configuración con el tenant real de DUOC (solo cambian variables `ENTRA_*`).
- La predicción de demanda es estadística simple (promedio ponderado de los últimos mismos días de la semana, corregido por agotamientos), no es aprendizaje automático. La pantalla de análisis muestra su error contra los datos probados.
- Los datos de venta de demostración son simulados: las métricas de predicción están validadas sobre datos sintéticos, no sobre ventas reales del concesionario.
- Sesión en `localStorage` y limitadores en memoria: adecuados para un MVP de una sola instancia.
- Sin despliegue público todavía.

## Documentación

| Documento | Dónde |
|---|---|
| Referencia de la API | [`docs/API.md`](docs/API.md) |
| Diagramas UML (clases, componentes) | [`docs/UML/`](docs/UML) |
| Login con Microsoft | [`docs/LOGIN_MICROSOFT.md`](docs/LOGIN_MICROSOFT.md) |
| Backend (sprints, variables, pruebas) | [`backend/README.md`](backend/README.md) |
| Frontend (estructura, scripts) | [`frontend/README.md`](frontend/README.md) |
| Documentos académicos (alcance, requisitos, arquitectura, plan de pruebas, retrospectivas) | `FASE 1/` y `FASE 2/` |
