import './modalOpcion.css';

export default function ModalOpcion({ categoria, opciones, componentes, onElegir, onCancelar }) {
  const mapComp = new Map((componentes || []).map((c) => [c.componente, c]));

  return (
    <div
      className="modal-fondo v2"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="modal-opcion-titulo"
    >
      <div className="modal modal-opcion">
        <h2 id="modal-opcion-titulo">Vendiendo {categoria}</h2>
        <p className="texto-suave" style={{ margin: '4px 0 16px' }}>
          ¿Qué eligió el estudiante?
        </p>

        <div className="opcion-botones">
          {opciones.map((tipo) => {
            const comp = mapComp.get(tipo);
            return (
              <button
                key={tipo}
                type="button"
                className="opcion-boton"
                onClick={() => onElegir(tipo)}
                autoFocus={tipo === opciones[0]}
              >
                <strong>{tipo}</strong>
                {comp?.preparacion && <span>{comp.preparacion}</span>}
              </button>
            );
          })}
        </div>

        <div className="modal-acciones">
          <button type="button" className="boton boton-secundario" onClick={onCancelar}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
