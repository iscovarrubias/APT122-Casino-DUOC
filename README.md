# Proyecto APT122 — Plataforma de Gestión y Análisis de la Oferta Gastronómica del Casino DUOC UC

## Descripción

La plataforma web centraliza la gestión del menú y la disponibilidad de las
preparaciones del Casino DUOC UC (sede Valparaíso). Además del catálogo y la
consulta pública del menú, incorpora un componente de análisis de datos y
predicción de demanda que apoya la toma de decisiones del personal del casino.

La idea inicial, centrada solo en la consulta del menú, se amplió tras una
observación de la docente: el planteamiento original era en esencia un CRUD de
menú y necesitaba un componente de innovación con una mirada estratégica sobre
la gestión del casino. Ese componente se materializó en el módulo de jornada,
stock exacto, predicción de demanda y análisis de agotamiento.

## Hallazgo clave del levantamiento

El casino no es administrado directamente por DUOC, sino por un concesionario
externo, **Campomar Ltda.**, confirmado por información pública y por el jefe
de carrera. Por eso la integración con el sistema de caja se trata como
funcionalidad condicionada a factibilidad técnica y autorización
institucional, **no como requisito del MVP**. El proyecto funciona con tres
escenarios posibles:

- **Escenario A (integración real):** requiere acuerdo entre DUOC y Campomar.
- **Escenario B (importación):** requiere que Campomar acceda a exportar datos.
- **Escenario C (datos simulados):** camino base, no depende de terceros.

El sistema hoy opera sobre el escenario C. Los datos de venta cargados en la
base se marcan explícitamente como `simulado`, y el análisis muestra un aviso
visible cuando trabaja con ellos. Cuando exista el escenario A o B, se cambia
la fuente de datos sin rediseñar el modelo.

## Estado del proyecto

**Fase 1 — Definición del Proyecto APT.** Cerrada.

- Entrevista con la encargada del casino (Entrevista 01): confirmó que la
  planificación del menú puede cambiar durante el día por razones operativas.
- Encuesta propia a 31 estudiantes: 87 % usaría una plataforma web para
  revisar el menú; confianza promedio de 2,23/5 en la información actual de
  alérgenos e ingredientes.
- Confirmación de que el casino es operado por Campomar Ltda. y no por DUOC.
- Afiche oficial de planificación mensual de Campomar, evidencia de que la
  información del menú ya existe pero no llega a los estudiantes.

**Fase 2 — Diseño y desarrollo.** En curso.

Sprints implementados y funcionando de punta a punta:

| Sprint | Foco |
|---|---|
| Sprint 1 | Login con JWT, roles, gestión de preparaciones |
| Sprint 2 | Planificación del menú, alérgenos, nutrición |
| Sprint 3 | Disponibilidad del día, historial de menús, análisis básico |
| Sprint 4 | Tipo de componente, subida de imágenes |
| Sprint 5 | Ingredientes con cantidades, cálculo nutricional desde receta |
| Sprint 6 | Jornada (inicio, venta, cierre), stock exacto, roles Cajero y Nutricionista, SSE |
| Sprint 7 | Vista mensual del calendario, copiar menús entre fechas |
| Sprint 8 | Perfil del estudiante (alergias, favoritos, calificaciones), predicción con backtesting |
| Sprint 9 | Categoría preferida del estudiante |

## Módulos implementados

**Consulta pública del menú** (sin login):
- Menú del día con foto, precio, ingredientes, tabla nutricional y alérgenos.
- Filtro por categoría: Principal, JUNAEB, Vegetariano, Hipocalórico.
- Vista semanal con acordeón de lunes a sábado.
- Vista de preguntas frecuentes.
- Actualización en tiempo real vía Server-Sent Events.

**Perfil del estudiante** (SSO simulado con `@duocuc.cl`):
- Alergias: marca desde el catálogo. Afecta un aviso en el menú público.
- Favoritos: corazón en cada plato.
- Calificaciones con estrellas y comentario opcional.
- Categoría del menú preferida.

