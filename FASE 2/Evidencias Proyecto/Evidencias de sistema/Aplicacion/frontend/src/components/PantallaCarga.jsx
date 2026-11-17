import './pantallaCarga.css';

export default function PantallaCarga({
  mensaje = 'Cargando…',
  compacta = false,
  forzada = false,
  saliendo = false,
  duracionMs = 1200,
}) {
  const clases = ['pantalla-carga'];
  if (compacta) clases.push('pantalla-carga--compacta');
  if (forzada) clases.push('pantalla-carga--forzada');
  if (saliendo) clases.push('pantalla-carga--saliendo');

  return (
    <div
      className={clases.join(' ')}
      style={forzada ? { '--pc-total': `${duracionMs}ms` } : undefined}
      role="status"
      aria-live="polite"
    >
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
