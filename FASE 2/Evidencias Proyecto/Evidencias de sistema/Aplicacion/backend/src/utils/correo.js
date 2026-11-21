const nodemailer = require('nodemailer');

let transporte = null;
const registro = [];

function modo() {
  if (process.env.CORREO_MODO === 'registro') return 'registro';
  return process.env.CORREO_SMTP_HOST ? 'smtp' : 'registro';
}

function obtenerTransporte() {
  if (transporte) return transporte;
  transporte = nodemailer.createTransport({
    host: process.env.CORREO_SMTP_HOST,
    port: Number(process.env.CORREO_SMTP_PUERTO) || 587,
    secure: Number(process.env.CORREO_SMTP_PUERTO) === 465,
    auth: process.env.CORREO_SMTP_USUARIO ? { user: process.env.CORREO_SMTP_USUARIO, pass: process.env.CORREO_SMTP_CLAVE } : undefined,
  });
  return transporte;
}

async function enviar({ para, asunto, html, texto, enlaceBaja }) {
  const mensaje = {
    from: process.env.CORREO_REMITENTE || 'Casinos DUOC UC <no-responder@casinos-duoc.cl>',
    to: para,
    subject: asunto,
    html,
    text: texto,
    headers: enlaceBaja ? { 'List-Unsubscribe': `<${enlaceBaja}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } : undefined,
  };
  if (modo() === 'registro') {
    registro.push({ para, asunto, enviado_en: new Date().toISOString() });
    if (registro.length > 200) registro.shift();
    return { modo: 'registro' };
  }
  await obtenerTransporte().sendMail(mensaje);
  return { modo: 'smtp' };
}

const ultimosRegistrados = () => [...registro];

module.exports = { enviar, modo, ultimosRegistrados };
