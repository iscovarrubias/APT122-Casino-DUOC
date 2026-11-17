# Casino DUOC UC — Frontend

Aplicación web (React 19 + Vite) de la Plataforma de Gestión y Análisis de la Oferta Gastronómica del Casino DUOC UC (APT122).

1. **Consulta pública** (`#/`): menú del día por categoría, menú semanal y preguntas frecuentes. No requiere cuenta.
2. **Perfil del estudiante** (modal, con sesión): alergias, favoritos, calificaciones y categoría preferida.
3. **Panel del personal** (`#/panel/*`): caja, disponibilidad (cocina), planificación, ingredientes, preparaciones, análisis y usuarios, según el rol.

La navegación usa rutas con `#` (`#/panel/caja`), por lo que no necesita configuración especial del servidor.

## Qué incluye

| Historia / requisito | Descripción |
|---|---|
| HU-01 / HU-02 | Crear, editar, desactivar y reactivar preparaciones con ingredientes |
| HU-03 / HU-04 | Planificar el menú (día y mes), publicar y despublicar |
| HU-05 | Vista semanal del menú |
| HU-06 | Cambiar disponibilidad durante la jornada |
| HU-08 | Menú del día con precio, categoría y disponibilidad, sin login |
| HU-09 / HU-10 | Ingredientes, información nutricional y alérgenos ("No disponible" si no hay dato) |
| HU-11 | Filtro por categoría (General, JUNAEB, Vegetariano, Hipocalórico) |
| HU-12 / HU-13 | Alérgenos de catálogo fijo e información nutricional |
| HU-14 | Roles en el panel (Administrador, Personal Casino, Cajero, Nutricionista) |
| HU-15 | Acceso único por correo institucional: contraseña (personal), Microsoft Entra ID, o modo demostración |
| HU-20 | Calificar platos con estrellas y comentario |
| RF-21 / RF-22 | Catálogo de ingredientes por 100 g y cálculo nutricional automático |
| RF-24 / RF-25 / RF-26 | Iniciar jornada, vender combos con un toque y stock en tiempo real (SSE) |
| RF-27 | Informe de agotamiento |
| — | Predicción de demanda y su confiabilidad (backtesting) |
| — | Opiniones y favoritos para el personal (incluye editadas y eliminadas) |
| — | Exportación a Excel e imagen (menú y análisis) |
| — | Modo claro/oscuro, diseño responsive, pantalla de carga |

## Requisitos

- Node.js 22.22+ (lo exigen Vite 8, Vitest 5 y jsdom 30)
- Backend en ejecución (por defecto `http://localhost:3000`)

## Instalación y uso

```bash
npm install
cp .env.example .env      # VITE_API_URL=http://localhost:3000
npm run dev               # http://localhost:5173
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compila a `dist/` |
| `npm run preview` | Sirve la compilación |
| `npm run lint` | Análisis estático con oxlint |
| `npm test` | Pruebas (Vitest + Testing Library) |

`VITE_API_URL` se lee **al compilar**, no al ejecutar: si cambia la URL de la API hay que volver a compilar.

### Con Docker

El `Dockerfile` compila la aplicación y la sirve con nginx. Desde la raíz del repositorio: `docker compose up --build` (frontend en `http://localhost:8080`).

## Inicio de sesión

El usuario escribe su correo y el sistema decide el método:

- **Personal** → contraseña.
- **Estudiante con Microsoft Entra ID configurado** → botón "Continuar con Microsoft" (el backend entrega un ticket de un solo uso que la página `AccesoPage` canjea por la sesión).
- **Modo demostración** (`SSO_SIMULADO=true` en el backend) → ingreso directo con correo `@duocuc.cl`, sin contraseña.

La sesión se guarda en `localStorage`; el cajero y el modo "dispositivo de cocina" usan sesión larga.

## Estructura

```
src/
├── api/            cliente.js (fetch + JWT) · gestion.js (endpoints del panel) · menu.js (endpoints públicos)
├── components/     Interfaz reutilizable
│   ├── Menú público:   MenuPrincipal · CategoriaTabs · VistaSemanal · VistaPreguntas · TablaNutricional
│   │                   AlergenoPills · AvisoAlergias · EstadoBadge · BotonFavorito · Opinion · OpinionModal
│   ├── Panel:          PanelLayout · PanelSidebar · Sidebar · PanelVentas · PrediccionPanel
│   │                   OpinionesPanel · RankingMensual · SelectorPeriodo
│   ├── Exportación:    ExportarMenu · ExportarAnalisis · ExportarVentana · HojasMenu · HojasAnalisis
│   └── Comunes:        Mensaje · Ayuda · Cargando · PantallaCarga · ModalFormulario · CampoFecha
│                       ImagenOIcono · NoEncontrada · ErrorBoundary · PerfilEstudianteModal
├── context/        AuthProvider (sesión) · ConfirmacionProvider (diálogos de confirmación)
├── pages/          VistaPublica · LoginPage · AccesoPage · CajaPage · KioscoPage · PlanificacionPage
│                   IngredientesPage · PreparacionesPage · AnalisisPage · UsuariosPage
├── ruteo/          rutas.js (permisos por rol) · useRuta.js (router por hash)
├── utils/          formato · periodos · eventos (cliente SSE) · estudiante (perfil)
│                   exportarMenu · exportarExcel · exportarAnalisis · tema · splash · navAnimada
├── pruebas/        Configuración de pruebas
├── App.jsx · main.jsx
└── index.css · panel.css · diseno.css · responsive.css
```

Las pruebas viven junto al código (`*.test.jsx`): `CategoriaTabs`, `VistaSemanal`, `LoginPage` y `utils/formato`.
