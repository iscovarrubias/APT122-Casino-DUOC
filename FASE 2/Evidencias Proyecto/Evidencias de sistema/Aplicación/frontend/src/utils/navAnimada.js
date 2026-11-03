import { useLayoutEffect, useRef, useState } from 'react';

export function useNavAnimada(actual, cambiar, cantidad) {
  const [destino, setDestino] = useState(null);
  const activa = destino && destino.desde === actual ? destino.clave : actual;
  const itemsRef = useRef({});
  const indicadorRef = useRef(null);
  const yaPosicionado = useRef(false);

  useLayoutEffect(() => {
    const item = itemsRef.current[activa];
    const ind = indicadorRef.current;
    if (!item || !ind) return;
    ind.style.transition = yaPosicionado.current ? '' : 'none';
    ind.style.height = `${item.offsetHeight}px`;
    ind.style.transform = `translateY(${item.offsetTop}px)`;
    ind.style.opacity = '1';
    yaPosicionado.current = true;
  }, [activa, cantidad]);

  const ir = (nueva) => {
    if (nueva === activa) return;
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const pagina = document.querySelector('.pagina');
    if (reducido || !pagina) { cambiar(nueva); return; }
    setDestino({ clave: nueva, desde: actual });
    pagina.classList.add('saliendo');
    setTimeout(() => cambiar(nueva), 150);
  };

  const ref = (clave) => (el) => { itemsRef.current[clave] = el; };
  return { activa, ir, ref, indicadorRef };
}
