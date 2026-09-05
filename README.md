# Proyecto APT122 - Plataforma de Gestión y Análisis de la Oferta Gastronómica del Casino DUOC UC

## Descripción

Proyecto desarrollado para la asignatura Capstone (APT122).

El proyecto consiste en una plataforma web que centraliza la gestión del menú
y la disponibilidad de las preparaciones del Casino DUOC UC (sede Valparaíso),
y que, si la investigación en curso lo permite, incorpora análisis de datos de
consumo para apoyar la toma de decisiones del personal del casino. La idea
inicial, centrada solo en la consulta del menú por parte de los estudiantes,
se amplió después de una observación de la docente: el planteamiento original
era, en esencia, un CRUD de menú y necesitaba un componente de innovación con
una mirada más estratégica sobre la gestión del casino.

Un hallazgo relevante del levantamiento: el casino no es administrado
directamente por DUOC, sino por un concesionario externo, **Campomar Ltda.**
Esto fue confirmado tanto por información pública de la empresa como
directamente por el jefe de carrera. En consecuencia, la integración con el
sistema de caja se trata como una funcionalidad condicionada a factibilidad
técnica y autorización institucional, **no como un requisito del MVP**. El
proyecto está diseñado para funcionar bajo tres escenarios posibles:

- **Escenario A (integración real):** requiere acuerdo entre DUOC y Campomar.
- **Escenario B (importación):** requiere que Campomar acceda a exportar datos.
- **Escenario C (datos simulados):** camino base, no depende de terceros.

## Estado del proyecto

**Fase 1 - Definición del Proyecto APT**

Avances confirmados hasta ahora:

- Entrevista con la encargada del casino (Entrevista 01), que confirmó que la
  planificación del menú puede cambiar durante el día por razones operativas.
- Encuesta propia a 31 estudiantes: 87% usaría una plataforma web para
  revisar el menú; confianza promedio de solo 2,23/5 en la información
  actual de alérgenos e ingredientes.
- Confirmación de que el casino es operado por Campomar Ltda., un
  concesionario externo, y no por DUOC directamente.
- Afiche oficial de planificación mensual de Campomar, que muestra que la
  información del menú ya existe y se distribuye a docentes/administrativos,
  pero no a los estudiantes.

Pendiente para cerrar la Fase 1:

- Entrevista con la nutricionista de contacto (agendada, respuesta en curso).
- Contacto con el administrador de Campomar a cargo del casino, para evaluar
  el escenario de datos de venta viable (visita presencial sugerida por el
  jefe de carrera).
- Ampliar la muestra de la encuesta específicamente en Valparaíso/Viña del Mar.

## Equipo

- **Isabella Covarrubias** — levantamiento de requerimientos, diseño de
  interfaz y experiencia de usuario, apoyo en pruebas.
- **Diego Díaz** — modelado de datos, desarrollo de funcionalidades, análisis
  de datos, apoyo en pruebas.

## Tecnologías (tentativas, sujetas a validación)

- **Backend:** Node.js/Express o Laravel — por confirmar según hallazgos
  técnicos del levantamiento.
- **Base de datos:** PostgreSQL o MySQL (relacional, por el historial de
  menús y las relaciones muchos a muchos entre preparaciones e ingredientes).
- **Frontend:** aplicación web responsive.
- **Gestión ágil:** tablero Scrum/Kanban.

## Metodología

Enfoque ágil: técnicas de Design Thinking durante la validación de
requerimientos de Fase 1, y sprints Scrum de dos semanas desde el diseño del
modelo de datos en Fase 2. Se descartaron Tradicional y RUP porque ambos
exigen requerimientos cerrados antes de diseñar, condición que el proyecto
todavía no cumple.

## Documentación

| Documento | Contenido |
|---|---|
| [Entrevista 01 - Encargada del casino](./Evidencias%20Proyecto/Evidencias%20de%20documentacion/Levantamiento/01_Entrevista_Encargada_Casino.md) | Hallazgos confirmados sobre la planificación del menú y su ejecución real |
| [Afiche Campomar - Comunicación actual del menú](./Evidencias%20Proyecto/Evidencias%20de%20documentacion/Levantamiento/02_Comunicacion_Menu_Actual.png) | Evidencia de que la planificación mensual llega a docentes/administrativos, pero no a los estudiantes |
| [Resultados de la encuesta a estudiantes](./Evidencias%20Proyecto/Evidencias%20de%20documentacion/Levantamiento/03_Resultados_Encuesta.pdf) | Resumen de resultados, n=31 |
| [Encuesta a estudiantes - instrumento](./Evidencias%20Proyecto/Evidencias%20de%20documentacion/Levantamiento/04_Encuesta_Estudiantes.pdf) | Formulario aplicado |
| [Presentación Fase 1](./Evidencias%20Grupales/Presentacion_Idea_Proyecto_APT122.pptx) | Exposición según formato entregado por la docente |


## Objetivo general

Desarrollar una plataforma web que centralice la gestión del menú y la
disponibilidad de las preparaciones del Casino DUOC UC, incorporando el
análisis de datos de disponibilidad y, si la investigación lo permite, de
consumo, para apoyar la toma de decisiones del personal del casino y
entregar información actualizada a los estudiantes.
