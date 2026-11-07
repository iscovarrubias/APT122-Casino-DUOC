import { useCallback, useEffect, useRef, useState } from 'react';
import { ConfirmacionContext } from './confirmacion-context';

export default function ConfirmacionProvider({ children }) {
  const [pedido, setPedido] = useState(null);
  const resolver = useRef(null);
  const cancelarRef = useRef(null);

  const confirmar = useCallback((opciones) => new Promise((resolve) => {
    resolver.current = resolve;
    setPedido(typeof opciones === 'string' ? { mensaje: opciones } : opciones);
  }), []);

  const cerrar = useCallback((respuesta) => {
    resolver.current?.(respuesta);
    resolver.current = null;
    setPedido(null);
  }, []);

  useEffect(() => {
    if (!pedido) return undefined;
    cancelarRef.current?.focus();
    const tecla = (e) => { if (e.key === 'Escape') cerrar(false); };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [pedido, cerrar]);

  return (
    <ConfirmacionContext.Provider value={confirmar}>
      {children}
      {pedido && (
        <div className="modal-fondo v2" role="alertdialog" aria-modal="true"
          aria-labelledby="confirmacion-titulo" aria-describedby="confirmacion-mensaje" onClick={() => cerrar(false)}>
          <div className="modal modal-confirmacion" onClick={(e) => e.stopPropagation()}>
            <h2 id="confirmacion-titulo">{pedido.titulo || 'Confirmar'}</h2>
            <p id="confirmacion-mensaje" className="texto-suave">{pedido.mensaje}</p>
            <div className="modal-acciones">
              <button ref={cancelarRef} type="button" className="boton boton-secundario" onClick={() => cerrar(false)}>
                {pedido.textoCancelar || 'Cancelar'}
              </button>
              <button type="button" className={`boton ${pedido.peligro ? 'boton-peligro' : 'boton-primario'}`} onClick={() => cerrar(true)}>
                {pedido.textoConfirmar || 'Aceptar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmacionContext.Provider>
  );
}
