import { useEffect, useState } from 'react';
import './pantallaCarga.css';

export default function PantallaCarga({
  mensaje = 'Cargando…',
  compacta = false,
  forzada = false,
  saliendo = false,
  duracionMs = 1200,
  retrasoMs = compacta && !forzada ? 250 : 0,
}) {
  const [visible, setVisible] = useState(retrasoMs <= 0);

  useEffect(() => {
    if (retrasoMs <= 0) return undefined;
    const temporizador = setTimeout(() => setVisible(true), retrasoMs);
    return () => clearTimeout(temporizador);
  }, [retrasoMs]);

  if (!visible)
    return (
      <div className="pantalla-carga-espera" role="status" aria-live="polite">
        <span className="pc-sr">{mensaje}</span>
      </div>
    );

  const clases = ['pantalla-carga'];
  if (compacta) clases.push('pantalla-carga--compacta');
  if (forzada) clases.push('pantalla-carga--forzada');
  if (saliendo) clases.push('pantalla-carga--saliendo');

  return (
    <div className={clases.join(' ')} style={forzada ? { '--pc-total': `${duracionMs}ms` } : undefined} role="status" aria-live="polite">
      <div className="pc-logo" aria-hidden="true">
        <div className="pc-capa pc-casinos" />
        <div className="pc-capa pc-duoc" />
        <div className="pc-capa pc-uc" />
        <div className="pc-capa pc-gorro" />
      </div>
      <div className="pc-barra" aria-hidden="true">
        <span />
      </div>
      <span className="pc-sr">{mensaje}</span>
    </div>
  );
}
