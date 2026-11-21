import { Clock } from 'lucide-react';
import Ayuda from './Ayuda';

export default function PrediccionAgotamiento({ categoria, estimacion }) {
  if (!estimacion || estimacion.estado === 'agotado') return null;
  const seAgota = estimacion.estado === 'se_agota';
  return (
    <Ayuda
      className={`prediccion-agotamiento ${seAgota ? 'prediccion-agotamiento--pronto' : ''}`.trim()}
      titulo={seAgota ? `Se agotaría cerca de las ${estimacion.hora}` : 'Debería alcanzar hasta el cierre'}
      etiqueta={`Hora estimada de agotamiento del menú ${categoria}`}
      icono={<Clock size={14} strokeWidth={2.4} aria-hidden="true" />}
    >
      <em className="prediccion-nota">Es una estimación y se actualiza con cada venta.</em>
    </Ayuda>
  );
}
