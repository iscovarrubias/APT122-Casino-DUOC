# Login con Microsoft (Entra ID) — notas para implementación real

## Para probar ahora (tenant propio)

Ya está funcionando con un tenant de pruebas. Si se cae, revisar:

- Las variables `ENTRA_*` en el `.env` (tenant_id, client_id, secret, redirect_uri)
- Que el redirect_uri coincida exacto con el de Entra: `http://localhost:3000/api/auth/microsoft/callback`
- Si Microsoft no está configurado, dejar `SSO_SIMULADO=true` y usar el botón de demo

## Para implementar con Entra de Duoc

Cambiar solo esto en el `.env`:

- `ENTRA_TENANT_ID` → el tenant de Duoc
- `ENTRA_CLIENT_ID` → el client_id que entregue Duoc
- `ENTRA_CLIENT_SECRET` → el secreto que entregue Duoc
- `ENTRA_REDIRECT_URI` → con `https`, apuntando al dominio real
- `ENTRA_DOMINIOS_ESTUDIANTES=duocuc.cl`
- `ENTRA_DOMINIOS_PERSONAL=duoc.cl,profesor.duoc.cl`

## Cosas a tener en cuenta

- El secreto de cliente va solo en `backend/.env` (que `.gitignore` excluye). No subirlo ni compartirlo.
- Si se cambia el secreto en Entra, hay que actualizarlo en el `.env` y reiniciar el backend.
- Los funcionarios y docentes no se registran solos: si entran sin estar registrados, les aparece un aviso para que pidan acceso al admin.
- Las cuentas con correo de otro dominio (ej: admin@duocuc.cl) siguen entrando con contraseña normal.
