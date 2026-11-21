const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const CATEGORIAS = ['General', 'JUNAEB', 'Vegetariano', 'Hipocalórico'];
const AZUL = '#1e3a5f';
const AMARILLO = '#f5a623';
const LOGO_CID = 'logo-casinos-duoc';

const COLORES = {
  General: { fondo: '#FDECD2', texto: '#8A5300' },
  JUNAEB: { fondo: '#FBE3E3', texto: '#B01616' },
  Vegetariano: { fondo: '#E1EFD8', texto: '#33631F' },
  Hipocalórico: { fondo: '#D7EAEB', texto: '#256466' },
};

const COMPOSICION_POR_DEFECTO = {
  General: ['Ensalada', 'Sopa', 'Pan', 'Bebida', 'Postre', 'Fruta'],
  JUNAEB: ['Bebida'],
  Vegetariano: ['Ensalada', 'Sopa', 'Pan', 'Bebida', 'Postre', 'Fruta'],
  Hipocalórico: ['Ensalada', 'Sopa', 'Fruta', 'Bebida'],
};

const FILAS = [
  { etiqueta: 'Fondo', componente: 'Plato Principal' },
  { etiqueta: 'Ensalada', componente: 'Ensalada' },
  { etiqueta: 'Sopa', componente: 'Sopa' },
  { etiqueta: 'Pan', componente: 'Pan' },
  { etiqueta: 'Postre', componente: 'Postre' },
  { etiqueta: 'Fruta', componente: 'Fruta' },
  { etiqueta: 'Bebida', componente: 'Bebida' },
];

const escapar = (t) =>
  String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function partes(fecha) {
  const d = new Date(`${fecha}T12:00:00Z`);
  return { dia: DIAS[d.getUTCDay()], numero: d.getUTCDate(), mes: MESES[d.getUTCMonth()] };
}

const fechaLarga = (fecha) => {
  const p = partes(fecha);
  return `${p.dia} ${p.numero} de ${p.mes}`;
};

const titular = (t) => t.charAt(0).toUpperCase() + t.slice(1);

function rangoSemana(lunes, viernes) {
  const a = partes(lunes);
  const b = partes(viernes);
  return a.mes === b.mes ? `del ${a.numero} al ${b.numero} de ${b.mes}` : `del ${a.numero} de ${a.mes} al ${b.numero} de ${b.mes}`;
}

function agruparPorDia(filas) {
  const dias = new Map();
  for (const f of filas) {
    if (!dias.has(f.fecha)) dias.set(f.fecha, { fecha: f.fecha, componentes: [] });
    dias.get(f.fecha).componentes.push(f);
  }
  return [...dias.values()].sort((a, b) => a.fecha.localeCompare(b.fecha));
}

function tiposDeCategoria(categoria, composicion) {
  const propia = composicion?.[categoria];
  if (propia && propia.length) return new Set(propia.map((r) => r.tipo));
  return new Set(COMPOSICION_POR_DEFECTO[categoria] || []);
}

function componentesDeCategoria(componentes, categoria, composicion) {
  const especificos = componentes.filter((c) => c.categoria === categoria);
  const tipos = tiposDeCategoria(categoria, composicion);
  const compartidos = componentes.filter(
    (c) => !c.categoria && tipos.has(c.componente) && !especificos.some((e) => e.componente === c.componente)
  );
  return [...especificos, ...compartidos];
}

function grillaDelDia(dia, composicion) {
  const porCategoria = CATEGORIAS.map((cat) => ({ cat, comps: componentesDeCategoria(dia.componentes, cat, composicion) })).filter(
    ({ comps }) => comps.some((c) => c.componente === 'Plato Principal')
  );
  const filas = FILAS.map((f) => ({
    ...f,
    celdas: porCategoria.map(({ comps }) => comps.find((c) => c.componente === f.componente) || null),
  })).filter((f) => f.celdas.some(Boolean));
  return { categorias: porCategoria.map(({ cat }) => cat), filas };
}

