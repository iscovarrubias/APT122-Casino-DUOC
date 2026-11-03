import { useEffect } from 'react';
import { Check, X } from 'lucide-react';

const TIPOS = {
  ok: { titulo: 'Listo', role: 'status' },
  error: { titulo: 'Error', role: 'alert' },
  aviso: { titulo: 'Atención', role: 'status' },
  info: { titulo: 'Información', role: 'status' },
};

function Glifo({ tipo }) {
  if (tipo === 'ok') return <Check size={20} strokeWidth={3.2} aria-hidden="true" />;
  if (tipo === 'error') return <X size={20} strokeWidth={3.2} aria-hidden="true" />;
  return (
    <svg
      width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="3.4" strokeLinecap="round" aria-hidden="true"
    >
      {tipo === 'aviso' ? (
        <>
          <line x1="12" y1="5.5" x2="12" y2="13" />
          <line x1="12" y1="18.5" x2="12.01" y2="18.5" />
        </>
      ) : (
        <>
          <line x1="12" y1="11" x2="12" y2="18.5" />
          <line x1="12" y1="5.5" x2="12.01" y2="5.5" />
        </>
      )}
    </svg>
  );
}

export default function Mensaje({
  tipo = 'aviso',
  titulo,
  children,
  autoCerrar = false,
  onCerrar,
  role,
  className = '',
  style,
}) {
  useEffect(() => {
    if (!autoCerrar || !onCerrar) return undefined;
    const id = setTimeout(onCerrar, 7000);
    return () => clearTimeout(id);
  }, [autoCerrar, onCerrar, children]);

  const config = TIPOS[tipo] || TIPOS.aviso;
  const textoTitulo = titulo === undefined ? config.titulo : titulo;

  return (
    <div
      className={`mensaje mensaje-${tipo} ${className}`.trim()}
      role={role || config.role}
      style={style}
    >
      <span className="mensaje-icono" aria-hidden="true">
        <Glifo tipo={tipo} />
      </span>
      <div className="mensaje-cuerpo">
        {textoTitulo && <strong className="mensaje-titulo">{textoTitulo}</strong>}
        <div className="mensaje-texto">{children}</div>
      </div>
      {onCerrar && (
        <button
          type="button"
          className="mensaje-cerrar"
          onClick={onCerrar}
          aria-label="Cerrar mensaje"
        >
          <X size={16} strokeWidth={2.6} />
        </button>
      )}
    </div>
  );
}
