import { formatearHora } from '../utils/formato';

const etiqueta = (c) => (c.componente === 'Plato Principal' ? c.categoria : c.componente);

function estadoDe(c) {
  if (c.restante <= 0) {
    const hora = c.disponibilidad === 'agotado' && c.disponibilidad_actualizada_en
      ? ` a las ${formatearHora(c.disponibilidad_actualizada_en)}`
      : '';
    const exceso = c.restante < 0 ? ` (${-c.restante} sobre lo registrado)` : '';
    const origen = c.corregido && !hora ? ' (sin hora, por corrección manual)' : '';
    return { texto: `Se agotó${hora}${origen}${exceso}`, clase: 'agotado' };
  }
  const unidades = c.restante === 1 ? 'unidad' : 'unidades';
  const corregido = c.corregido ? ' (corregido tras el cierre)' : '';
  return {
    texto: `Quedaron ${c.restante} ${unidades}${corregido}`,
    clase: c.disponibilidad === 'baja_disponibilidad' ? 'baja' : 'disponible',
  };
}

function Bloque({ titulo, lista }) {
  if (!lista.length) return null;
  return (
    <section className="resumen-cierre-bloque">
      <h3>{titulo}</h3>
      <ul>
        {lista.map((c) => {
          const e = estadoDe(c);
          return (
            <li key={c.id_menu_preparacion} className={`resumen-cierre-${e.clase}`}>
              <span><strong>{etiqueta(c)}</strong>: {c.preparacion}</span>
              <span>{e.texto}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function ResumenCierre({ componentes }) {
  const platos = componentes.filter((c) => c.componente === 'Plato Principal');
  const acompanamientos = componentes.filter((c) => c.componente !== 'Plato Principal');
  return (
    <div className="resumen-cierre">
      <Bloque titulo="Platos" lista={platos} />
      <Bloque titulo="Acompañamientos" lista={acompanamientos} />
    </div>
  );
}
