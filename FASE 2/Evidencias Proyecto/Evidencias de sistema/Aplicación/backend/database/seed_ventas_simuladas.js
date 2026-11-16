require('dotenv').config();
const pool = require('../src/config/db');
const { haceDiasChile } = require('../src/utils/fecha');
const { MARCA_SIMULADO } = require('../src/models/analisis.model');
const argumento = (nombre) => process.argv.find((a) => a.startsWith(`--${nombre}=`))?.split('=')[1];
const DIAS = Number(argumento('dias') || 20);
const LIMPIAR = process.argv.includes('--limpiar');

function crearAzar(semilla) {
  let a = semilla;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const azar = crearAzar(122);
const entre = (min, max) => min + azar() * (max - min);
const barajar = (lista) => {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
};

function minutoDeVenta() {
  for (;;) {
    const u1 = azar() || 1e-9;
    const u2 = azar();
    const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const minuto = Math.round(75 + 38 * normal);
    if (minuto >= 0 && minuto < 180) return minuto;
  }
}

const marcaTiempo = (fecha, minutoDesde12) => {
  const total = 12 * 60 + minutoDesde12;
  return `${fecha} ${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}:00`;
};

const esDiaHabil = (fecha) => {
  const dia = new Date(`${fecha}T12:00:00Z`).getUTCDay();
  return dia !== 0 && dia !== 6;
};

async function limpiar(client) {
  const v = await client.query("DELETE FROM venta WHERE origen_dato = 'simulado'");
  const d = await client.query('DELETE FROM disponibilidad WHERE observacion = $1', [MARCA_SIMULADO]);
  console.log(`Eliminadas ${v.rowCount} ventas simuladas y ${d.rowCount} cambios de disponibilidad simulados.`);
  console.log('Los menús creados para la simulación se conservan (ya fueron publicados como cualquier otro).');
}

const TIPOS_COMPARTIDOS = ['Ensalada', 'Sopa', 'Pan', 'Postre', 'Fruta', 'Bebida'];
const OBLIGATORIOS = ['Ensalada', 'Sopa', 'Postre', 'Fruta', 'Bebida'];

async function cargarPreparacionesPorTipo(client, tipos) {
  const { rows: todas } = await client.query(
    `SELECT id_preparacion, id_tipo_componente FROM preparacion WHERE activa = TRUE`
  );

  const principales = todas
    .filter((p) => p.id_tipo_componente === null || p.id_tipo_componente === tipos['Plato Principal'])
    .map((p) => p.id_preparacion);

  const compartidos = {};
  for (const tipo of TIPOS_COMPARTIDOS) {
    compartidos[tipo] = todas.filter((p) => p.id_tipo_componente === tipos[tipo]).map((p) => p.id_preparacion);
  }

  return { principales, compartidos };
}

async function asegurarComponentes(client, id_menu, grupos, categorias, tipos) {
  const { rows } = await client.query('SELECT 1 FROM menu_preparacion WHERE id_menu = $1 LIMIT 1', [id_menu]);
  if (rows.length) return;

  const insertar = (id_preparacion, id_categoria, id_tipo, cantidad) =>
    client.query(
      `INSERT INTO menu_preparacion (id_menu, id_preparacion, id_categoria_menu, id_tipo_componente, cantidad_planificada)
       VALUES ($1, $2, $3, $4, $5)`,
      [id_menu, id_preparacion, id_categoria, id_tipo, cantidad]
    );

  const principalesBarajados = barajar(grupos.principales);
  if (principalesBarajados.length < categorias.length) {
    throw new Error(
      `Se necesitan al menos ${categorias.length} platos principales activos y hay ${principalesBarajados.length}.`
    );
  }
  for (let i = 0; i < categorias.length; i++) {
    await insertar(
      principalesBarajados[i],
      categorias[i].id_categoria_menu,
      tipos['Plato Principal'],
      Math.round(entre(35, 75))
    );
  }

  for (const tipo of TIPOS_COMPARTIDOS) {
    const opciones = grupos.compartidos[tipo];
    if (opciones.length === 0) {
      console.warn(`  Sin preparaciones activas de tipo "${tipo}": se omite ese componente.`);
      continue;
    }
    const cantidad = tipo === 'Pan' ? Math.round(entre(90, 160)) : Math.round(entre(150, 230));
    await insertar(barajar(opciones)[0], null, tipos[tipo], cantidad);
  }
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (LIMPIAR) {
      await limpiar(client);
      await client.query('COMMIT');
      return;
    }

    const tipos = Object.fromEntries(
      (await client.query('SELECT id_tipo_componente, nombre FROM tipo_componente')).rows.map((r) => [
        r.nombre,
        r.id_tipo_componente,
      ])
    );
    const grupos = await cargarPreparacionesPorTipo(client, tipos);

    const sinTipo = OBLIGATORIOS.filter((t) => grupos.compartidos[t].length === 0);
    if (sinTipo.length > 0) {
      throw new Error(`Faltan preparaciones activas de tipo: ${sinTipo.join(', ')}. Carga el catálogo de demostración antes de simular ventas.`);
    }

    if (grupos.principales.length < 4) {
      throw new Error(
        `Se necesitan al menos 4 platos principales activos y hay ${grupos.principales.length}. ` +
        `Créalos desde el panel de administración y vuelve a ejecutar.`
      );
    }

    const categorias = (
      await client.query('SELECT id_categoria_menu, nombre FROM categoria_menu ORDER BY id_categoria_menu')
    ).rows;
    const id_sede = (
      await client.query('SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1')
    ).rows[0].id_sede;

    let menus = 0, ventas = 0, agotamientos = 0;

    for (let atras = DIAS; atras >= 1; atras--) {
      const fecha = haceDiasChile(atras);
      if (!esDiaHabil(fecha)) continue;

      let menu = (
        await client.query('SELECT id_menu FROM menu WHERE fecha = $1 AND id_sede = $2', [fecha, id_sede])
      ).rows[0];
      if (!menu) {
        menu = (
          await client.query(
            'INSERT INTO menu (id_sede, fecha, publicado) VALUES ($1, $2, TRUE) RETURNING id_menu',
            [id_sede, fecha]
          )
        ).rows[0];
        menus++;
      }
      await asegurarComponentes(client, menu.id_menu, grupos, categorias, tipos);

      const componentes = (
        await client.query(
          `SELECT mp.id_menu_preparacion, mp.cantidad_planificada
           FROM menu_preparacion mp
           WHERE mp.id_menu = $1
             AND NOT EXISTS (SELECT 1 FROM venta v WHERE v.id_menu_preparacion = mp.id_menu_preparacion AND v.origen_dato = 'simulado')`,
          [menu.id_menu]
        )
      ).rows;

      for (const comp of componentes) {
        const planificado = comp.cantidad_planificada;
        const demanda = Math.round(planificado * entre(0.7, 1.15));
        const vendidas = Math.min(demanda, planificado);
        if (vendidas === 0) continue;

        const minutos = Array.from({ length: vendidas }, minutoDeVenta).sort((a, b) => a - b);
        const tramos = new Map();
        for (const m of minutos) tramos.set(m - (m % 5), (tramos.get(m - (m % 5)) || 0) + 1);
        for (const [minuto, cantidad] of tramos) {
          await client.query(
            `INSERT INTO venta (id_menu_preparacion, cantidad, fecha_hora, origen_dato) VALUES ($1, $2, $3, 'simulado')`,
            [comp.id_menu_preparacion, cantidad, marcaTiempo(fecha, minuto)]
          );
          ventas++;
        }

        if (demanda >= planificado) {
          const avisos = [
            ['baja_disponibilidad', minutos[Math.floor(vendidas * 0.85)]],
            ['agotado', minutos[vendidas - 1]],
          ];
          for (const [estado, minuto] of avisos) {
            await client.query(
              `INSERT INTO disponibilidad (id_menu_preparacion, estado, registrado_en, observacion) VALUES ($1, $2, $3, $4)`,
              [comp.id_menu_preparacion, estado, marcaTiempo(fecha, minuto), MARCA_SIMULADO]
            );
          }
          agotamientos++;
        }
      }
    }

    await client.query('COMMIT');
    console.log(
      `Listo: ${menus} menús nuevos, ${ventas} registros de venta y ${agotamientos} agotamientos simulados.`
    );
    console.log('Para borrar lo simulado: node database/seed_ventas_simuladas.js --limpiar');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});