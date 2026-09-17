require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const preparacionesRoutes = require('./routes/preparaciones.routes');
const menuRoutes = require('./routes/menu.routes');

if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET en el archivo .env. El servidor no puede arrancar sin esto.');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL en el archivo .env. El servidor no puede arrancar sin esto.');
  process.exit(1);
}

const app = express();

app.use(cors());

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ estado: 'ok', proyecto: 'APT122 - Casino DUOC UC' });
});

app.use('/api/auth', authRoutes);
app.use('/api/preparaciones', preparacionesRoutes);
app.use('/api/menu', menuRoutes);


app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});


app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor Sprint 1 corriendo en http://localhost:${PORT}`);
});

module.exports = app;
