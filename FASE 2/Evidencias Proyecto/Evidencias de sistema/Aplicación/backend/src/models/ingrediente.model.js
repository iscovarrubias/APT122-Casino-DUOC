const pool = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');
const { calcularNutricion } = require('../utils/nutricion');

const SELECT_BASE = `
  SELECT i.id_ingrediente, i.nombre, i.id_categoria_ingrediente, c.nombre AS categoria,
         i.calorias_100g, i.proteinas_100g, i.carbohidratos_100g, i.grasas_100g, i.sin_cuantificar,
         COALESCE(al.lista, '[]') AS alergenos,
         (SELECT COUNT(*)::int FROM preparacion_ingrediente pi WHERE pi.id_ingrediente = i.id_ingrediente) AS usos
  FROM ingrediente i
  LEFT JOIN categoria_ingrediente c ON c.id_categoria_ingrediente = i.id_categoria_ingrediente
  LEFT JOIN LATERAL (
    SELECT json_agg(a.nombre ORDER BY a.nombre) AS lista
    FROM ingrediente_alergeno ia JOIN alergeno a ON a.id_alergeno = ia.id_alergeno
    WHERE ia.id_ingrediente = i.id_ingrediente
  ) al ON TRUE`;

const CAMPOS_EDITABLES = [
  'nombre', 'id_categoria_ingrediente', 'calorias_100g', 'proteinas_100g', 'carbohidratos_100g',
  'grasas_100g', 'sin_cuantificar',
];

const CAMPOS_QUE_RECALCULAN = ['calorias_100g', 'proteinas_100g', 'carbohidratos_100g', 'grasas_100g', 'sin_cuantificar'];
const normalizar = (v) => (v === null || v === undefined ? null : typeof v === 'boolean' ? v : String(Number(v)));

async function listar() {
  const { rows } = await pool.query(`${SELECT_BASE} ORDER BY c.id_categoria_ingrediente NULLS LAST, i.nombre`);
  return rows;
}

async function obtener(id) {
  const { rows } = await pool.query(`${SELECT_BASE} WHERE i.id_ingrediente = $1`, [id]);
  return rows[0] || null;
}

async function listarCategorias() {
  const { rows } = await pool.query('SELECT id_categoria_ingrediente, nombre FROM categoria_ingrediente ORDER BY id_categoria_ingrediente');
  return rows;
}

async function reemplazarAlergenos(client, id_ingrediente, nombres) {
  if (!Array.isArray(nombres)) return;
  const unicos = [...new Set(nombres)];
  await client.query('DELETE FROM ingrediente_alergeno WHERE id_ingrediente = $1', [id_ingrediente]);
  if (!unicos.length) return;
  const r = await client.query(
    `INSERT INTO ingrediente_alergeno (id_ingrediente, id_alergeno)
     SELECT $1, id_alergeno FROM alergeno WHERE nombre = ANY($2::text[])`,
    [id_ingrediente, unicos]
  );
  if (r.rowCount !== unicos.length) throw new ApiError(400, 'Algún alérgeno no está en el catálogo.');
}

async function crear(datos) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO ingrediente (nombre, id_categoria_ingrediente, calorias_100g, proteinas_100g,
                                carbohidratos_100g, grasas_100g, sin_cuantificar)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id_ingrediente`,
      [datos.nombre, datos.id_categoria_ingrediente ?? null, datos.calorias_100g ?? null, datos.proteinas_100g ?? null,
       datos.carbohidratos_100g ?? null, datos.grasas_100g ?? null, datos.sin_cuantificar ?? false]
    );
    await reemplazarAlergenos(client, rows[0].id_ingrediente, datos.alergenos);
    await client.query('COMMIT');
    return obtener(rows[0].id_ingrediente);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function recalcularCalculadas(client, id_ingrediente) {
  const { rows: preps } = await client.query(
    `SELECT DISTINCT n.id_preparacion, p.porciones_receta
     FROM informacion_nutricional n
     JOIN preparacion p ON p.id_preparacion = n.id_preparacion
     JOIN preparacion_ingrediente pi ON pi.id_preparacion = p.id_preparacion
     WHERE n.origen = 'calculada' AND pi.id_ingrediente = $1`,
    [id_ingrediente]
  );
  let recalculadas = 0;
  let sin_datos = 0;
  for (const p of preps) {
    const { rows: ings } = await client.query(
      `SELECT i.nombre, i.calorias_100g, i.proteinas_100g, i.carbohidratos_100g, i.grasas_100g,
              i.sin_cuantificar, pi.cantidad_g
       FROM preparacion_ingrediente pi JOIN ingrediente i ON i.id_ingrediente = pi.id_ingrediente
       WHERE pi.id_preparacion = $1`,
      [p.id_preparacion]
    );
    const r = calcularNutricion({ porciones: p.porciones_receta, ingredientes: ings });
    if (r.completo) {
      const x = r.por_porcion;
      await client.query(
        `UPDATE informacion_nutricional SET calorias = $2, proteinas_g = $3, carbohidratos_g = $4, grasas_g = $5,
                actualizado_en = CURRENT_TIMESTAMP, calculado_en = CURRENT_TIMESTAMP
         WHERE id_preparacion = $1`,
        [p.id_preparacion, x.calorias, x.proteinas_g, x.carbohidratos_g, x.grasas_g]
      );
      recalculadas++;
    } else {
      await client.query(
        `UPDATE informacion_nutricional SET calorias = NULL, proteinas_g = NULL, carbohidratos_g = NULL,
                grasas_g = NULL, actualizado_en = CURRENT_TIMESTAMP
         WHERE id_preparacion = $1`,
        [p.id_preparacion]
      );
      sin_datos++;
    }
  }
  return { recalculadas, sin_datos };
}

async function actualizar(id, datos) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const antes = (await client.query('SELECT * FROM ingrediente WHERE id_ingrediente = $1 FOR UPDATE', [id])).rows[0];
    if (!antes) {
      await client.query('ROLLBACK');
      return null;
    }

    const sets = [];
    const valores = [id];
    for (const campo of CAMPOS_EDITABLES) {
      if (datos[campo] !== undefined) {
        valores.push(datos[campo]);
        sets.push(`${campo} = $${valores.length}`);
      }
    }
    let despues = antes;
    if (sets.length) {
      despues = (await client.query(`UPDATE ingrediente SET ${sets.join(', ')} WHERE id_ingrediente = $1 RETURNING *`, valores)).rows[0];
    }
    await reemplazarAlergenos(client, id, datos.alergenos);

    let resultado = { recalculadas: 0, sin_datos: 0 };
    if (CAMPOS_QUE_RECALCULAN.some((c) => normalizar(antes[c]) !== normalizar(despues[c]))) {
      resultado = await recalcularCalculadas(client, id);
    }

    await client.query('COMMIT');
    return { ingrediente: await obtener(id), ...resultado };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function eliminar(id) {
  try {
    const { rowCount } = await pool.query('DELETE FROM ingrediente WHERE id_ingrediente = $1', [id]);
    return rowCount > 0;
  } catch (err) {
    if (err.code === '23503') {
      throw new ApiError(409, 'No se puede borrar: el ingrediente ya se usa en una o más preparaciones.');
    }
    throw err;
  }
}

module.exports = { listar, obtener, listarCategorias, crear, actualizar, eliminar };
