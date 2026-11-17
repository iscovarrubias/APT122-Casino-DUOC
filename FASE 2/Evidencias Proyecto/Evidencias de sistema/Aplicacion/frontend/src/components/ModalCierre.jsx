import ResumenCierre from './ResumenCierre';

export default function ModalCierre({ componentes, ocupado, onConfirmar, onCancelar }) {
  return (
    <div className="modal-fondo v2" role="alertdialog" aria-modal="true" aria-labelledby="modal-cierre-titulo">
      <div className="modal modal-cierre">
        <h2 id="modal-cierre-titulo">Cerrar jornada</h2>
        <p className="texto-suave">
          Así quedó el día según el sistema. Al cerrar no se podrán registrar más ventas hasta que reabras la jornada.
        </p>
        <ResumenCierre componentes={componentes} />
        <div className="modal-acciones">
          <button type="button" className="boton boton-secundario" onClick={onCancelar} disabled={ocupado}>
            Seguir en la jornada
          </button>
          <button type="button" className="boton boton-peligro" onClick={onConfirmar} disabled={ocupado}>
            {ocupado ? 'Cerrando…' : 'Cerrar jornada'}
          </button>
        </div>
      </div>
    </div>
  );
}
