const FACTOR_CENSURA = 1.15;
const PASO = 5;
const r1 = (n) => Math.round(n * 10) / 10;
const redondearA5 = (n) => Math.ceil(Math.round(n * 1e6) / 1e6 / 5) * 5;
const demandaAjustada = (o) => (o.agoto ? o.vendidas * FACTOR_CENSURA : o.vendidas);

function diaSemana(fecha) {
  const d = new Date(`${fecha}T12:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

function ponderada(valores) {
  let pesos = 0;
  let suma = 0;
  valores.forEach((v, i) => { pesos += i + 1; suma += (i + 1) * v; });
  return suma / pesos;
}

function desviacion(valores) {
  if (valores.length < 2) return 0;
  const m = valores.reduce((a, b) => a + b, 0) / valores.length;
  return Math.sqrt(valores.reduce((a, v) => a + (v - m) ** 2, 0) / (valores.length - 1));
}

function estimarDemanda(observaciones, fecha, { ventana = 4, minimo = 2 } = {}) {
  const previas = observaciones.filter((o) => o.fecha < fecha);
  let base = 'mismo_dia';
  let muestra = previas.filter((o) => o.dow === diaSemana(fecha)).slice(-ventana);
  if (muestra.length < minimo) { muestra = previas.slice(-ventana * 2); base = 'general'; }
  if (muestra.length < minimo) return null;

  const valores = muestra.map(demandaAjustada);
  const media = ponderada(valores);
  const sd = desviacion(valores);
  return {
    base, n: muestra.length, censuradas: muestra.filter((o) => o.agoto).length,
    media: r1(media), desviacion: r1(sd),
    sugerido: redondearA5(media + 0.5 * sd),
    minimo: Math.max(0, Math.floor(media - sd)), maximo: Math.ceil(media + sd),
  };
}

function resumirDemanda(s) {
  return {
    dias: s.n, dias_sin_agotar: s.sinCensura,
    mae_modelo: s.sinCensura ? r1(s.errModelo / s.sinCensura) : null,
    mae_base: s.sinCensura ? r1(s.errBase / s.sinCensura) : null,
    mejora_pct: s.sinCensura && s.errBase > 0 ? Math.round((1 - s.errModelo / s.errBase) * 100) : null,
    cobertura_sugerencia: s.n ? Math.round((100 * s.cubreSug) / s.n) : null,
    cobertura_planificado: s.n ? Math.round((100 * s.cubrePlan) / s.n) : null,
    sobrante_sugerencia: s.sinCensura ? r1(s.sobraSug / s.sinCensura) : null,
    sobrante_planificado: s.sinCensura ? r1(s.sobraPlan / s.sinCensura) : null,
  };
}
const sumasDemandaVacias = () => ({ n: 0, sinCensura: 0, errModelo: 0, errBase: 0, cubreSug: 0, cubrePlan: 0, sobraSug: 0, sobraPlan: 0 });

function backtestDemanda(observaciones, { minHistoria = 4, ventana = 4 } = {}) {
  const s = sumasDemandaVacias();
  for (let i = minHistoria; i < observaciones.length; i++) {
    const previas = observaciones.slice(0, i);
    const real = observaciones[i];
    const est = estimarDemanda(previas, real.fecha, { ventana });
    if (!est) continue;
    s.n++;
    if (real.agoto ? est.sugerido > real.vendidas : est.sugerido >= real.vendidas) s.cubreSug++;
    if (!real.agoto) s.cubrePlan++;
    if (!real.agoto) {
      const base = previas.map(demandaAjustada).reduce((a, b) => a + b, 0) / previas.length;
      s.sinCensura++;
      s.errModelo += Math.abs(est.media - real.vendidas);
      s.errBase += Math.abs(base - real.vendidas);
      s.sobraSug += Math.max(est.sugerido - real.vendidas, 0);
      s.sobraPlan += Math.max((real.planificado ?? real.vendidas) - real.vendidas, 0);
    }
  }
  return { ...resumirDemanda(s), sumas: s };
}

function construirCurva(dias, { paso = PASO } = {}) {
  const conVentas = dias.filter((d) => d.bins && d.bins.length);
  if (conVentas.length < 2) return null;
  const acum = new Map();
  conVentas.forEach((d) => d.bins.forEach((b) => acum.set(b.bin, (acum.get(b.bin) || 0) + b.unidades)));
  return [...acum.entries()].sort((a, b) => a[0] - b[0]).map(([bin, total]) => ({ bin, unidades: total / conVentas.length, paso }));
}

const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(Math.floor(min % 60)).padStart(2, '0')}`;
const acotar = (x, a, b) => Math.min(b, Math.max(a, x));

function estimarAgotamiento({ curva, restante, vendidasHoy, ahora, cierre, paso = PASO }) {
  if (restante <= 0) return { estado: 'agotado' };
  if (!curva || !curva.length) return null;
  const porBin = new Map(curva.map((c) => [c.bin, c.unidades]));
  const esperadoHoy = (() => {
    let s = 0;
    for (let b = curva[0].bin; b < ahora; b += paso) s += (porBin.get(b) || 0) * (Math.min(b + paso, ahora) - b) / paso;
    return s;
  })();
  const escala = esperadoHoy > 0 && vendidasHoy > 0 ? acotar(vendidasHoy / esperadoHoy, 0.5, 2) : 1;

  let acum = 0;
  for (let b = Math.floor(ahora / paso) * paso; b < cierre; b += paso) {
    const ini = Math.max(b, ahora);
    const fin = Math.min(b + paso, cierre);
    const unidades = (porBin.get(b) || 0) * escala * ((fin - ini) / paso);
    if (unidades > 0 && acum + unidades >= restante - 1e-9) {
      const minuto = Math.round(ini + ((restante - acum) / unidades) * (fin - ini));
      return { agotaria: true, minuto, hora: hhmm(minuto), minutos_restantes: Math.max(0, minuto - ahora), escala: Math.round(escala * 100) / 100 };
    }
    acum += unidades;
  }
  return { agotaria: false, esperado_restante: r1(acum), escala: Math.round(escala * 100) / 100 };
}

function resumirAgotamiento(s) {
  return {
    dias: s.n, sin_estimacion: s.n - s.nModelo,
    mae_modelo_min: s.nModelo ? r1(s.errModelo / s.nModelo) : null,
    mae_simple_min: s.nSimple ? r1(s.errSimple / s.nSimple) : null,
    dentro_15_min_pct: s.n ? Math.round((100 * s.dentro15) / s.n) : null,
  };
}
const sumasAgotamientoVacias = () => ({ n: 0, nModelo: 0, nSimple: 0, errModelo: 0, errSimple: 0, dentro15: 0 });

function backtestAgotamiento(dias, { minHistoria = 4, cierre = 960, paso = PASO } = {}) {
  const s = sumasAgotamientoVacias();
  for (let i = minHistoria; i < dias.length; i++) {
    const d = dias[i];
    if (d.hora_agotado == null || !d.bins || !d.bins.length) continue;
    const curva = construirCurva(dias.slice(0, i), { paso });
    if (!curva) continue;
    const bins = [...d.bins].sort((a, b) => a.bin - b.bin);
    let vendidas = 0;
    let ahora = null;
    for (const b of bins) {
      vendidas += b.unidades;
      if (vendidas >= d.planificado * 0.5) { ahora = b.bin + paso; break; }
    }
    const restante = d.planificado - vendidas;
    if (ahora == null || restante <= 0) continue;
    s.n++;
    const pred = estimarAgotamiento({ curva, restante, vendidasHoy: vendidas, ahora, cierre, paso });
    if (pred && pred.agotaria) {
      const e = Math.abs(pred.minuto - d.hora_agotado);
      s.nModelo++; s.errModelo += e;
      if (e <= 15) s.dentro15++;
    }
    const ritmo = vendidas / Math.max(ahora - bins[0].bin, 1);
    s.nSimple++; s.errSimple += Math.abs(ahora + restante / ritmo - d.hora_agotado);
  }
  return { ...resumirAgotamiento(s), sumas: s };
}

function combinarDemanda(lista) {
  const t = sumasDemandaVacias();
  lista.forEach((x) => Object.keys(t).forEach((k) => { t[k] += x.sumas[k]; }));
  return resumirDemanda(t);
}
function combinarAgotamiento(lista) {
  const t = sumasAgotamientoVacias();
  lista.forEach((x) => Object.keys(t).forEach((k) => { t[k] += x.sumas[k]; }));
  return resumirAgotamiento(t);
}

module.exports = {
  diaSemana, estimarDemanda, backtestDemanda, construirCurva, estimarAgotamiento,
  backtestAgotamiento, combinarDemanda, combinarAgotamiento, FACTOR_CENSURA, PASO,
};
