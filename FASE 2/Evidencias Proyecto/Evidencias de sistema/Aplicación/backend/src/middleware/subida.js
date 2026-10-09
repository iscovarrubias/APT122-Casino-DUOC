const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const RUTA_UPLOADS = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(RUTA_UPLOADS, { recursive: true });

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const TAMANO_MAXIMO = 3 * 1024 * 1024; // 3 MB

const almacenamiento = multer.diskStorage({
  destination: (req, file, cb) => cb(null, RUTA_UPLOADS),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const subirImagen = multer({
  storage: almacenamiento,
  limits: { fileSize: TAMANO_MAXIMO },
  fileFilter: (req, file, cb) => {
    if (!TIPOS_PERMITIDOS.includes(file.mimetype)) {
      return cb(new Error('Formato no permitido. Solo JPG, PNG, WEBP o GIF.'));
    }
    cb(null, true);
  },
});

module.exports = { subirImagen, RUTA_UPLOADS, TAMANO_MAXIMO };