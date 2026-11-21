# Casinos DUOC UC: frontend

Aplicación web en React 19 y Vite 8 de la plataforma de gestión y análisis de la oferta gastronómica del Casino DUOC UC (APT122).

Tiene tres partes:

1. **Consulta pública** (`#/`): menú del día por categoría, menú semanal y preguntas frecuentes, no requiere cuenta.
2. **Perfil del estudiante** (ventana dentro de la consulta pública, con sesión): alergias, categoría preferida, favoritos y calificaciones.
3. **Panel del personal** (`#/panel/*`): caja, disponibilidad, planificación, ingredientes, preparaciones, análisis y usuarios, según el rol de cada cuenta.

La navegación usa rutas con `#` (por ejemplo `#/panel/caja`), así que no necesita configuración especial en el servidor.

## Qué incluye

| Historia o requisito | Descripción |
|---|---|
| HU-01 / HU-02 | Crear, editar, desactivar y reactivar preparaciones con sus ingredientes |
| HU-03 / HU-04 | Planificar el menú por día y por mes, publicar y despublicar |
| HU-05 | Vista semanal del menú |
| HU-06 | Cambiar la disponibilidad durante la jornada |
| HU-08 | Menú del día con precio, categoría y disponibilidad, sin login |
| HU-09 / HU-10 | Ingredientes, información nutricional y alérgenos, con "No disponible" cuando falta un dato |
| HU-11 | Filtro por categoría: General, JUNAEB, Vegetariano e Hipocalórico |
| HU-12 / HU-13 | Alérgenos de catálogo fijo e información nutricional |
| HU-14 | Roles en el panel: Administrador, Personal Casino, Cajero y Nutricionista |
| HU-15 | Acceso único por correo institucional, con contraseña (personal), Microsoft Entra ID o modo demostración |
| HU-20 | Calificar platos con estrellas y comentario |
| RF-21 / RF-22 | Catálogo de ingredientes por 100 g y cálculo nutricional automático |
| RF-24 / RF-25 / RF-26 | Iniciar la jornada, vender combos con un toque y ver el stock en tiempo real (SSE) |
| RF-27 | Informe de agotamiento |
|  | Predicción de demanda y su confiabilidad (backtesting) |
|  | Receta de cada plato en la planificación y variaciones de receta |
|  | Avisos de jornada no iniciada, jornada cerrada y fin de semana en el menú público |
|  | Opiniones y favoritos para el personal, incluidas las editadas y eliminadas |
|  | Exportación a Excel e imagen del menú y del análisis |
|  | Modo claro y oscuro, diseño responsive y pantalla de carga animada |

## Requisitos

- Node.js 22.22+ (lo exigen Vite 8, Vitest y jsdom)
- Backend en ejecución, por defecto en `http://localhost:3000`

## Instalación y uso

```bash
npm install
cp .env.example .env      # VITE_API_URL=http://localhost:3000
npm run dev               # http://localhost:5173
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compila en `dist/` |
| `npm run preview` | Sirve la versión compilada |
| `npm run lint` | Análisis estático con oxlint |
| `npm test` | Pruebas con Vitest y Testing Library |
| `npm run test:cov` | Pruebas con informe de cobertura (queda en `coverage/`) |

`VITE_API_URL` se lee al compilar y no al ejecutar, si cambia la URL de la API hay que volver a compilar (en Render, volver a desplegar).

### Con Docker

El `Dockerfile` compila la aplicación y la sirve con nginx. Desde la carpeta `Aplicacion`: `docker compose up --build`, y el frontend queda en `http://localhost:8080`.

## Inicio de sesión

El usuario escribe su correo y el sistema decide cómo entra:

| Cuenta | Método |
|---|---|
| Personal del casino | Contraseña |
| Estudiante, con Microsoft Entra ID configurado | Botón "Continuar con Microsoft", el backend entrega un ticket de un solo uso que `AccesoPage` canjea por la sesión |
| Estudiante, en modo demostración (`SSO_SIMULADO=true` en el backend) | Ingreso directo con un correo `@duocuc.cl`, sin contraseña |

La sesión se guarda en `localStorage`, y el cajero y el modo "dispositivo de cocina" usan una sesión más larga.

## Estados del menú público

El estado de cada plato se calcula en `utils/formato.js` (`estadoEfectivo`) a partir de la jornada y la disponibilidad que entrega el backend:

