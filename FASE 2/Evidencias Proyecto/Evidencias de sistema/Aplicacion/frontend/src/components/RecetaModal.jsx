import ModalFormulario from './ModalFormulario';
import AlergenoPills from './AlergenoPills';
import TablaNutricional from './TablaNutricional';

const formatoGramos = (g) => (g == null ? 'Sin cantidad' : `${Number(g).toLocaleString('es-CL')} g`);

export default function RecetaModal({ preparacion, puedeCrearVariacion, onCrearVariacion, onCerrar }) {
  const ingredientes = preparacion.ingredientes_detalle || [];
  const nutricion = preparacion.nutricion && preparacion.nutricion.calorias != null ? preparacion.nutricion : null;

  function enviar(evento) {
    evento.preventDefault();
    onCrearVariacion(preparacion);
  }

  return (
    <ModalFormulario
      titulo={preparacion.nombre}
      etiqueta={`Receta de ${preparacion.nombre}`}
      onSubmit={enviar}
      onCancelar={onCerrar}
      textoCancelar="Cerrar"
      textoGuardar="Crear variación"
      mostrarGuardar={puedeCrearVariacion}
      cuerpoDesplazable
    >
      <div className="receta-modal">
        <div className="receta-etiquetas">
          <span>{preparacion.tipo || 'Plato Principal'}</span>
          {preparacion.base_nombre && <span>Variación de {preparacion.base_nombre}</span>}
          {!preparacion.activa && <span>Desactivada</span>}
        </div>

        {preparacion.descripcion && <p className="texto-suave">{preparacion.descripcion}</p>}

        <section className="form-card">
          <h3>
            Ingredientes
            {preparacion.porciones_receta ? (
              <span className="texto-suave"> (receta para {preparacion.porciones_receta} porciones)</span>
            ) : null}
          </h3>
          {ingredientes.length === 0 ? (
            <p className="texto-suave">Esta preparación no tiene ingredientes registrados.</p>
          ) : (
            <table className="tabla-nutricional receta-tabla">
              <thead>
                <tr>
                  <th>Ingrediente</th>
                  <th>Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {ingredientes.map((i) => (
                  <tr key={i.id_ingrediente}>
                    <td>{i.nombre}</td>
                    <td>{formatoGramos(i.cantidad_g)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="form-card">
          <h3>Alérgenos</h3>
          <AlergenoPills alergenos={preparacion.alergenos} />
        </section>

        <section className="form-card">
          <h3>
            Información nutricional <span className="texto-suave">(por porción)</span>
          </h3>
          <TablaNutricional info={nutricion} />
        </section>

        {puedeCrearVariacion && (
          <p className="texto-suave">
            Si este día el plato se prepara distinto, crea una variación: queda como una preparación aparte con sus propios ingredientes y
            alérgenos, y la receta original no cambia.
          </p>
        )}
      </div>
    </ModalFormulario>
  );
}
