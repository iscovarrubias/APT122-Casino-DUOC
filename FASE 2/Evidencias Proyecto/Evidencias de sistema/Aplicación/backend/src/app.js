require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middleware/errorHandler');
const { RUTA_UPLOADS } = require('./middleware/subida');
const authRoutes = require('./routes/auth.routes');
const preparacionesRoutes = require('./routes/preparaciones.routes');
const ingredientesRoutes = require('./routes/ingrediente.routes');
const menuRoutes = require('./routes/menu.routes');
const jornadaRoutes = require('./routes/jornada.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const analisisRoutes = require('./routes/analisis.routes');
const estudianteRoutes = require('./routes/estudiante.routes');
const opinionesRoutes = require('./routes/opiniones.routes');
const prediccionRoutes = require('./routes/prediccion.routes');

const entra = require('./utils/entra');

const ES_PRODUCCION = process.env.NODE_ENV === 'production';

function problemaDeConfiguracion() {
  const secreto = process.env.JWT_SECRET;
  if (!secreto) return 'Falta JWT_SECRET en el archivo .env. El servidor no puede arrancar sin esto.';
  if (!process.env.DATABASE_URL) return 'Falta DATABASE_URL en el archivo .env. El servidor no puede arrancar sin esto.';
  const problemaEntra = entra.problemaDeConfiguracion();
  if (problemaEntra) return problemaEntra;
  if (ES_PRODUCCION) {
    if (/^(cambiar|cambia_esto)/i.test(secreto)) return 'JWT_SECRET sigue con el valor de ejemplo. Define un secreto propio antes de desplegar.';
    if (secreto.length < 32) return 'JWT_SECRET debe tener al menos 32 caracteres en producción.';
    if (!process.env.CORS_ORIGIN) return 'CORS_ORIGIN es obligatorio en producción: indica la URL del frontend.';
    if (process.env.SSO_SIMULADO === 'true') return 'SSO_SIMULADO=true está prohibido en producción: permite entrar sin contraseña real. Desactívalo antes de desplegar.';
  }
  return null;
}

const problema = problemaDeConfiguracion();
if (problema) {
  console.error(problema);
  process.exit(1);
}

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', Number(process.env.TRUST_PROXY) || 0);

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    ...(ES_PRODUCCION ? { 'Strict-Transport-Security': 'max-age=15552000; includeSubDomains' } : {}),
  });
  next();
});

const origenes = (process.env.CORS_ORIGIN || '').split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors(origenes.length ? { origin: origenes } : undefined));

app.use(express.json({ limit: '100kb' }));

app.use('/uploads', express.static(RUTA_UPLOADS, {
  index: false,
  dotfiles: 'deny',
  setHeaders: (res) => {
    res.set('Content-Security-Policy', "default-src 'none'; img-src 'self'; sandbox");
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  },
}));

app.get('/api/health', (req, res) => {
  res.json({ estado: 'ok', proyecto: 'APT122 - Casino DUOC UC' });
});

app.use('/api/auth', authRoutes);
app.use('/api/preparaciones', preparacionesRoutes);
app.use('/api/ingredientes', ingredientesRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/jornada', jornadaRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/analisis', analisisRoutes);
app.use('/api/estudiante', estudianteRoutes);
app.use('/api/opiniones', opinionesRoutes);
app.use('/api/prediccion', prediccionRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`Servidor del Casino DUOC UC escuchando en el puerto ${PORT}.`);
  });
}

module.exports = app;
