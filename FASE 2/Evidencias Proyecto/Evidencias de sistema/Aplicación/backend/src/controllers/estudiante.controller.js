const model = require('../models/estudiante.model');
const { ApiError } = require('../middleware/errorHandler');

const idDe = (req) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, 'Identificador inválido.');
  return id;
};
const envolver = (fn, estado = 200) => async (req, res, next) => {
  try { res.status(estado).json(await fn(req)); } catch (err) { next(err); }
};

const perfil = envolver((req) => model.perfil(req.user.id_usuario));

const alergias = envolver(async (req) => {
  const { alergenos } = req.body;
  if (!Array.isArray(alergenos) || alergenos.length > 30 || alergenos.some((a) => typeof a !== 'string')) {
    throw new ApiError(400, 'alergenos debe ser una lista de nombres del catálogo.');
  }
  return { alergias: await model.fijarAlergias(req.user.id_usuario, alergenos) };
});

const marcarFavorito = envolver(async (req) => { await model.marcarFavorito(req.user.id_usuario, idDe(req)); return { favorito: true }; });
const quitarFavorito = envolver(async (req) => { await model.quitarFavorito(req.user.id_usuario, idDe(req)); return { favorito: false }; });

const calificar = envolver(async (req) => {
  const estrellas = Number(req.body.estrellas);
  if (!Number.isInteger(estrellas) || estrellas < 1 || estrellas > 5) throw new ApiError(400, 'Las estrellas deben ser un entero entre 1 y 5.');
  let comentario = req.body.comentario;
  if (comentario !== undefined && comentario !== null) {
    if (typeof comentario !== 'string') throw new ApiError(400, 'El comentario debe ser texto.');
    comentario = comentario.trim();
    if (comentario.length > 300) throw new ApiError(400, 'El comentario no puede superar los 300 caracteres.');
  }
  return model.calificar(req.user.id_usuario, idDe(req), estrellas, comentario);
});
const quitarCalificacion = envolver(async (req) => { await model.quitarCalificacion(req.user.id_usuario, idDe(req)); return { eliminada: true }; });
const alertas = envolver((req) => model.alertas(req.user.id_usuario, req.user.id_sede));
const opiniones = envolver(() => model.resumenOpiniones());

const categoriaPreferida = envolver(async (req) => {
  const { categoria } = req.body;
  if (categoria !== null && categoria !== '' && typeof categoria !== 'string') {
    throw new ApiError(400, 'categoria debe ser un nombre o null.');
  }
  return { categoria_preferida: await model.fijarCategoriaPreferida(req.user.id_usuario, categoria || null) };
});

module.exports = { perfil, alergias, categoriaPreferida, marcarFavorito, quitarFavorito, calificar, quitarCalificacion, alertas, opiniones };