| Situación | Qué ve el estudiante |
|---|---|
| Todavía no hay jornada iniciada | "Aún no inicia la jornada", sin porciones |
| Jornada abierta | "Disponible" y las porciones que quedan |
| Quedan pocas porciones | "Quedan pocas unidades" |
| Plato agotado | "Agotado", en gris |
| Jornada cerrada | "Jornada cerrada" en cada plato y un aviso arriba de que la jornada de almuerzos de hoy ya cerró |
| Sábado o domingo sin menú | Aviso de que esos días no hay menú, con un botón al menú semanal |

El menú semanal muestra de lunes a viernes la semana en curso y, el sábado y el domingo, la semana siguiente.

## Planificación, recetas y variaciones

Cada tarjeta de la planificación tiene, junto al rótulo del plato, el botón **Ver receta**, que abre los ingredientes con sus gramos, las porciones de la receta, los alérgenos y la información nutricional. Desde ahí, el Administrador y la Nutricionista pueden **crear una variación**: se abre el formulario de preparaciones con la receta original precargada, se ajustan los ingredientes y se guarda como una preparación nueva, y queda seleccionada en la tarjeta para guardarla en el menú del día. En los selectores las variaciones aparecen debajo de su plato original, marcadas con "↳".

## Pantalla de carga

La animación con el logo se usa en la primera carga de cada vista principal (menú del día, menú semanal, páginas del panel y verificación de la cuenta Microsoft) y aparece solo si la carga tarda más de 250 ms, para que no parpadee cuando la respuesta es rápida. Las recargas con datos ya en pantalla y las ventanas secundarias usan el indicador chico (`Cargando`).

## Estructura

```text
src/
├── api/            cliente.js (fetch con JWT), gestion.js (endpoints del panel) y menu.js (endpoints públicos)
├── components/     Interfaz reutilizable
│   ├── Menú público:   MenuPrincipal, CategoriaTabs, VistaSemanal, VistaPreguntas, TablaNutricional,
│   │                   AlergenoPills, AvisoAlergias, EstadoBadge, BotonFavorito, Opinion y OpinionModal
│   ├── Panel:          PanelLayout, PanelSidebar, PanelVentas, PrediccionPanel, OpinionesPanel,
│   │                   RankingMensual, SelectorPeriodo, ModalCierre, CorreccionCierre, ResumenCierre,
│   │                   ModalAcompanamientoEspecial, ModalOpcion y RecetaModal
│   ├── Exportación:    ExportarMenu, ExportarAnalisis, ExportarVentana, HojasMenu y HojasAnalisis
│   └── Comunes:        Mensaje, Ayuda, Cargando, PantallaCarga, PaginaError, ModalFormulario, CampoFecha,
│                       ImagenOIcono, RecortarImagen, NoEncontrada, ErrorBoundary, Sidebar y PerfilEstudianteModal
├── context/        AuthProvider (sesión) y ConfirmacionProvider (diálogos de confirmación)
├── pages/          VistaPublica, LoginPage, AccesoPage, CajaPage, KioscoPage, PlanificacionPage,
│                   IngredientesPage, PreparacionesPage, AnalisisPage y UsuariosPage
├── ruteo/          rutas.js (permisos por rol) y useRuta.js (navegación por hash)
├── utils/          formato, periodos, opciones, eventos (cliente SSE), estudiante, useVentas, errores,
│                   exportarMenu, exportarExcel, exportarAnalisis, tema, splash, revelar y navAnimada
├── pruebas/        Configuración de las pruebas
├── App.jsx y main.jsx
└── index.css, panel.css, diseno.css y responsive.css
```

## Pruebas

Las pruebas están junto al código (`*.test.jsx` y `*.test.js`). Son 372 casos en 36 archivos y cubren el 93 % de las líneas del frontend. Usan Vitest con Testing Library, que maneja la interfaz como lo haría una persona: busca los botones por su nombre, escribe en los campos y revisa lo que aparece en pantalla. `npm run test:cov` falla si la cobertura baja de 90 % en líneas, 88 % en sentencias, 85 % en funciones u 80 % en ramas. Las pruebas de punta a punta con Playwright, que recorren la aplicación completa en un navegador, están en `../e2e`.

