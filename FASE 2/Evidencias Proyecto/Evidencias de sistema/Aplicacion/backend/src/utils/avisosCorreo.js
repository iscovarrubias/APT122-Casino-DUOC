const correoModel = require('../models/correo.model');
const { enviar, modo } = require('./correo');
const plantillas = require('./plantillasCorreo');
const { hoyChile } = require('./fecha');

function sumarDias(fecha, dias) {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

const diaSemana = (fecha) => new Date(`${fecha}T12:00:00Z`).getUTCDay();

function semanaObjetivo(hoy) {
  const dow = diaSemana(hoy);
  const lunes = dow === 6 ? sumarDias(hoy, 2) : dow === 0 ? sumarDias(hoy, 1) : sumarDias(hoy, 1 - dow);
  return { lunes, viernes: sumarDias(lunes, 4) };
}

function decidirSemanal(destinatario, filas) {
  if (destinatario.menu_semanal) return 'semanal';
  if (destinatario.avisos_favoritos && plantillas.favoritosEn(filas, destinatario.favoritos).length) return 'favoritos_semana';
  return null;
}

async function despachar(destinatario, tipo, clave, correo, enlaceBaja) {
  const reserva = await correoModel.reservarEnvio(destinatario.id_usuario, tipo, clave, correo.asunto.slice(0, 200), modo());
  if (!reserva) return 'repetido';
  try {
    await enviar({ para: destinatario.email, asunto: correo.asunto, html: correo.html, texto: correo.texto, enlaceBaja });
    return 'enviado';
  } catch (err) {
    await correoModel.liberarEnvio(reserva);
    console.error(`No se pudo enviar el correo ${tipo} a ${destinatario.id_usuario}:`, err.message);
    return 'fallido';
  }
}

function resumen(tipo, clave) {
  return { tipo, clave, modo: modo(), enviados: 0, repetidos: 0, omitidos: 0, fallidos: 0 };
}

const enlaces = (urls, token) => ({
  enlaceSitio: urls.sitio,
  enlaceBaja: `${urls.api}/api/correos/baja?token=${encodeURIComponent(token)}`,
});

async function enviarSemanal({ hoy = hoyChile(), urls }) {
  const { lunes, viernes } = semanaObjetivo(hoy);
  const r = resumen('semanal', lunes);
  const filas = await correoModel.menuPublicado(lunes, viernes);
  if (!filas.length) return { ...r, motivo: 'No hay menú publicado para esa semana.' };
  for (const d of await correoModel.destinatarios()) {
    const tipo = decidirSemanal(d, filas);
    if (!tipo) {
      r.omitidos += 1;
      continue;
    }
    const ligas = enlaces(urls, d.token_baja);
    const datos = { nombre: d.nombre, lunes, viernes, filas, favoritos: d.favoritos, ...ligas };
    const correo = tipo === 'semanal' ? plantillas.correoMenuSemanal(datos) : plantillas.correoFavoritosSemana(datos);
    const estado = await despachar(d, tipo, lunes, correo, ligas.enlaceBaja);
    r[`${estado === 'enviado' ? 'enviados' : estado === 'repetido' ? 'repetidos' : 'fallidos'}`] += 1;
  }
  return r;
}

async function enviarDiario({ hoy = hoyChile(), urls }) {
  const r = resumen('favorito_dia', hoy);
  if ([0, 6].includes(diaSemana(hoy))) return { ...r, motivo: 'Los fines de semana no hay menú.' };
  const filas = await correoModel.menuPublicado(hoy, hoy);
  if (!filas.length) return { ...r, motivo: 'No hay menú publicado hoy.' };
  for (const d of await correoModel.destinatarios()) {
    if (!d.avisos_favoritos || !plantillas.favoritosEn(filas, d.favoritos).length) {
      r.omitidos += 1;
      continue;
    }
    const ligas = enlaces(urls, d.token_baja);
    const correo = plantillas.correoFavoritoDelDia({ nombre: d.nombre, fecha: hoy, filas, favoritos: d.favoritos, ...ligas });
    const estado = await despachar(d, 'favorito_dia', hoy, correo, ligas.enlaceBaja);
    r[`${estado === 'enviado' ? 'enviados' : estado === 'repetido' ? 'repetidos' : 'fallidos'}`] += 1;
  }
  return r;
}

module.exports = { enviarSemanal, enviarDiario, semanaObjetivo, decidirSemanal };
