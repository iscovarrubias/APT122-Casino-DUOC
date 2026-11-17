# Referencia de la API REST — Casino DUOC UC

Base URL en desarrollo: `http://localhost:3000`. Todas las respuestas son JSON salvo las imágenes (`/uploads/...`) y el flujo de eventos (`/api/menu/eventos`).

## Convenciones

**Autenticación.** Las rutas protegidas exigen el encabezado `Authorization: Bearer <token>`. El token se obtiene con `POST /api/auth/login` (personal), `POST /api/auth/duoc` (demostración) o el flujo de Microsoft (`/api/auth/microsoft/*`). Expira a las 8 h (cajero y modo "kiosco": 7 días).

**Roles.** `Estudiante`, `Personal Casino`, `Cajero`, `Nutricionista`, `Administrador`. En las tablas, "Público" significa sin token.

**Formato de error.** Siempre `{ "error": "mensaje legible" }`.

| Código | Significado |
|---|---|
| 400 | Datos inválidos (validación) |
| 401 | Sin token, token inválido/expirado o credenciales incorrectas |
| 403 | El rol no tiene permiso |
| 404 | Recurso no encontrado |
| 409 | Conflicto de estado (ej.: jornada ya iniciada, preparación en uso) |
| 413 | Imagen mayor a 3 MB |
| 429 | Demasiados intentos (limitador) |
| 500 | Error interno |

**Fechas:** `AAAA-MM-DD` (zona horaria America/Santiago). **Meses:** `AAAA-MM`.

---

## Salud

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/health` | Público | Responde `{ estado: "ok" }`. |

## Autenticación — `/api/auth`

| Método | Ruta | Acceso | Cuerpo / parámetros | Respuesta |
|---|---|---|---|---|
| POST | `/login` | Público (limitado por cuenta e IP) | `{ email, password, kiosco? }` | `{ token, kiosco, usuario }` |
| POST | `/identificar` | Público (limitado por IP) | `{ email }` | `{ metodo: "clave" \| "microsoft" \| "duoc" }` según el correo |
| POST | `/duoc` | Público, solo si `SSO_SIMULADO=true` | `{ email }` (@duocuc.cl) | `{ token, usuario }`. 404 si está apagado; 403 si es cuenta de personal |
| GET | `/config` | Público | — | `{ sso_habilitado, microsoft_habilitado }` |
| GET | `/microsoft/inicio` | Público | `?login_hint=correo` | Redirección 302 a Microsoft (con PKCE, `state` y `nonce`) |
| GET | `/microsoft/callback` | Público (lo llama Microsoft) | `?code&state` | Redirección al frontend `/#/acceso?ticket=…` o `?error=…` |
| POST | `/microsoft/canje` | Público (limitado por IP) | `{ ticket }` | `{ token, kiosco, usuario }`. El ticket vale 60 s y se usa una sola vez |
| GET | `/yo` | Token | — | `{ usuario }` |

## Menú — `/api/menu`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/eventos` | Público | Flujo SSE: emite `event: cambio` cuando cambia stock o disponibilidad. Máx. conexiones por IP; 429 si se excede. |
| GET | `/hoy` | Público | Menú **publicado** del día. Query: `fecha?`, `categoria?`. Incluye precio, ingredientes, alérgenos, nutrición, disponibilidad y cantidad restante. |
| GET | `/historial` | Público | Menús publicados entre `desde` y `hasta` (por defecto, últimos 30 días). |
| GET | `/mes` | Personal, Administrador, Nutricionista | Calendario del mes: `?mes=AAAA-MM`. |
| POST | `/copiar` | Ídem | `{ copias: [{origen, destino}], sobrescribir? }` (1–31 pares). Copia menús; el destino queda sin publicar. |
| GET | `/planificacion` | Ídem | `?fecha=` → `{ menu, componentes, precios_recientes }`. |
| POST | `/planificacion` | Ídem | `{ fecha, id_preparacion, tipo_componente, categoria?, cantidad_planificada, precio? }`. El Plato Principal exige `categoria`; entrada, postre y bebida no la llevan. |
| PATCH | `/componentes/:id` | Ídem | `{ id_preparacion?, cantidad_planificada?, precio? }` |
| DELETE | `/componentes/:id` | Ídem | Quita un componente (409 si ya tiene ventas). |
| PATCH | `/:id/publicar` | Ídem | Publica el menú (400 si no tiene componentes). |
| PATCH | `/:id/despublicar` | Ídem | Lo oculta a los estudiantes. |
| PATCH | `/componentes/:id/disponibilidad` | Ídem | `{ estado: "disponible" \| "baja_disponibilidad" \| "agotado", observacion? }` |
| GET | `/componentes/:id/disponibilidad/historial` | Ídem | Historial de cambios de estado. |

