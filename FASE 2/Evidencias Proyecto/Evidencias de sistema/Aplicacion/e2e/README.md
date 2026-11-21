# Pruebas de punta a punta (Playwright)

Estas pruebas abren la aplicación en un navegador real y la usan como lo haría cada persona: estudiantes, cocina, caja, nutricionista y administración. Levantan el backend y el frontend contra una base de datos exclusiva de pruebas, así que verifican el sistema completo, no piezas aisladas.

## Qué cubren

| Archivo | Funcionalidad | Pruebas |
|---|---|---|
| `01-menu-publico` | Menú del día sin cuenta, categorías, ingredientes, nutrición, alérgenos, combo, opiniones, semanal, preguntas frecuentes, modo oscuro, día sin menú | 10 (+2 en celular) |
| `02-inicio-de-sesion` | Entrada de cada rol, contraseña incorrecta, bloqueo por intentos, correo no institucional, estudiante con cuenta DUOC, dispositivo compartido de cocina, tema guardado en la cuenta, cierre de sesión, sesión inválida | 14 (+2 en celular) |
| `03-permisos-por-rol` | Menú lateral de cada rol, rutas prohibidas con error 403, caja fija para el cajero, modo cocina, estudiantes fuera del panel, la API también rechaza | 16 |
| `04-estudiante` | Alergias con aviso en el plato, categoría preferida, favoritos, calificar, editar y borrar opiniones, opiniones eliminadas que se conservan, cierre de sesión | 6 (+2 en celular) |
| `05-planificacion` | Día completo, publicar y despublicar, editar cantidades, cantidad sugerida, ver receta, acompañamiento especial por categoría, quitar componentes, vista de mes, copiar y pegar, exportar a Excel y PNG | 13 |
| `06-preparaciones` | Crear plato con ingredientes, alérgenos sugeridos y nutrición calculada, validaciones, búsqueda, detalle, editar, subir foto, desactivar, reactivar y borrar, receta usada en el menú igual a la registrada, variaciones sin tocar la receta original | 13 |
| `07-ingredientes` | Catálogo por categoría, crear, nombre repetido, valores negativos, editar, buscar, filtro sin nutrición, uso en recetas | 8 |
| `08-jornada-y-ventas` | Iniciar jornada, vender combo, postre o fruta, solo plato, bebida de máquina, menú sin opciones, doble toque accidental, cancelar, deshacer, agotar, corregir conteo, reposición, cajero, cierre con conteo, corrección del cierre, reabrir | 19 (+1 en celular) |
| `09-tiempo-real` | Venta, publicación, agotado manual y opiniones que llegan a otras pantallas sin recargar | 4 |
| `10-analisis` | Indicadores por menú, períodos, categorías, análisis por preparación, exportar, predicción, opiniones con autor, favoritos, informe general | 9 |
| `11-usuarios` | Crear, validar, buscar, filtrar, cambiar rol, cambiar contraseña, desactivar y reactivar | 8 |
| `12-legales-errores-y-accesibilidad` | Términos y privacidad, enlace a la política de Duoc UC, almacenamiento declarado, 404, servidor caído o con error, saltar al contenido, ayudas, textos alternativos, sin desborde en celular | 12 (+2 en celular) |
| `13-flujo-completo-del-dia` | Un día entero con cinco personas a la vez: se planifica, se publica, se inicia la jornada, se vende hasta agotar, el estudiante lo ve en vivo y opina, se cierra y se analiza | 1 |
| `14-accesibilidad-axe` | Revisión WCAG 2.1 AA con axe del menú público (claro y oscuro), semanal, preguntas, opiniones, perfil, login, páginas legales, cada sección del panel, las pestañas de Análisis, los formularios y el modo oscuro del panel | 16 (+6 en celular) |
| `15-prediccion-y-correos` | Reloj con la hora estimada de agotamiento, estimación pública sin datos internos, activar los avisos por correo en el perfil, un solo correo semanal con favoritos, aviso del día y baja con un clic | 5 (+1 en celular) |

En total son 154 escenarios en escritorio y 16 que se repiten en un celular (Pixel 7), 170 ejecuciones.

## Cómo ejecutarlas

Se necesita PostgreSQL y una base vacía con "e2e" o "test" en el nombre, porque la prueba la borra y la vuelve a crear con las migraciones y los datos de demostración.

```bash
cd backend && npm ci && cd ..
cd frontend && npm ci && cd ..
cd e2e
npm ci
npx playwright install --with-deps chromium

E2E_DATABASE_URL=postgres://usuario:clave@localhost:5432/casino_e2e_test npx playwright test
```

Playwright levanta solo el backend (puerto 3100) y el frontend (puerto 4180). Otros comandos útiles:

```bash
npx playwright test pruebas/08-jornada-y-ventas.spec.js   # un solo archivo
npx playwright test --project=movil                       # solo las pruebas en celular
npx playwright test --ui                                  # modo visual, paso a paso
npx playwright show-report                                # abre el último reporte
```

Si una prueba falla, el reporte guarda la captura de pantalla, el video y la traza de ese momento.

## En la integración continua

El job `e2e` de `.github/workflows/ci.yml` corre después del backend y el frontend, con un PostgreSQL de servicio. El reporte queda como artefacto `reporte-playwright` en cada ejecución.

## Errores que encontraron

Al escribirlas aparecieron fallas reales, que ya están corregidas:

- Después de calificar un plato, el promedio no se actualizaba hasta el siguiente refresco. Ahora el backend avisa a todas las pantallas cuando cambia una calificación.
- La nutricionista veía la pestaña Predicción, pero el backend le respondía 403. Ahora tiene acceso a la estimación del día, igual que al resto del análisis.
- La revisión con axe encontró textos con poco contraste (el amarillo de General sobre blanco, los precios en los botones de la caja), un botón cuyo nombre no coincidía con su texto, tarjetas ocultas que se podían enfocar y zonas con desplazamiento a las que no se llegaba con el teclado.