function favoritosEn(filas, favoritos) {
  const ids = new Set((favoritos || []).map(Number));
  const vistos = new Set();
  return filas.filter((f) => {
    const clave = `${f.fecha}|${f.id_preparacion}`;
    if (!ids.has(Number(f.id_preparacion)) || vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });
}

function porPlato(favs) {
  const platos = new Map();
  for (const f of favs) {
    if (!platos.has(f.id_preparacion)) platos.set(f.id_preparacion, { nombre: f.nombre, dias: [] });
    const dia = partes(f.fecha).dia;
    if (!platos.get(f.id_preparacion).dias.includes(dia)) platos.get(f.id_preparacion).dias.push(dia);
  }
  return [...platos.values()];
}

const unirDias = (dias) => (dias.length > 1 ? `${dias.slice(0, -1).join(', ')} y ${dias[dias.length - 1]}` : dias[0]);

const saludo = (nombre) => {
  const primero = escapar(String(nombre || '').split(' ')[0]);
  return `Hola${primero ? ` ${primero}` : ''}`;
};

const etiquetaFavorito = `<span style="display:inline-block;margin-top:4px;padding:2px 8px;border-radius:999px;background:${AMARILLO};color:#1f2937;font-size:11px;font-weight:bold;line-height:16px;white-space:nowrap;">★ Tu favorito</span>`;

function etiquetaCategoria(cat) {
  const c = COLORES[cat] || COLORES.General;
  return `<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:${c.fondo};color:${c.texto};font-size:12px;font-weight:bold;">${escapar(cat)}</span>`;
}

function tablaDia(dia, ids, composicion) {
  const { categorias, filas } = grillaDelDia(dia, composicion);
  if (!categorias.length) return '';
  const ancho = Math.floor(100 / categorias.length);
  const cabecera = categorias
    .map(
      (cat) => `<th align="left" style="padding:10px 6px;border-bottom:1px solid #e5e7eb;width:${ancho}%;">${etiquetaCategoria(cat)}</th>`
    )
    .join('');
  const cuerpo = filas
    .map((f) => {
      const celdas = f.celdas
        .map((c) => {
          if (!c)
            return `<td style="padding:8px 6px;border-bottom:1px solid #f0f1f3;color:#9ca3af;font-size:13px;vertical-align:top;">—</td>`;
          const fav = ids.has(Number(c.id_preparacion));
          return `<td style="padding:8px 6px;border-bottom:1px solid #f0f1f3;font-size:13px;line-height:1.35;vertical-align:top;color:#1f2937;${
            f.componente === 'Plato Principal' ? 'font-weight:bold;' : ''
          }">${escapar(c.nombre)}${fav ? `<br>${etiquetaFavorito}` : ''}</td>`;
        })
        .join('');
      return `<tr><th align="left" scope="row" style="padding:8px 6px 8px 0;border-bottom:1px solid #f0f1f3;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#4b5563;vertical-align:top;width:70px;">${f.etiqueta}</th>${celdas}</tr>`;
    })
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
<tr><td style="width:70px;border-bottom:1px solid #e5e7eb;"></td>${cabecera}</tr>${cuerpo}</table>`;
}

function encabezadoDia(dia, opciones, conFavorito) {
  const pastilla = `<span style="display:inline-block;padding:2px 10px;border-radius:999px;background:#e8ebf0;color:#374151;font-size:12px;font-weight:normal;">${opciones} ${
    opciones === 1 ? 'opción' : 'opciones'
  }</span>`;
  const fav = conFavorito
    ? `<span style="display:inline-block;margin-right:6px;padding:2px 10px;border-radius:999px;background:${AMARILLO};color:#1f2937;font-size:12px;font-weight:bold;">Tu favorito</span>`
    : '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="font-size:15px;font-weight:bold;color:${AZUL};">${escapar(titular(fechaLarga(dia.fecha)))}</td>
<td align="right" style="white-space:nowrap;">${fav}${pastilla}<span class="flecha"></span></td></tr></table>`;
}

function seccionDia(dia, ids, composicion, abierto) {
  const opciones = grillaDelDia(dia, composicion).categorias.length;
  const conFavorito = dia.componentes.some((c) => ids.has(Number(c.id_preparacion)));
  return `<details${abierto ? ' open' : ''} style="margin:0 0 12px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
<summary style="display:block;cursor:pointer;list-style:none;padding:12px 14px;background:#f6f7f9;border-bottom:1px solid #e5e7eb;">${encabezadoDia(dia, opciones, conFavorito)}</summary>
<div style="padding:4px 12px 8px;">${tablaDia(dia, ids, composicion)}</div>
</details>`;
}

function marco({ titulo, intro, cuerpo, enlaceSitio, enlaceBaja, textoBoton = 'Ver el menú completo' }) {
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapar(titulo)}</title>
<style>summary::-webkit-details-marker{display:none}summary::marker{content:''}details .flecha::after{content:'\\25BE';display:inline-block;margin-left:8px;color:#4b5563;font-size:14px}details[open] .flecha::after{content:'\\25B4'}</style></head>
<body style="margin:0;padding:0;background:#eef0f3;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef0f3;padding:24px 8px;"><tr><td align="center">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;">
<tr><td style="background:${AZUL};padding:18px 24px;">
<img src="cid:${LOGO_CID}" width="150" height="63" alt="Casinos DUOC UC" style="display:block;border:0;outline:none;width:150px;height:auto;color:#ffffff;font-size:20px;font-weight:bold;">
</td></tr>
<tr><td style="padding:24px 24px 8px;">
<h1 style="margin:0 0 14px;font-size:21px;line-height:1.3;color:${AZUL};">${escapar(titulo)}</h1>
<div style="margin:0 0 20px;padding:14px 16px;border-radius:10px;background:#f6f7f9;font-size:15px;line-height:1.55;">${intro}</div>
${cuerpo}
<p style="margin:20px 0 16px;"><a href="${escapar(enlaceSitio)}" style="display:inline-block;background:${AZUL};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold;font-size:15px;">${escapar(textoBoton)} →</a></p>
</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #e5e7eb;background:#fafbfc;color:#6b7280;font-size:12px;line-height:1.5;">
Este es un correo automático, por favor no lo respondas.<br>
Recibes este correo porque activaste los avisos en «Mi perfil». El menú puede cambiar durante el día por motivos operativos.<br>
<a href="${escapar(enlaceBaja)}" style="color:#4b5563;">Dejar de recibir estos correos</a>
</td></tr>
</table></td></tr></table></body></html>`;
}

function textoPlano(lineas, enlaceSitio, enlaceBaja) {
  return [
    ...lineas,
    '',
    `Ver el menú: ${enlaceSitio}`,
    'Este es un correo automático, por favor no lo respondas.',
    `Dejar de recibir estos correos: ${enlaceBaja}`,
  ].join('\n');
}

function lineasDia(dia, ids, composicion) {
  const { categorias, filas } = grillaDelDia(dia, composicion);
  const lineas = [titular(fechaLarga(dia.fecha))];
  categorias.forEach((cat, i) => {
    lineas.push(`  ${cat}`);
    for (const f of filas) {
      const c = f.celdas[i];
      if (c) lineas.push(`    ${f.etiqueta}: ${c.nombre}${ids.has(Number(c.id_preparacion)) ? ' (tu favorito)' : ''}`);
    }
  });
  return lineas;
}

const listaFavoritos = (favs) =>
  porPlato(favs)
    .map((p) => `<strong>${escapar(p.nombre)}</strong> (${escapar(unirDias(p.dias))})`)
    .join(', ');

function seccionesSemana(dias, ids, composicion) {
  const algunoConFavorito = dias.some((d) => d.componentes.some((c) => ids.has(Number(c.id_preparacion))));
  return dias
    .map((d, i) => {
      const conFav = d.componentes.some((c) => ids.has(Number(c.id_preparacion)));
      return seccionDia(d, ids, composicion, algunoConFavorito ? conFav : i === 0);
    })
    .join('');
}

function correoMenuSemanal({ nombre, lunes, viernes, filas, favoritos, composicion, enlaceSitio, enlaceBaja }) {
  const dias = agruparPorDia(filas);
  const favs = favoritosEn(filas, favoritos);
  const ids = new Set((favoritos || []).map(Number));
  const rango = rangoSemana(lunes, viernes);
  const asunto = favs.length ? `Menú de la semana ${rango}: incluye tus favoritos` : `Menú de la semana ${rango}`;
  const intro = favs.length
    ? `${saludo(nombre)}, este es el menú del casino ${escapar(rango)}. Esta semana están tus favoritos: ${listaFavoritos(favs)}.`
    : `${saludo(nombre)}, este es el menú del casino ${escapar(rango)}.`;
  const lineas = [`Menú de la semana ${rango}`, ''];
  for (const d of dias) lineas.push(...lineasDia(d, ids, composicion), '');
  return {
    asunto,
    html: marco({ titulo: `Menú ${rango}`, intro, cuerpo: seccionesSemana(dias, ids, composicion), enlaceSitio, enlaceBaja }),
    texto: textoPlano(lineas, enlaceSitio, enlaceBaja),
  };
}

function correoFavoritosSemana({ nombre, lunes, viernes, filas, favoritos, composicion, enlaceSitio, enlaceBaja }) {
  const favs = favoritosEn(filas, favoritos);
  const ids = new Set((favoritos || []).map(Number));
  const rango = rangoSemana(lunes, viernes);
  const platos = porPlato(favs);
  const asunto =
    platos.length === 1 ? `Esta semana está tu favorito: ${platos[0].nombre}` : `Esta semana están ${platos.length} de tus favoritos`;
  const fechas = new Set(favs.map((f) => f.fecha));
  const dias = agruparPorDia(filas).filter((d) => fechas.has(d.fecha));
  const intro = `${saludo(nombre)}, en el menú ${escapar(rango)} aparecen platos que marcaste como favoritos: ${listaFavoritos(favs)}.`;
  const lineas = [asunto, ''];
  for (const f of favs) lineas.push(`  ${titular(fechaLarga(f.fecha))}: ${f.nombre}${f.categoria ? ` (${f.categoria})` : ''}`);
  return {
    asunto,
    html: marco({ titulo: asunto, intro, cuerpo: seccionesSemana(dias, ids, composicion), enlaceSitio, enlaceBaja }),
    texto: textoPlano(lineas, enlaceSitio, enlaceBaja),
  };
}

function correoFavoritoDelDia({ nombre, fecha, filas, favoritos, composicion, enlaceSitio, enlaceBaja }) {
  const favs = favoritosEn(filas, favoritos);
  const ids = new Set((favoritos || []).map(Number));
  const platos = porPlato(favs);
  const asunto =
    platos.length === 1 ? `Hoy hay ${platos[0].nombre}, tu favorito` : `Hoy hay ${platos.length} de tus favoritos en el casino`;
  const nombres = unirDias(platos.map((p) => `<strong>${escapar(p.nombre)}</strong>`));
  const intro = `${saludo(nombre)}, hoy ${escapar(fechaLarga(fecha))} el casino tiene ${
    platos.length === 1 ? 'un plato que marcaste como favorito' : 'platos que marcaste como favoritos'
  }: ${nombres}. Si quieres asegurarlo, revisa en la página si aún queda.`;
  const dia = agruparPorDia(filas.filter((f) => f.fecha === fecha))[0];
  const cuerpo = dia
    ? `<div style="margin:0 0 12px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
<div style="padding:12px 14px;background:#f6f7f9;border-bottom:1px solid #e5e7eb;">${encabezadoDia(dia, grillaDelDia(dia, composicion).categorias.length, true)}</div>
<div style="padding:4px 12px 8px;">${tablaDia(dia, ids, composicion)}</div></div>`
    : '';
  const lineas = [asunto, '', ...(dia ? lineasDia(dia, ids, composicion) : favs.map((f) => `  ${f.nombre}`))];
  return {
    asunto,
    html: marco({ titulo: asunto, intro, cuerpo, enlaceSitio, enlaceBaja, textoBoton: 'Ver el menú de hoy' }),
    texto: textoPlano(lineas, enlaceSitio, enlaceBaja),
  };
}

module.exports = {
  correoMenuSemanal,
  correoFavoritosSemana,
  correoFavoritoDelDia,
  favoritosEn,
  agruparPorDia,
  grillaDelDia,
  rangoSemana,
  fechaLarga,
  escapar,
  LOGO_CID,
};