## Jornada, caja y stock — `/api/jornada`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/hoy` | Cajero, Personal, Administrador | Estado de la jornada: menú, componentes con `restante`, ventas por categoría y recientes. Cierra automáticamente jornadas vencidas. |
| POST | `/iniciar` | Cajero, Personal, Administrador | `{ cantidades?: { id_menu_preparacion: n } }`. Requiere menú publicado. 409 si ya existe jornada. |
| POST | `/cerrar` | Personal, Administrador | `{ sobrantes?: { id_menu_preparacion: n } }` (conteo real de cocina). |
| POST | `/ventas` | Cajero, Personal, Administrador | `{ categoria }` → 201. Descuenta 1 del Plato Principal y de los acompañamientos. |
| POST | `/ventas/:id/anular` | Cajero, Personal, Administrador | Anula la venta (movimiento contrario). 409 si ya estaba anulada o la jornada cerró. |
| POST | `/componentes/:id/stock` | Personal, Administrador | `{ accion: "quedan" \| "reposicion" \| "ajuste", cantidad, observacion? }` |

## Preparaciones — `/api/preparaciones`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/` | Público | Preparaciones activas con ingredientes, alérgenos y nutrición. |
| GET | `/alergenos` | Público | Catálogo fijo de alérgenos. |
| GET | `/tipos` | Público | Tipos de componente. |
| GET | `/:id/opiniones` | Público | Comentarios con texto de una preparación. |
| GET | `/gestion` | Personal, Administrador, Nutricionista | Listado completo (activas e inactivas) con receta y origen de la nutrición. |
| POST | `/` | Administrador, Nutricionista | `{ nombre, descripcion?, precio?, imagen_url?, ingredientes: [{id_ingrediente, cantidad_g}], tipo?, porciones_receta? }` |
| PUT | `/:id` | Ídem | Mismos campos, todos opcionales. |
| PATCH | `/:id/desactivar` y `/:id/reactivar` | Ídem | Activa o desactiva. |
| DELETE | `/:id` | Ídem | Solo desactivadas y nunca usadas en un menú (409 en otro caso). |
| PUT | `/:id/alergenos` | Ídem | `{ alergenos: ["Gluten", ...] }` (del catálogo). |
| PUT | `/:id/nutricion` | Ídem | `{ calorias, proteinas_g, carbohidratos_g, grasas_g, origen: "manual" \| "calculada" }`. Sin calorías se muestra "No disponible". |
| POST | `/calcular-nutricion` | Ídem | `{ porciones_receta, ingredientes: [{id_ingrediente, cantidad_g}] }` → `{ completo, problemas, sin_datos, omitidos, por_porcion }`. Es "todo o nada": si falta un dato, no entrega valores. |
| POST | `/imagen` | Ídem | `multipart/form-data`, campo `imagen` (JPG, PNG, WEBP o GIF, ≤ 3 MB; se verifica el contenido real). → `{ imagen_url }` |

## Ingredientes — `/api/ingredientes`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/categorias` | Público | Categorías de ingrediente. |
| GET | `/` | Administrador, Nutricionista | Catálogo con valores por 100 g, alérgenos y número de usos. |
| POST | `/` | Ídem | `{ nombre, id_categoria_ingrediente?, calorias_100g, proteinas_100g, carbohidratos_100g, grasas_100g, sin_cuantificar?, alergenos? }` (los cuatro valores nutricionales juntos o ninguno). |
| PUT | `/:id` | Ídem | Edita. Si cambian los valores, recalcula las preparaciones con nutrición calculada → `{ ingrediente, recalculadas, sin_datos }`. |
| DELETE | `/:id` | Ídem | 409 si se usa en alguna preparación. |

