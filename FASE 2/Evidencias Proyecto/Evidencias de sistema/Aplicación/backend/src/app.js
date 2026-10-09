require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { errorHandler } = require('./middleware/errorHandler');
const { RUTA_UPLOADS } = require('./middleware/subida');
const authRoutes = require('./routes/auth.routes');
const preparacionesRoutes = require('./routes/preparaciones.routes');
const menuRoutes = require('./routes/menu.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const analisisRoutes = require('./routes/analisis.routes');


if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET en el archivo .env. El servidor no puede arrancar sin esto.');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL en el archivo .env. El servidor no puede arrancar sin esto.');
  process.exit(1);
}
if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.startsWith('cambia_esto')) {
  console.error('JWT_SECRET sigue con el valor de ejemplo. Define un secreto real antes de desplegar.');
  process.exit(1);
}

const app = express();

const origenes = (process.env.CORS_ORIGIN || '').split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors(origenes.length ? { origin: origenes } : undefined));

app.use(express.json());

app.set('trust proxy', 1);

app.use('/uploads', express.static(RUTA_UPLOADS));

app.get('/api/health', (req, res) => {
  res.json({ estado: 'ok', proyecto: 'APT122 - Casino DUOC UC' });
});

app.use('/api/auth', authRoutes);
app.use('/api/preparaciones', preparacionesRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/analisis', analisisRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});


app.use(errorHandler);

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
}

module.exports = app;
