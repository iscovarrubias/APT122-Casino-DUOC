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
  const categoria = typeof req.body.categoria === 'string' ? req.body.categoria.slice(0, 50) : undefined;
  return model.calificar(req.user.id_usuario, idDe(req), estrellas, comentario, categoria);
});
const quitarCalificacion = envolver(async (req) => { await model.quitarCalificacion(req.user.id_usuario, idDe(req)); return { eliminada: true }; });
const alertas = envolver((req) => model.alertas(req.user.id_usuario, req.user.id_sede));
const opiniones = envolver(() => model.resumenOpiniones());
const opinionesDetalle = envolver((req) => {
  const q = req.query;
  const fechaOk = (v) => v === undefined || v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v);
  if (!fechaOk(q.desde) || !fechaOk(q.hasta)) throw new ApiError(400, 'Las fechas deben tener el formato AAAA-MM-DD.');
  const entero = (v, nombre) => {
    if (v === undefined || v === '') return undefined;
    const n = Number(v);
    if (!Number.isInteger(n) || n <= 0) throw new ApiError(400, `${nombre} inválido.`);
    return n;
  };
  const estrellas = entero(q.estrellas, 'estrellas');
  if (estrellas && estrellas > 5) throw new ApiError(400, 'estrellas inválido.');
  if (q.estado && !['vigente', 'editada', 'eliminada'].includes(q.estado)) throw new ApiError(400, 'estado inválido.');
  return model.listarOpiniones({
    desde: q.desde || undefined, hasta: q.hasta || undefined,
    id_preparacion: entero(q.id_preparacion, 'id_preparacion'),
    categoria: q.categoria || undefined, estado: q.estado || undefined, estrellas,
    soloConComentario: q.con_comentario === '1',
    limite: Math.min(entero(q.limite, 'limite') || 500, 5000),
  });
});

const favoritosDetalle = envolver((req) => {
  const q = req.query;
  const fechaOk = (v) => v === undefined || v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v);
  if (!fechaOk(q.desde) || !fechaOk(q.hasta)) throw new ApiError(400, 'Las fechas deben tener el formato AAAA-MM-DD.');
  let id = q.id_preparacion ? Number(q.id_preparacion) : undefined;
  if (id !== undefined && (!Number.isInteger(id) || id <= 0)) throw new ApiError(400, 'id_preparacion inválido.');
  return model.listarFavoritos({ desde: q.desde || undefined, hasta: q.hasta || undefined, id_preparacion: id });
});

const categoriaPreferida = envolver(async (req) => {
  const { categoria } = req.body;
  if (categoria !== null && categoria !== '' && typeof categoria !== 'string') {
    throw new ApiError(400, 'categoria debe ser un nombre o null.');
  }
  return { categoria_preferida: await model.fijarCategoriaPreferida(req.user.id_usuario, categoria || null) };
});

module.exports = { perfil, alergias, categoriaPreferida, marcarFavorito, quitarFavorito, calificar, quitarCalificacion, alertas, opiniones, opinionesDetalle, favoritosDetalle };
