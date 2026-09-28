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

Diseño basado en el mockup. Se actualiza solo
cada 30 segundos (polling), sin necesitar WebSockets, tal como se definió
en el Documento de Arquitectura.

## Requisitos

- Node.js 18+
- El backend (Sprint 1-3) corriendo en paralelo, ver su propio README.

## Instalación

```bash
npm install
cp .env.example .env
```

## Levantar en desarrollo

```bash
npm run dev
```

Abre `http://localhost:5173`. Necesita que el backend esté corriendo al
mismo tiempo, en otra terminal (ver
"Probar manualmente" en el README del backend).

## Compilar para producción

```bash
npm run build
```

Genera la carpeta `dist/`, lista para subir a Vercel o Netlify (ver
Documento de Arquitectura, sección 7).

## Estructura del proyecto

```
src/
  api/menu.js                  # llamadas al backend (fetch)
  components/
    Sidebar.jsx
    CategoriaTabs.jsx          # HU-11: filtro por categoría
    MenuPrincipal.jsx          # arma el combo: principal + compartidos
    TablaNutricional.jsx       # HU-10, regla de "no disponible"
    AlergenoPills.jsx          # HU-10
    EstadoBadge.jsx            # HU-08: disponibilidad
  utils/formato.js             # precio, suma de calorías del combo
  App.jsx                      # sondeo cada 30s, estado de categoría
```

## Decisiones de diseño

- **Todo el consumo es a endpoints públicos** (`GET /api/menu/hoy`), sin
  token, tal como quedó definido: la consulta de menú no requiere cuenta.
- **Las calorías totales del combo son una suma, no un dato aparte.** Si
  falta la validación nutricional de cualquiera de los componentes, el
  total se muestra como "No disponible" en vez de un número parcial que
  podría confundir.
- **"Configuración", "Cuenta y perfil" y "Cerrar sesión" aparecen
  deshabilitados**, con un tooltip explicando por qué: son funciones
  condicionadas a la cuenta DUOC Microsoft (RF-18 a RF-20), que todavía
  no está resuelta a nivel institucional.
- **No hay fotos de los platos.** El modelo de datos de `preparacion` no
  tiene un campo de imagen; se usa un ícono como espacio reservado. Si
  quieren fotos reales, hay que agregar una columna `imagen_url` a la
  tabla y decidir dónde alojarlas (ver "Pendientes" abajo).