| Archivo | Qué cubre |
|---|---|
| `App.test.jsx` | Guardias de ruta del panel: sin sesión al login, estudiante fuera del panel, cajero fijo en la caja, modo kiosco, 403 por rol y títulos de pestaña |
| `ruteo/rutas.test.js` | Matriz de permisos y página inicial de cada rol |
| `api/contrato.test.js` | Contrato con el backend: lee las rutas del código del backend y comprueba que cada llamada del frontend apunta a una ruta y método que existen |
| `api/cliente.test.js` | Token, errores del servidor, sin conexión, cierre de sesión ante un 401 y subida de fotos |
| `context/AuthProvider.test.jsx` | Sesión guardada, sesión vencida o corrupta, inicio con clave, cuenta DUOC y ticket de Microsoft, cierre de sesión |
| `utils/sesion-y-tiempo-real.test.jsx` | Conexión única de tiempo real, reparto de avisos, reconexión a los 15 segundos, pantalla de bienvenida, tema claro y oscuro, consultas públicas |
| `utils/estudiante.test.jsx` | Perfil del estudiante (alergias, favoritos, calificaciones, categoría preferida) y mensajes para cada código de error |
| `utils/exportar.test.js` | Arma los períodos y genera Excel reales de la planificación, ventas, informe general y opiniones, y los vuelve a abrir para revisar hojas y celdas |
| `utils/formato.test.js` | Estado de cada plato, calorías y precio del combo, grupos de opción y orden de las variaciones |
| `utils/periodos.test.js` | Rangos de fechas, años bisiestos y atajos de análisis |
| `utils/useVentas.test.jsx` | Elegir postre o fruta, solo plato, JUNAEB, doble toque accidental y opciones agotadas |
| `pages/CajaPage.test.jsx` | Iniciar la jornada con cantidades ajustadas, vender, deshacer, cerrar y reabrir |
| `pages/KioscoPage.test.jsx` | Fijar lo que queda, reposiciones, cierre con conteo de sobrantes y diferencia contra el sistema |
| `pages/PlanificacionPage.test.jsx` y `pages/PlanificacionFlujos.test.jsx` | Ver la receta y crear variaciones, agregar con la cantidad sugerida, guardar todo el menú, especiales por categoría, publicar, vista mensual y copiar un día o una semana |
| `pages/PreparacionesPage.test.jsx` | Recetas con gramos, cálculo nutricional, alérgenos sugeridos, recálculo obligatorio si cambia la receta, fotos, desactivar y borrar |
| `pages/IngredientesPage.test.jsx` | Categorías, búsqueda, ingredientes sin información, creación y edición con recálculo de preparaciones |
| `pages/UsuariosPage.test.jsx` | Crear, buscar, cambiar rol, desactivar y cambiar contraseña, sin poder modificarse a una misma |
| `pages/AnalisisPage.test.jsx` | Indicadores, hallazgos, análisis por menú y por preparación, predicción con su confiabilidad e informe general |
| `pages/LoginPage.test.jsx` | Detección del método de ingreso por correo |
| `pages/VistaPublica.test.jsx` | Avisos de fin de semana, jornada cerrada y jornada no iniciada |
| `components/Exportar.test.jsx` | Ventanas de exportación (semana, mes y rango), descarga en Excel y en imagen, y las hojas que se dibujan |
| `components/Estudiante.test.jsx` | Mi perfil, calificar y editar opiniones, favoritos, aviso de alérgenos y pantalla de error |
| `components/RecortarYOpiniones.test.jsx` | Recorte de fotos a 1600 px y panel de opiniones con filtros y favoritos |
| `components/Navegacion.test.jsx` | Menú lateral del panel y del público, hoja de configuración del celular y vuelta desde Microsoft |
| `components/MenuPrincipal.test.jsx`, `VistaSemanal.test.jsx` y `CategoriaTabs.test.jsx` | Tarjeta del menú, semana siguiente los fines de semana y pestañas de categoría |
| `components/BotonesVenta.test.jsx`, `CompartidosDelDia.test.jsx`, `CorreccionCierre.test.jsx` y `ResumenCierre.test.jsx` | Botones de venta, acompañamientos compartidos y cierre de jornada |
| `components/PaginaError.test.jsx` y `RecetaModal.test.jsx` | Página de error con reintento y receta con sus permisos |
