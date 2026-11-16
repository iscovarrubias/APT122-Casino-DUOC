import { useState, useEffect, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, ZoomIn } from 'lucide-react';

const LADO_MAXIMO = 1600;

function cargarImagen(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', () => reject(new Error('No se pudo leer la imagen.')));
    img.src = src;
  });
}

async function recortar(src, area) {
  const img = await cargarImagen(src);
  const escala = Math.min(1, LADO_MAXIMO / Math.max(area.width, area.height));
  const ancho = Math.round(area.width * escala);
  const alto = Math.round(area.height * escala);
  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, ancho, alto);
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo recortar.'))), 'image/jpeg', 0.9);
  });
}

export default function RecortarImagen({ archivo, aspecto = 16 / 9, onConfirmar, onCancelar }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    const url = URL.createObjectURL(archivo);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  const [recorte, setRecorte] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixeles, setAreaPixeles] = useState(null);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState(null);

  const alCompletar = useCallback((_, pixels) => setAreaPixeles(pixels), []);

  async function confirmar() {
    if (!areaPixeles) return;
    setTrabajando(true);
    setError(null);
    try {
      const blob = await recortar(src, areaPixeles);
      onConfirmar(new File([blob], 'foto.jpg', { type: 'image/jpeg' }));
    } catch (err) {
      setError(err.message || 'No se pudo recortar la imagen.');
      setTrabajando(false);
    }
  }

  return (
    <div className="modal-fondo modal-fondo--encima" role="dialog" aria-modal="true" aria-label="Ajustar la foto">
      <div className="modal modal-recorte">
        <div className="modal-form-cabeza">
          <h2>Ajustar la foto</h2>
          <button type="button" className="prep-icono" onClick={onCancelar} disabled={trabajando} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <p className="recorte-ayuda">
          Mueve la foto y usa el zoom para encuadrar cómo se verá en el menú.
        </p>

        <div className="recorte-area">
          <Cropper
            image={src}
            crop={recorte}
            zoom={zoom}
            aspect={aspecto}
            showGrid
            onCropChange={setRecorte}
            onZoomChange={setZoom}
            onCropComplete={alCompletar}
          />
        </div>

        <div className="recorte-zoom">
          <ZoomIn size={18} aria-hidden="true" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Zoom de la foto"
          />
        </div>

        {error && <p className="recorte-error">{error}</p>}

        <div className="modal-form-pie">
          <div className="modal-acciones">
            <button type="button" className="boton boton-secundario" onClick={onCancelar} disabled={trabajando}>
              Cancelar
            </button>
            <button type="button" className="boton boton-primario" onClick={confirmar} disabled={trabajando || !areaPixeles}>
              {trabajando ? 'Recortando…' : 'Usar esta foto'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}