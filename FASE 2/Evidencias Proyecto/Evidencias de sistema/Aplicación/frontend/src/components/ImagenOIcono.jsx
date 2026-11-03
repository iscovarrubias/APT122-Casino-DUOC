import { useState } from 'react';
import { Utensils, Salad, CakeSlice, CupSoda } from 'lucide-react';

const ICONOS_COMPONENTE = {
  'Plato Principal': Utensils,
  Entrada: Salad,
  Postre: CakeSlice,
  Bebida: CupSoda,
};

function IconoComponente({ tipo, tamano = 40 }) {
  const Icono = ICONOS_COMPONENTE[tipo] || Utensils;
  return <Icono size={tamano} strokeWidth={1.3} />;
}

export default function ImagenOIcono({ url, tipo, tamano = 40, className = 'card-foto' }) {
  const [fallo, setFallo] = useState(false);

  if (url && !fallo) {
    return (
      <img
        src={url}
        alt=""
        className={className}
        loading="lazy"
        onError={() => setFallo(true)}
      />
    );
  }
  return <IconoComponente tipo={tipo} tamano={tamano} />;
}
