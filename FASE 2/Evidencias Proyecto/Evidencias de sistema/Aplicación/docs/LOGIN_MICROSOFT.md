# Inicio de sesión con Microsoft (Entra ID)

El acceso es único: la persona escribe su correo y el sistema detecta el rol.

| Correo | Cómo entra |
|---|---|
| Cuenta del personal (administrador, cajero, nutricionista…) | Contraseña del sistema |
| Estudiante (`@duocuc.cl`) | Cuenta de Microsoft (o acceso de demostración si Microsoft está apagado) |

Si no defines las variables `ENTRA_*`, Microsoft queda **apagado** y todo sigue funcionando con `SSO_SIMULADO=true`.

## Crear tu propio tenant de pruebas (gratis, sin pedir permisos a Duoc)

1. Entra a <https://entra.microsoft.com> con una cuenta personal y crea un tenant nuevo (Identity → Overview → Manage tenants → Create). Elige "Microsoft Entra ID".
2. En el tenant nuevo ve a **App registrations → New registration**.
   - Nombre: `Casino DUOC (pruebas)`.
   - Tipos de cuenta: *solo este directorio*.
   - Redirect URI (tipo **Web**): `http://localhost:3000/api/auth/microsoft/callback`.
3. En **Overview** copia *Directory (tenant) ID* y *Application (client) ID*.
4. En **Certificates & secrets → New client secret** crea un secreto y copia su **Value** (solo se muestra una vez).
5. En **Users → New user** crea 2 o 3 usuarios de prueba (por ejemplo `alumno1@tudominio.onmicrosoft.com`).
6. Completa `backend/.env`:

```
ENTRA_TENANT_ID=<tenant id>
ENTRA_CLIENT_ID=<client id>
ENTRA_CLIENT_SECRET=<secreto>
ENTRA_REDIRECT_URI=http://localhost:3000/api/auth/microsoft/callback
ENTRA_DOMINIOS_ESTUDIANTES=tudominio.onmicrosoft.com
FRONTEND_URL=http://localhost:5173
```

`ENTRA_DOMINIOS_ESTUDIANTES` indica qué dominios se registran solos como estudiantes. Si el correo ya existe en el sistema (por ejemplo un cajero), entra con su rol actual.

7. Reinicia el backend. Al escribir un correo de estudiante en el login aparece el botón **Continuar con Microsoft**.

## Dar roles al personal

1. La persona entra una vez con Microsoft: queda registrada como estudiante.
2. Un administrador va a **Usuarios**, busca su correo y cambia el rol en la lista desplegable (Cajero, Nutricionista, Administrador…).
3. Desde su próximo ingreso entra con ese rol. Para crearlo antes de que entre, usa **Nuevo usuario** con su correo de Microsoft; la contraseña que pidas no se usará con Microsoft.

Funcionarios (`@duoc.cl`) y docentes (`@profesor.duoc.cl`) no se registran solos: si entran sin estar registrados, ven un aviso para que pidan acceso al administrador. Las cuentas con correo de un dominio que no esté en esas listas (por ejemplo `admin@duocuc.cl` en las pruebas) siguen entrando con contraseña.

## Pasar a Duoc si el casino llega a ser oficial

Cambian estos valores: `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, `ENTRA_CLIENT_SECRET` y `ENTRA_REDIRECT_URI` (con `https`), además de `ENTRA_DOMINIOS_ESTUDIANTES=duocuc.cl` y `ENTRA_DOMINIOS_PERSONAL=duoc.cl,profesor.duoc.cl`. El código no cambia. Duoc debe registrar la aplicación en su tenant.

## Cómo funciona (para la defensa)

- Flujo *authorization code* con **PKCE** y parámetros `state` y `nonce`.
- El `id_token` se valida: firma RS256 con las claves públicas de Microsoft, emisor, audiencia y nonce.
- La contraseña nunca pasa por el sistema.
- El navegador no recibe el token en la URL: vuelve con un ticket de un solo uso (60 s) que se canjea por la sesión.
- Pruebas automáticas: `backend/tests/entra.test.js` (usa un Microsoft falso local; verifica que se rechacen tokens con firma, audiencia, nonce o state incorrectos).

## Limitaciones conocidas

- Los tickets se guardan en memoria: sirve para una sola instancia del servidor.