## Análisis — `/api/analisis` (Administrador, Nutricionista)

| Método | Ruta | Parámetros | Descripción |
|---|---|---|---|
| GET | `/resumen` | `desde`, `hasta` | Agotamientos, ventas por hora, más vendidas y origen de los datos. |
| GET | `/detalle` | `desde`, `hasta`, `id_preparacion?`, `categoria?` | Comparación por menú y por preparación, ventas por hora y día a día. |
| GET | `/mensual` | `mes` **o** `desde`+`hasta` | Informe general: qué se agota más rápido (jornadas cerradas). |

## Predicción — `/api/prediccion`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/hoy` | Cajero, Personal, Administrador | Hora estimada de agotamiento por categoría (jornada abierta). |
| GET | `/sugerencias` | Personal, Administrador, Nutricionista | `?fecha=` → cantidad sugerida a preparar por categoría, con rango. |
| GET | `/confiabilidad` | Administrador, Nutricionista | Backtesting: error del modelo vs. promedio simple, cobertura y sobrantes. |

## Estudiante — `/api/estudiante` (solo rol Estudiante)

| Método | Ruta | Cuerpo | Descripción |
|---|---|---|---|
| GET | `/perfil` | — | Alergias, favoritos, calificaciones y categoría preferida. |
| PUT | `/alergias` | `{ alergenos: [...] }` | Reemplaza las alergias (solo del catálogo). |
| PUT | `/categoria-preferida` | `{ categoria }` (o `null`) | Categoría con que abre el menú. |
| PUT / DELETE | `/favoritos/:id` | — | Marca / quita un favorito (idempotente). |
| PUT | `/calificaciones/:id` | `{ estrellas: 1-5, comentario?: ≤300, categoria? }` | Crea o actualiza su opinión. La versión anterior se conserva en el historial. |
| DELETE | `/calificaciones/:id` | — | Elimina su opinión (queda registrada como "eliminada"). |
| GET | `/alertas` | — | Favoritos que están hoy en el menú y cuánto queda. |

## Opiniones — `/api/opiniones` (Administrador, Nutricionista)

| Método | Ruta | Parámetros | Descripción |
|---|---|---|---|
| GET | `/` | — | Promedios por preparación, favoritos más marcados y últimos comentarios. |
| GET | `/detalle` | `desde`, `hasta`, `id_preparacion`, `categoria`, `estado` (`vigente`/`editada`/`eliminada`), `estrellas`, `con_comentario=1`, `limite` (máx. 5000) | Historial completo, incluyendo opiniones editadas y eliminadas, con autor y correo. |
| GET | `/favoritos` | `desde`, `hasta`, `id_preparacion` | Quién marcó cada favorito y totales. |

## Usuarios — `/api/usuarios` (solo Administrador)

| Método | Ruta | Cuerpo | Descripción |
|---|---|---|---|
| GET | `/` | — | Lista de usuarios. |
| POST | `/` | `{ nombre, email, password (≥ 8), rol }` | Crea una cuenta. |
| PATCH | `/:id` | `{ nombre?, rol?, activo? }` | No permite desactivarse ni quitarse el rol de administrador a uno mismo. |
| PUT | `/:id/password` | `{ password (≥ 8) }` | Cambia la contraseña. |

## Archivos

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/uploads/:archivo` | Público | Imágenes subidas (con `Content-Security-Policy` restrictiva). |

---

### Ejemplo rápido

```bash
# 1. Iniciar sesión
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@duocuc.cl","password":"Test1234"}'

# 2. Usar el token
curl http://localhost:3000/api/jornada/hoy -H "Authorization: Bearer <token>"

# 3. Menú público (sin token)
curl "http://localhost:3000/api/menu/hoy?categoria=General"
```
