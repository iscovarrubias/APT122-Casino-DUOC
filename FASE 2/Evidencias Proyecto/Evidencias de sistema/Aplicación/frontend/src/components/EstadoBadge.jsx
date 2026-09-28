import { ESTADO_TEXTO } from '../utils/formato';

export default function EstadoBadge({ estado }) {
  return (
    <span className={`estado-pill ${estado}`}>{ESTADO_TEXTO[estado] || estado}</span>
  );
}
