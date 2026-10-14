import { useEffect } from 'react';
import { AlertCircle, XCircle, CheckCircle } from 'lucide-react';

export default function Mensaje({ tipo = 'aviso', children, autoCerrar = false, onCerrar }) {
  useEffect(() => {
    if (!autoCerrar || !onCerrar) return;
    const id = setTimeout(onCerrar, 7000);
    return () => clearTimeout(id);
  }, [autoCerrar, onCerrar, children]);

  const Icono = tipo === 'error' ? XCircle : tipo === 'ok' ? CheckCircle : AlertCircle;

  return (
    <div className={`mensaje mensaje-${tipo} mensaje-con-icono`} role={tipo === 'error' ? 'alert' : 'status'}>
      <Icono className="mensaje-icono" size={20} strokeWidth={2.2} aria-hidden="true" />
      <div className="mensaje-texto">{children}</div>
      {onCerrar && !autoCerrar && (
        <button
          type="button"
          className="mensaje-cerrar"
          onClick={onCerrar}
          aria-label="Cerrar mensaje"
        >
          <XCircle size={16} />
        </button>
      )}
    </div>
  );
}