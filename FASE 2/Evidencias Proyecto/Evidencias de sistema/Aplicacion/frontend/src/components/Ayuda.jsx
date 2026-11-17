import { useEffect, useRef, useState } from 'react';

export default function Ayuda({ titulo, children, className = '' }) {
  const [abierta, setAbierta] = useState(false);
  const raiz = useRef(null);

  useEffect(() => {
    if (!abierta) return undefined;
    const fuera = (e) => { if (raiz.current && !raiz.current.contains(e.target)) setAbierta(false); };
    const tecla = (e) => { if (e.key === 'Escape') setAbierta(false); };
    document.addEventListener('pointerdown', fuera);
    document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('pointerdown', fuera); document.removeEventListener('keydown', tecla); };
  }, [abierta]);

  return (
    <span
      className={`ayuda ${className}`.trim()}
      ref={raiz}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') setAbierta(true); }}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') setAbierta(false); }}
    >
      <button
        type="button"
        className="ayuda-boton"
        aria-label={`¿Qué significa? ${titulo}`}
        aria-expanded={abierta}
        onClick={(e) => setAbierta((v) => (e.nativeEvent.pointerType === 'mouse' ? true : !v))}
        onFocus={() => setAbierta(true)}
        onBlur={(e) => { if (!raiz.current?.contains(e.relatedTarget)) setAbierta(false); }}
      >
        !
      </button>
      {abierta && (
        <span className="ayuda-globo" role="tooltip">
          <strong>{titulo}</strong>
          <span>{children}</span>
        </span>
      )}
    </span>
  );
}
