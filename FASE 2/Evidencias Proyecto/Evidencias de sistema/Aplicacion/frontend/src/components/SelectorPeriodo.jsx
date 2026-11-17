import CampoFecha from './CampoFecha';
import { atajos, ultimoDiaMes } from '../utils/periodos';

export default function SelectorPeriodo({ desde, hasta, onCambio, accion, lado }) {
  const lista = atajos();
  const esMes = desde.slice(8) === '01' && hasta === ultimoDiaMes(desde.slice(0, 7)) ? desde.slice(0, 7) : '';
  return (
    <div className="selector-periodo">
      <div className="sp-fila">
        <div className="exv-pildoras" role="group" aria-label="Período">
          {lista.map((a) => (
            <button key={a.id} type="button" className={a.desde === desde && a.hasta === hasta ? 'activo' : ''} onClick={() => onCambio(a.desde, a.hasta)}>{a.texto}</button>
          ))}
        </div>
        {accion}
      </div>
      <div className="sp-fila sp-fechas">
        <div className="sp-campos">
          <label className="campo campo-en-linea"><span>Desde</span>
            <CampoFecha value={desde} max={hasta} onChange={(v) => v && onCambio(v, hasta)} ariaLabel="Fecha desde" /></label>
          <label className="campo campo-en-linea"><span>Hasta</span>
            <CampoFecha value={hasta} min={desde} onChange={(v) => v && onCambio(desde, v)} ariaLabel="Fecha hasta" /></label>
          <label className="campo campo-en-linea"><span>o un mes</span>
            <CampoFecha modo="mes" value={esMes} onChange={(v) => v && onCambio(`${v}-01`, ultimoDiaMes(v))} ariaLabel="Elegir un mes completo" /></label>
        </div>
        {lado}
      </div>
    </div>
  );
}
