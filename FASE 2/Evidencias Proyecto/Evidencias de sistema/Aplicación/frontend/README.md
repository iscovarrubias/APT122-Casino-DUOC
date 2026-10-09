# Casino DUOC UC — Frontend (Sprint 4)

Consulta estudiantil del MVP. Plataforma de Gestión y Análisis de la
Oferta Gastronómica del Casino DUOC UC. APT122, Fase 2.

## Qué incluye

| Historia | Descripción |
|---|---|
| HU-08 | Menú del día con precio, categoría y disponibilidad, sin login |
| HU-09 | Ingredientes de cada preparación |
| HU-10 | Información nutricional y alérgenos, con "No disponible" si no está validada |
| HU-11 | Filtro por categoría (Principal, JUNAEB, Vegetariano, Hipocalórico) |
| HU-05 | Vista Semanal, usando el historial de menús publicados del backend |
| — | Vista Preguntas frecuentes (contenido estático, sin backend) |


## Requisitos

- Node.js 18+
- El backend corriendo en paralelo, ver su propio README.

## Instalación

```bash
npm install
cp .env.example .env
```

## Levantar en desarrollo

```bash
npm run dev
```

`http://localhost:5173`

## Compilar para producción

```bash
npm run build
```


## Estructura del proyecto

```
src/
  api/menu.js                  # llamadas al backend (fetch)
  components/
    Sidebar.jsx                # navegación entre Diario / Semanal / Preguntas
    CategoriaTabs.jsx          # HU-11: filtro por categoría
    MenuPrincipal.jsx          # arma el combo: principal + compartidos
    VistaSemanal.jsx           # HU-05: usa GET /api/menu/historial
    VistaPreguntas.jsx         # FAQ estático, sin backend
    TablaNutricional.jsx       # HU-10, regla de "no disponible"
    AlergenoPills.jsx          # HU-10
    EstadoBadge.jsx            # HU-08: disponibilidad
    iconos.jsx                 # íconos SVG propios, sin emojis
  utils/formato.js             # precio, suma de calorías del combo
  App.jsx                      # sondeo cada 30s, navegación entre vistas
```
