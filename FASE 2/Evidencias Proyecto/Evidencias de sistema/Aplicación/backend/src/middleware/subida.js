const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { ApiError } = require('./errorHandler');

const RUTA_UPLOADS = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(RUTA_UPLOADS, { recursive: true });

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const TAMANO_MAXIMO = 3 * 1024 * 1024;

function detectarFormato(buffer) {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { tipo: 'image/jpeg', ext: '.jpg' };
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { tipo: 'image/png', ext: '.png' };
  const cabecera = buffer.subarray(0, 6).toString('latin1');
  if (cabecera === 'GIF87a' || cabecera === 'GIF89a') return { tipo: 'image/gif', ext: '.gif' };
  if (buffer.subarray(0, 4).toString('latin1') === 'RIFF' && buffer.subarray(8, 12).toString('latin1') === 'WEBP') return { tipo: 'image/webp', ext: '.webp' };
  return null;
}

const recibir = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANO_MAXIMO, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!TIPOS_PERMITIDOS.includes(file.mimetype)) {
      return cb(new ApiError(400, 'Formato no permitido. Solo JPG, PNG, WEBP o GIF.'));
    }
    cb(null, true);
  },
});

async function verificarYGuardar(req, res, next) {
  if (!req.file) return next();
  try {
    const formato = detectarFormato(req.file.buffer);
    if (!formato || formato.tipo !== req.file.mimetype) {
      throw new ApiError(400, 'El archivo no es una imagen válida.');
    }
    const nombre = `${crypto.randomUUID()}${formato.ext}`;
    await fs.promises.writeFile(path.join(RUTA_UPLOADS, nombre), req.file.buffer, { flag: 'wx' });
    req.file.filename = nombre;
    req.file.buffer = undefined;
    next();
  } catch (err) {
    next(err);
  }
}

const subirImagen = {
  single: (campo) => [recibir.single(campo), verificarYGuardar],
};

module.exports = { subirImagen, RUTA_UPLOADS, TAMANO_MAXIMO, detectarFormato };
