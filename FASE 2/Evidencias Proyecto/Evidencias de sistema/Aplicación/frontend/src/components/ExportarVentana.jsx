import { useState } from 'react';
import { X, Download } from 'lucide-react';
import Mensaje from './Mensaje';

export default function ExportarVentana({
  titulo, onCerrar, trabajando, error, onErrorCerrar,
  modos, modo, onModo, selector, resumen, extras,
  excelNota, imagenes, imagenElegida, onElegirImagen, onDescargar,
}) {
  const [formato, setFormato] = useState('excel');
  const ocupado = !!trabajando;
  return (
    <div className="modal-fondo" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="modal modal-form exv">
        <div className="modal-form-cabeza">
          <h2>{titulo}</h2>
          <button type="button" className="prep-icono" onClick={onCerrar} disabled={ocupado} title="Cerrar" aria-label="Cerrar"><X size={20} /></button>
        </div>

        <div className="modal-form-cuerpo exv-cuerpo">
          <section className="exv-bloque">
            <span className="exv-rotulo">Período</span>
            <div className="exv-pildoras" role="group" aria-label="Período">
              {modos.map((m) => (
                <button key={m.id} type="button" className={modo === m.id ? 'activo' : ''} onClick={() => onModo(m.id)}>{m.texto}</button>
              ))}
            </div>
            <div className="exv-selector">{selector}</div>
            <p className="exv-resumen">{resumen}</p>
            {extras}
          </section>

          <section className="exv-bloque">
            <span className="exv-rotulo">Formato</span>
            <div className="exv-pildoras" role="group" aria-label="Formato">
              <button type="button" className={formato === 'excel' ? 'activo' : ''} onClick={() => setFormato('excel')}>Excel</button>
              <button type="button" className={formato === 'imagen' ? 'activo' : ''} onClick={() => setFormato('imagen')}>Imagen (PNG)</button>
            </div>
            {formato === 'excel' ? (
              <p className="exv-nota">{excelNota}</p>
            ) : (
              <div className="exv-lista" role="radiogroup" aria-label="Imagen a descargar">
                {Object.entries(imagenes).map(([clave, { etiqueta, ayuda, Icono }]) => (
                  <label key={clave} className={imagenElegida === clave ? 'activa' : ''}>
                    <input type="radio" name="exv-imagen" checked={imagenElegida === clave} onChange={() => onElegirImagen(clave)} />
                    <Icono size={18} aria-hidden="true" />
                    <span><strong>{etiqueta}</strong><small>{ayuda}</small></span>
                  </label>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="modal-form-pie">
          {error && <Mensaje tipo="error" onCerrar={onErrorCerrar}>{error}</Mensaje>}
          <div className="modal-acciones">
            <button type="button" className="boton boton-secundario" onClick={onCerrar} disabled={ocupado}>Cancelar</button>
            <button type="button" className="boton boton-primario exv-descargar" disabled={ocupado} onClick={() => onDescargar(formato)}>
              <Download size={16} aria-hidden="true" />
              {ocupado ? 'Generando…' : formato === 'excel' ? 'Descargar Excel' : 'Descargar imagen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
