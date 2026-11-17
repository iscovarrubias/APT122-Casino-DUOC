import { X } from 'lucide-react';
import Mensaje from './Mensaje';

export default function ModalFormulario({
  titulo,
  etiqueta,
  ancho = 'ancho',
  onSubmit,
  onCancelar,
  guardando = false,
  textoGuardar = 'Guardar',
  error = null,
  onCerrarError,
  children,
}) {
  return (
    <div className="modal-fondo" role="dialog" aria-modal="true" aria-label={etiqueta || titulo}>
      <form className={`modal modal-form modal-form--${ancho}`} onSubmit={onSubmit}>
        <div className="modal-form-cabeza">
          <h2>{titulo}</h2>
          <button
            type="button"
            className="prep-icono"
            onClick={onCancelar}
            disabled={guardando}
            title="Cerrar"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-form-cuerpo">{children}</div>

        <div className="modal-form-pie">
          {error && <Mensaje tipo="error" onCerrar={onCerrarError}>{error}</Mensaje>}
          <div className="modal-acciones">
            <button type="button" className="boton boton-secundario" onClick={onCancelar} disabled={guardando}>
              Cancelar
            </button>
            <button type="submit" className="boton boton-primario" disabled={guardando}>
              {guardando ? 'Guardando…' : textoGuardar}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
