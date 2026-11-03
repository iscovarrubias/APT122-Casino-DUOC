# Casinos DUOC UC — Plataforma de gestión y consulta del menú

Proyecto APT122 (Capstone, DUOC UC). Los estudiantes consultan el menú del casino desde el celular antes de ir; el personal planifica el menú, controla la jornada y analiza la oferta.

## Qué hace

**Estudiantes (sin cuenta)**
- Menú del día por categoría (Principal, JUNAEB, Vegetariano, Hipocalórico) con precio, calorías, ingredientes, tabla nutricional y alérgenos.
- Disponibilidad en tiempo real: cuánto queda de cada plato; lo agotado o con la jornada cerrada se ve en gris.
- Menú semanal y preguntas frecuentes.
- Con sesión institucional: alergias propias, favoritos con alerta, calificación con estrellas y opiniones.

**Personal del casino**
- *Caja*: venta de un combo con un toque; descuenta stock exacto del plato y de los acompañamientos. Se puede deshacer.
- *Disponibilidad*: estado de la jornada, porciones restantes, cierre con conteo de sobrantes.
- *Planificación del menú*: por día y por mes, con sugerencia de cantidades según el historial, copia de menús y exportación (Excel / imagen).
- *Ingredientes y preparaciones*: catálogo con valores por 100 g, cálculo nutricional automático y alérgenos de catálogo fijo.
- *Análisis*: ventas y agotamiento, predicción de demanda (con su error medido contra datos pasados) y opiniones.
- *Usuarios y roles*: Administrador, Personal Casino, Cajero, Nutricionista, Estudiante.

## Tecnología

| Capa | Herramientas |
|---|---|
| Frontend | React 19, Vite, CSS propio (sistema de diseño en `diseno.css`), tema claro/oscuro |
| Backend | Node.js, Express 5, JWT, bcrypt |
| Base de datos | PostgreSQL 14+ |
| Calidad | `node:test`, oxlint, GitHub Actions |

## Estructura

```
backend/    API REST, modelos, migraciones SQL, pruebas
frontend/   Aplicación web (React)
.github/    Integración continua
```

## Puesta en marcha

Requisitos: Node.js 20+ y PostgreSQL 14+.

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

# 3. Frontend (otra terminal)
cd frontend
npm install
npm run dev
```

Usuarios de prueba (contraseña `Test1234`): `admin@duocuc.cl`, `personal@duocuc.cl`, `estudiante@duocuc.cl`. Son solo para desarrollo.

Si tu base ya tenía las migraciones aplicadas a mano, ejecuta una vez `npm run migrar -- --baseline` para registrarlas sin volver a correrlas.

## Pruebas

```bash
cd backend
npm test            # unitarias y de seguridad (no necesitan base de datos)
npm run test:db     # integración (necesita TEST_DATABASE_URL, una base exclusiva de pruebas)

cd ../frontend
npm run lint
npm run build
```

`TEST_DATABASE_URL` debe apuntar a una base distinta de `DATABASE_URL` y con "test" o "prueba" en el nombre: las pruebas crean y borran datos. GitHub Actions ejecuta todo esto en cada push y pull request (`.github/workflows/ci.yml`).

## Seguridad

- Contraseñas con bcrypt; sesiones con JWT con expiración.
- Límite de intentos fallidos de login por cuenta e IP.
- Control de acceso por rol en cada ruta del personal.
- En producción el servidor **no arranca** si el `JWT_SECRET` es de ejemplo o tiene menos de 32 caracteres, si falta `CORS_ORIGIN` o si `SSO_SIMULADO=true`.
- Encabezados de seguridad, `x-powered-by` desactivado, cuerpo JSON limitado a 100 kb, subidas de imágenes con restricciones.
- El acceso es único (correo → detecta el rol). El inicio con Microsoft Entra ID está implementado y apagado por defecto; ver `docs/LOGIN_MICROSOFT.md`.
- `SSO_SIMULADO` existe solo para demostración: permite entrar con un correo `@duocuc.cl` sin contraseña. Una versión real debe integrarse con el inicio de sesión institucional.

## Respaldos

```bash
cd backend
npm run respaldo                      # crea backend/respaldos/casino_AAAAMMDD_HHMM.sql (conserva los últimos 14)
psql "$DATABASE_URL" -f backend/respaldos/casino_AAAAMMDD_HHMM.sql    # restaurar
npm run respaldo:verificar            # respalda DATABASE_URL, lo restaura en TEST_DATABASE_URL y compara tabla por tabla
```

Requiere `pg_dump` instalado. Para automatizarlo, programa ese comando una vez al día (cron o Programador de tareas).

## Limitaciones conocidas

- El inicio de sesión institucional es simulado.
- La predicción de demanda es estadística simple (promedio ponderado de los últimos mismos días de la semana, corregido por agotamientos); no es aprendizaje automático. La pantalla de análisis muestra su error contra los datos probados.
- Los datos de venta de demostración son simulados.
- Sin despliegue público todavía.

## Documentación del proyecto

Detalle de historias de usuario, endpoints y sprints en [`backend/README.md`](backend/README.md).