**Panel del personal** (roles: Administrador, Nutricionista, Personal Casino, Cajero):
- **Caja**: botones grandes por categoría, un toque por combo, contador de porciones restantes, hora estimada de agotamiento.
- **Disponibilidad (cocina)**: inicia la jornada con cantidades reales, ajusta stock, cierra con conteo de sobrantes.
- **Planificación del menú**: vista día y mes, sugerencias de cantidad con backtesting, copiar menús entre fechas.
- **Ingredientes**: catálogo con composición por 100 g, agrupado por categorías colapsables.
- **Preparaciones**: platos y acompañamientos, con cálculo automático de nutrición desde ingredientes.
- **Opiniones**: ranking de mejor y peor calificados, distribución de estrellas, favoritos y comentarios.
- **Análisis**: resumen de 30 días, predicción de demanda, ranking mensual.
- **Usuarios**: gestión de cuentas y roles.

**Análisis y predicción**:
- Agotamientos por preparación, ventas por hora, más vendidas vs. planificadas.
- Hora estimada de agotamiento del día según el ritmo actual.
- Sugerencia de cuánto preparar por categoría con rango mínimo-máximo.
- Backtesting: se prueba la predicción contra días pasados y se reporta el error promedio versus un promedio simple.

**Modo oscuro** con logos alternos y calendario nativo en oscuro.
**Subida de imágenes** desde el panel de administración.


## Tecnologías

- **Backend:** Node.js 18+ / Express 5.
- **Base de datos:** PostgreSQL 14+ (relacional, por el historial de menús y
  las relaciones muchos a muchos entre preparaciones e ingredientes).
- **Frontend:** React 19 + Vite, aplicación de página única responsive.
- **Autenticación:** JWT. Estudiantes entran con SSO simulado (correo
  `@duocuc.cl`); el personal, con correo y contraseña.
- **Tiempo real:** Server-Sent Events (SSE).
- **Gestión ágil:** tablero Scrum/Kanban con sprints de dos semanas.

## Metodología

Enfoque ágil: técnicas de Design Thinking durante la validación de
requerimientos de Fase 1, y sprints Scrum de dos semanas desde el diseño del
modelo de datos en Fase 2. Se descartaron Tradicional y RUP porque ambos
exigen requerimientos cerrados antes de diseñar, condición que el proyecto
todavía no cumple.

## Estructura del repositorio

APT122-Casino-DUOC/
├── FASE 1/ # Documentación del proyecto
├── FASE 2/
│ └── Evidencias Proyecto/
│ └── Evidencias de sistema/
│ └── Aplicación/
│ ├── backend/ # API Node.js + Express
│ ├── frontend/ # SPA React + Vite
│ └── README.md

Cada proyecto tiene su propio README con instrucciones específicas:

- [Backend](./FASE%202/Evidencias%20Proyecto/Evidencias%20de%20sistema/Aplicaci%C3%B3n/backend/README.md)
- [Frontend](./FASE%202/Evidencias%20Proyecto/Evidencias%20de%20sistema/Aplicaci%C3%B3n/frontend/README.md)

## Documentación

| Documento | Contenido |
|---|---|
| [Entrevista 01 - Encargada del casino](./Evidencias%20Proyecto/Evidencias%20de%20documentacion/Levantamiento/01_Entrevista_Encargada_Casino.md) | Hallazgos confirmados sobre la planificación del menú y su ejecución real |
| [Afiche Campomar - Comunicación actual del menú](./Evidencias%20Proyecto/Evidencias%20de%20documentacion/Levantamiento/02_Comunicacion_Menu_Actual.png) | Evidencia de que la planificación mensual llega a docentes/administrativos, pero no a los estudiantes |
| [Resultados de la encuesta a estudiantes](./Evidencias%20Proyecto/Evidencias%20de%20documentacion/Levantamiento/03_Resultados_Encuesta.pdf) | Resumen de resultados, n=31 |
| [Encuesta a estudiantes - instrumento](./Evidencias%20Proyecto/Evidencias%20de%20documentacion/Levantamiento/04_Encuesta_Estudiantes.pdf) | Formulario aplicado |
| [Presentación Fase 1](./Evidencias%20Grupales/Presentacion_Idea_Proyecto_APT122.pptx) | Exposición según formato entregado por la docente |
| [Diario de Reflexión Fase 2](./Evidencias%20Proyecto/Evidencias%20de%20documentacion/DIAZ_DIEGO_2.1_APT122_DiarioReflexionFase2.docx) | Monitoreo del avance según carta Gantt |

## Levantar el sistema

Requiere Node.js 18+ y PostgreSQL 14+.

```bash
# 1. Base de datos
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

# 2. Backend
cd backend
npm install
cp .env.ejemplo .env
npm start

# 3. Frontend 
cd frontend
npm install
cp .env.example .env
npm run dev