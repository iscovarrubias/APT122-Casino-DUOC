const pool = require('../config/db');

function error(status, mensaje) {
  const err = new Error(mensaje);
  err.status = status;
  return err;
}

function limpiarIngredientes(lista = []) {
  const vistos = new Set();
  const salida = [];
  for (const crudo of lista) {
    const nombre = String(crudo).trim();
    if (nombre && !vistos.has(nombre.toLowerCase())) {
      vistos.add(nombre.toLowerCase());
      salida.push(nombre);
    }
  }
  return salida;
}

async function reemplazarIngredientes(client, id_preparacion, ingredientes) {
  await client.query('DELETE FROM preparacion_ingrediente WHERE id_preparacion = $1', [id_preparacion]);
  for (const nombre of limpiarIngredientes(ingredientes)) {
    const ing = await client.query(
      `INSERT INTO ingrediente (nombre) VALUES ($1)
       ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
       RETURNING id_ingrediente`,
      [nombre]
    );
    await client.query(
      `INSERT INTO preparacion_ingrediente (id_preparacion, id_ingrediente) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [id_preparacion, ing.rows[0].id_ingrediente]
    );
  }
}

async function listarActivas() {
  const { rows } = await pool.query(
    `SELECT p.id_preparacion, p.nombre, p.descripcion, p.precio, p.imagen_url,
            t.nombre AS tipo,
            COALESCE(json_agg(DISTINCT i.nombre) FILTER (WHERE i.nombre IS NOT NULL), '[]') AS ingredientes,
            COALESCE(json_agg(DISTINCT a.nombre) FILTER (WHERE a.nombre IS NOT NULL), '[]') AS alergenos,
            CASE WHEN n.validado THEN
              json_build_object('calorias', n.calorias, 'proteinas_g', n.proteinas_g,
                                'carbohidratos_g', n.carbohidratos_g, 'grasas_g', n.grasas_g, 'fuente', n.fuente)
            ELSE NULL END AS informacion_nutricional
     FROM preparacion p
     LEFT JOIN tipo_componente t ON t.id_tipo_componente = p.id_tipo_componente
     LEFT JOIN preparacion_ingrediente pi ON pi.id_preparacion = p.id_preparacion
     LEFT JOIN ingrediente i ON i.id_ingrediente = pi.id_ingrediente
     LEFT JOIN preparacion_alergeno pa ON pa.id_preparacion = p.id_preparacion
     LEFT JOIN alergeno a ON a.id_alergeno = pa.id_alergeno
     LEFT JOIN informacion_nutricional n ON n.id_preparacion = p.id_preparacion
     WHERE p.activa = TRUE
     GROUP BY p.id_preparacion, t.nombre, n.validado, n.calorias, n.proteinas_g, n.carbohidratos_g, n.grasas_g, n.fuente
     ORDER BY p.nombre`
  );
  return rows;
}

async function listarGestion() {
  const { rows } = await pool.query(
     `SELECT p.id_preparacion, p.nombre, p.descripcion, p.precio, p.imagen_url, p.activa,
            t.nombre AS tipo,
            COALESCE(ing.lista, '[]') AS ingredientes,
            COALESCE(al.lista, '[]') AS alergenos,
            CASE WHEN n.id_preparacion IS NULL THEN NULL ELSE
              json_build_object('calorias', n.calorias, 'proteinas_g', n.proteinas_g,
                                'carbohidratos_g', n.carbohidratos_g, 'grasas_g', n.grasas_g,
                                'validado', n.validado, 'fuente', n.fuente)
            END AS nutricion
     FROM preparacion p
     LEFT JOIN tipo_componente t ON t.id_tipo_componente = p.id_tipo_componente
     LEFT JOIN LATERAL (
        SELECT json_agg(i.nombre ORDER BY i.nombre) AS lista
        FROM preparacion_ingrediente pi JOIN ingrediente i ON i.id_ingrediente = pi.id_ingrediente
        WHERE pi.id_preparacion = p.id_preparacion
     ) ing ON TRUE
     LEFT JOIN LATERAL (
        SELECT json_agg(a.nombre ORDER BY a.nombre) AS lista
        FROM preparacion_alergeno pa JOIN alergeno a ON a.id_alergeno = pa.id_alergeno
        WHERE pa.id_preparacion = p.id_preparacion
     ) al ON TRUE
     LEFT JOIN informacion_nutricional n ON n.id_preparacion = p.id_preparacion
     ORDER BY p.activa DESC, p.nombre`
  );
  return rows;
}

// HU-01
async function crear({ nombre, descripcion, precio, imagen_url, tipo, ingredientes = [] }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO preparacion (nombre, descripcion, precio, imagen_url, activa, id_tipo_componente)
       VALUES ($1, $2, $3, $4, TRUE, (SELECT id_tipo_componente FROM tipo_componente WHERE nombre = $5))
       RETURNING id_preparacion, nombre, descripcion, precio, imagen_url, activa`,
      [nombre, descripcion || null, precio, imagen_url || null, tipo || null]
    );
    await reemplazarIngredientes(client, rows[0].id_preparacion, ingredientes);
    await client.query('COMMIT');
    return { ...rows[0], ingredientes: limpiarIngredientes(ingredientes) };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

const CAMPOS_EDITABLES = ['nombre', 'descripcion', 'precio', 'imagen_url'];

async function actualizar(id, datos) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const sets = [];
    const valores = [id];
    for (const campo of CAMPOS_EDITABLES) {
      if (datos[campo] !== undefined) {
        valores.push(datos[campo] === '' ? null : datos[campo]);
        sets.push(`${campo} = $${valores.length}`);
      }
    }
    if (datos.tipo !== undefined) {
      valores.push(datos.tipo);
      sets.push(`id_tipo_componente = (SELECT id_tipo_componente FROM tipo_componente WHERE nombre = $${valores.length})`);
    }

    let fila;
    if (sets.length) {
      const res = await client.query(
        `UPDATE preparacion SET ${sets.join(', ')} WHERE id_preparacion = $1
         RETURNING id_preparacion, nombre, descripcion, precio, imagen_url, activa`,
        valores
      );
      fila = res.rows[0];
    } else {
      const res = await client.query(
        'SELECT id_preparacion, nombre, descripcion, precio, imagen_url, activa FROM preparacion WHERE id_preparacion = $1',
        [id]
      );
      fila = res.rows[0];
    }
    if (!fila) {
      await client.query('ROLLBACK');
      return null;
    }

    if (Array.isArray(datos.ingredientes)) {
      await reemplazarIngredientes(client, id, datos.ingredientes);
    }

    await client.query('COMMIT');
    return fila;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function cambiarEstado(id, activa) {
  const { rows } = await pool.query(
    'UPDATE preparacion SET activa = $2 WHERE id_preparacion = $1 RETURNING id_preparacion, nombre, activa',
    [id, activa]
  );
  return rows[0] || null;
}

async function listarCatalogoAlergenos() {
  const { rows } = await pool.query('SELECT id_alergeno, nombre FROM alergeno ORDER BY nombre');
  return rows;
}

async function listarTipos() {
  const { rows } = await pool.query('SELECT id_tipo_componente, nombre FROM tipo_componente ORDER BY id_tipo_componente');
  return rows;
}

async function asignarAlergenos(id_preparacion, nombres = []) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const prep = await client.query('SELECT 1 FROM preparacion WHERE id_preparacion = $1', [id_preparacion]);
    if (!prep.rows[0]) throw error(404, 'Preparación no encontrada.');

    await client.query('DELETE FROM preparacion_alergeno WHERE id_preparacion = $1', [id_preparacion]);

    for (const nombre of [...new Set(nombres)]) {
      const res = await client.query('SELECT id_alergeno FROM alergeno WHERE nombre = $1', [nombre]);
      if (!res.rows[0]) throw error(400, `"${nombre}" no está en el catálogo de alérgenos.`);
      await client.query('INSERT INTO preparacion_alergeno (id_preparacion, id_alergeno) VALUES ($1, $2)', [
        id_preparacion,
        res.rows[0].id_alergeno,
      ]);
    }

    await client.query('COMMIT');
    return [...new Set(nombres)];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function actualizarNutricion(id_preparacion, { calorias, proteinas_g, carbohidratos_g, grasas_g, fuente, validado }) {
  const { rows } = await pool.query(
    `INSERT INTO informacion_nutricional (id_preparacion, calorias, proteinas_g, carbohidratos_g, grasas_g, fuente, validado, actualizado_en)
     VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
     ON CONFLICT (id_preparacion) DO UPDATE SET
       calorias = EXCLUDED.calorias, proteinas_g = EXCLUDED.proteinas_g,
       carbohidratos_g = EXCLUDED.carbohidratos_g, grasas_g = EXCLUDED.grasas_g,
       fuente = EXCLUDED.fuente, validado = EXCLUDED.validado, actualizado_en = CURRENT_TIMESTAMP
     RETURNING id_preparacion, calorias, proteinas_g, carbohidratos_g, grasas_g, fuente, validado, actualizado_en`,
    [id_preparacion, calorias ?? null, proteinas_g ?? null, carbohidratos_g ?? null, grasas_g ?? null, fuente || null, !!validado]
  );
  return rows[0];
}

async function eliminar(id) {
  const prep = await pool.query('SELECT activa FROM preparacion WHERE id_preparacion = $1', [id]);
  if (!prep.rows[0]) return { error: 'no_encontrada' };
  if (prep.rows[0].activa) return { error: 'activa' };

  try {
    const { rowCount } = await pool.query('DELETE FROM preparacion WHERE id_preparacion = $1', [id]);
    return rowCount ? { ok: true } : { error: 'no_encontrada' };
  } catch (err) {
    if (err.code === '23503') {
      const ref = await pool.query(
        'SELECT COUNT(*)::int AS usos FROM menu_preparacion WHERE id_preparacion = $1',
        [id]
      );
      return { error: 'en_uso', usos: ref.rows[0].usos };
    }
    throw err;
  }
}

module.exports = {
  listarActivas, listarGestion, crear, actualizar, cambiarEstado, eliminar,
  listarCatalogoAlergenos, asignarAlergenos, actualizarNutricion, listarTipos,
};