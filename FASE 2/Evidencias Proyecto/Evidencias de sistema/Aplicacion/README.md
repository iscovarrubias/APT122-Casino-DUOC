# Casinos DUOC UC: plataforma de gestión y consulta del menú

Proyecto APT122, sede Valparaíso.

Los estudiantes consultan el menú del casino desde la web antes de ir, mientras que el personal planifica el menú, controla la jornada de almuerzos y analiza la oferta con datos.

**Aplicación publicada:** [casino-duoc-web.onrender.com](https://casino-duoc-web.onrender.com/)

## Qué hace

### Estudiantes

La consulta del menú no requiere cuenta:

- Menú del día por categoría (General, JUNAEB, Vegetariano e Hipocalórico) con foto, precio del combo, calorías totales, ingredientes, tabla nutricional y alérgenos de cada componente.
- Disponibilidad en tiempo real, se ve cuántas porciones quedan y los platos agotados aparecen en gris. La página se actualiza sola cuando cambia el stock.
- Avisos según el momento del día:

  | Momento | Qué muestra el menú |
  |---|---|
  | Antes de iniciar la jornada | "Aún no inicia la jornada" en cada plato, sin porciones |
  | Jornada abierta | "Disponible" y las porciones que quedan |
  | Después del cierre | Un aviso de que la jornada de almuerzos ya cerró, con el menú del día en gris como referencia |
  | Sábado y domingo sin menú | Un aviso de que esos días no hay menú, con acceso al menú semanal |

- Menú semanal de lunes a viernes, los fines de semana muestra la semana siguiente.
- Preguntas frecuentes.

Con la cuenta institucional (Microsoft Entra ID) se suma el perfil del estudiante: alergias propias con aviso en los platos que las contienen, categoría de menú favorita, platos favoritos con alerta y calificaciones con estrellas y comentario.

### Personal del casino

Cada rol ve solo lo que le corresponde:

| Módulo | Qué permite |
|---|---|
| Caja | Vender un combo con un toque (también solo plato o completo con bebida de máquina), con descuento del stock exacto del plato y de los acompañamientos |
| Disponibilidad | Iniciar la jornada con las cantidades reales, ajustar el stock, marcar platos agotados y cerrar con conteo de sobrantes |
| Planificación | Armar el menú por día o por mes, con sugerencias de cantidad según el historial, copia de menús entre fechas y exportación a Excel o imagen |
| Recetas y variaciones | Revisar la receta de cada plato desde la planificación (ingredientes, gramos, alérgenos y nutrición) y crear una variación cuando un día se prepara distinto, sin modificar la receta original |
| Ingredientes y preparaciones | Catálogo de ingredientes con valores por 100 g, cálculo nutricional automático por porción y alérgenos de catálogo fijo |
| Análisis | Ventas, agotamientos, hora estimada de agotamiento, predicción de demanda con su error medido, opiniones y favoritos |
| Usuarios | Cuentas y roles: Administrador, Personal Casino, Cajero, Nutricionista y Estudiante |

## Tecnología

| Capa | Herramientas |
|---|---|
| Frontend | React 19, Vite 8, CSS propio con sistema de diseño (`diseno.css`), tema claro y oscuro, ExcelJS |
| Backend | Node.js 20+, Express 5, JWT, bcrypt y SSE |
| Base de datos | PostgreSQL 14+ |
| Autenticación | Contraseña para el personal y Microsoft Entra ID (OIDC con PKCE) para los estudiantes |
| Calidad | `node:test`, Vitest con Testing Library, cobertura de código, pruebas de carga, oxlint y GitHub Actions |
| Despliegue | Render (frontend y backend) con Neon (PostgreSQL), o Docker Compose para levantarlo en local |

## Estructura

```text
Aplicacion/
├── backend/             API REST, modelos, migraciones SQL, scripts de datos y pruebas
├── frontend/            Aplicación web en React
├── docs/                Referencia de la API y guía del login con Microsoft
├── .env.ejemplo         Variables para Docker Compose
└── docker-compose.yml   Levanta la base de datos, el backend y el frontend
```

## Despliegue actual

| Parte | Servicio |
|---|---|
| Frontend | Render, en [casino-duoc-web.onrender.com](https://casino-duoc-web.onrender.com/) |
| Backend | Render |
| Base de datos | Neon (PostgreSQL) |

Los dos servicios usan el plan gratuito de Render, que apaga el servidor después de unos 15 minutos sin visitas, por eso la primera carga puede tardar cerca de un minuto. Las variables del backend se configuran en Render y están descritas en el [README del backend](backend/README.md).

Cuando se agrega una migración nueva hay que aplicarla en Neon antes de publicar el código que la usa, con `npm run migrar` apuntando a la base de Neon o pegando el SQL en su editor.

## Puesta en marcha con Docker

Requisito: Docker Desktop, o Docker Engine con Compose.

```bash
cp .env.ejemplo .env          # cambia JWT_SECRET y POSTGRES_PASSWORD
docker compose up --build
```

- Aplicación: http://localhost:8080
- API: http://localhost:3000/api/health

Las migraciones se aplican solas al arrancar. Para cargar los datos de demostración, una sola vez:

```bash
docker compose exec backend npm run seed
docker compose exec -T db psql -U casino -d casino_duoc < backend/database/seed_demo.sql
docker compose exec backend npm run seed:ventas
```

Para detenerlo usa `docker compose down` (los datos se conservan), y para borrar también los datos, `docker compose down -v`.

## Puesta en marcha sin Docker

Requisitos: Node.js 22+ (el frontend lo exige) y PostgreSQL 14+.

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
cd ../frontend
npm install
cp .env.example .env
npm run dev                 # http://localhost:5173
```

Usuarios de prueba (contraseña `Test1234`): `admin@duocuc.cl`, `personal@duocuc.cl` y `estudiante@duocuc.cl`. Son solo para desarrollo, en una base publicada hay que cambiar sus contraseñas o eliminarlos, porque este repositorio es público.

### Menú de Campomar para la demostración

`backend/database/seed_menu_campomar.sql` carga el menú del afiche real de Campomar en la semana en curso, y `backend/database/repetir_menu_campomar.sql` lo copia a las semanas siguientes, publicado y con todos los platos disponibles. El segundo script se puede volver a correr, porque se salta los días que ya tienen una jornada iniciada.

## Pruebas

```bash
cd backend
npm test            # unitarias y de seguridad, no necesitan base de datos
npm run test:db     # integración, necesita TEST_DATABASE_URL con una base exclusiva de pruebas
npm run test:bd     # seguridad, robustez, rendimiento y recetas contra la base de pruebas
npm run test:cov    # todo lo anterior con informe de cobertura

cd ../frontend
npm test            # pruebas de componentes y páginas (Vitest)
npm run test:cov    # lo mismo con informe de cobertura
npm run lint
npm run build
```

`TEST_DATABASE_URL` debe apuntar a una base distinta de `DATABASE_URL` y con "test" o "prueba" en el nombre, porque las pruebas crean y borran datos. GitHub Actions ejecuta todo esto en cada push y pull request (`.github/workflows/ci.yml`, en la raíz del repositorio), y el backend falla si la cobertura baja del 80 % de líneas y el frontend si baja del 90 %. En total son más de 530 casos entre backend y frontend, con un 88 % de cobertura en el backend y un 92 % en el frontend. Incluyen pruebas de carga de hora punta, pruebas que recorren todas las rutas buscando errores 500 y una prueba de contrato que revisa que el frontend solo llame a rutas que existen en el backend.

## Seguridad

- Contraseñas con bcrypt y sesiones con JWT que expiran.
- Límite de intentos fallidos de login por cuenta y por IP.
- Control de acceso por rol en cada ruta del personal, tanto en el backend como en el frontend.
- En producción el servidor no arranca si `JWT_SECRET` es el de ejemplo o tiene menos de 32 caracteres, si falta `CORS_ORIGIN` o si `SSO_SIMULADO=true`.
- Encabezados de seguridad, `x-powered-by` desactivado, cuerpo JSON limitado a 100 kb y verificación del contenido real de las imágenes subidas.
- Acceso único por correo, el sistema detecta el rol y el método de ingreso (contraseña, Microsoft o demostración).
- Microsoft Entra ID con OIDC y PKCE, `state` y `nonce`, validación de la firma del token y tickets de un solo uso. Se activa con las variables `ENTRA_*`, ver [`docs/LOGIN_MICROSOFT.md`](docs/LOGIN_MICROSOFT.md).
- `SSO_SIMULADO` existe solo para demostraciones locales, permite entrar con un correo `@duocuc.cl` sin contraseña.

## Respaldos

```bash
cd backend
npm run respaldo                      # crea backend/respaldos/casino_AAAAMMDD_HHMM.sql y conserva los últimos 14
psql "$DATABASE_URL" -f respaldos/casino_AAAAMMDD_HHMM.sql    # restaura un respaldo
npm run respaldo:verificar            # respalda DATABASE_URL, lo restaura en TEST_DATABASE_URL y compara tabla por tabla
```

Requiere `pg_dump` instalado. En Neon también se puede crear un branch de la base como respaldo antes de un cambio grande.

## Limitaciones conocidas

- El acceso con Microsoft está probado con un tenant de pruebas propio, para usarlo con las cuentas de DUOC solo hay que cambiar las variables `ENTRA_*` por las del tenant institucional.
- La predicción de demanda es estadística (promedio ponderado de los últimos mismos días de la semana, corregido por agotamientos) y no aprendizaje automático, la pantalla de análisis muestra su error contra los datos probados.
- Las ventas de demostración son simuladas, así que la predicción está validada con datos sintéticos y no con ventas reales del concesionario.
- El sistema no puede comprobar físicamente cómo se preparó un plato, lo que asegura es trazabilidad: la receta se revisa al planificar y, si un día cambia, se registra como una variación con sus propios ingredientes y alérgenos.
- La sesión se guarda en `localStorage` y los limitadores funcionan en memoria, lo que es suficiente para un MVP de una sola instancia.
- El plan gratuito de Render apaga el servidor sin visitas, por eso la primera carga es lenta.

## Documentación

| Documento | Dónde |
|---|---|
| Referencia de la API | [`docs/API.md`](docs/API.md) |
| Login con Microsoft | [`docs/LOGIN_MICROSOFT.md`](docs/LOGIN_MICROSOFT.md) |
| Backend: sprints, variables, scripts y pruebas | [`backend/README.md`](backend/README.md) |
| Frontend: pantallas, estructura y pruebas | [`frontend/README.md`](frontend/README.md) |
| Diagramas UML, modelo de datos y documentos académicos | Carpetas `FASE 1/` y `FASE 2/` en la raíz del repositorio |
