export default function Cargando({ children = 'Cargando…' }) {
  return (
    <div className="cargando" role="status" aria-live="polite">
      <span className="cargando-giro" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
