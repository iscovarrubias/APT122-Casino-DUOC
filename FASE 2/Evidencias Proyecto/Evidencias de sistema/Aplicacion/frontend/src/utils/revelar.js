import { useEffect } from 'react';

const SELECTOR = '.plan-card, .tarjeta, .kpi, .card-principal, .card-incluye, .semanal-card, .prep-columna, .v2-subtitulo';

export function useRevelarAlBajar() {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

    const visto = (el) => { el.classList.add('rev-visto'); };
    const io = new IntersectionObserver((entradas) => {
      for (const e of entradas) {
        if (e.isIntersecting) { visto(e.target); io.unobserve(e.target); }
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    const preparar = (el) => {
      if (el.dataset.rev) return;
      el.dataset.rev = '1';
      const caja = el.getBoundingClientRect();
      if (caja.top < window.innerHeight * 0.92) return;
      const hermanos = el.parentElement ? [...el.parentElement.children].filter((h) => h.matches(SELECTOR)) : [];
      el.style.setProperty('--rev-i', String(Math.min(Math.max(hermanos.indexOf(el), 0), 5)));
      el.classList.add('rev');
      io.observe(el);
    };

    const barrer = (raiz) => {
      if (raiz.nodeType !== 1) return;
      if (raiz.matches?.(SELECTOR)) preparar(raiz);
      raiz.querySelectorAll?.(SELECTOR).forEach(preparar);
    };

    barrer(document.body);
    const mo = new MutationObserver((cambios) => { for (const c of cambios) c.addedNodes.forEach(barrer); });
    mo.observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
    return () => { mo.disconnect(); io.disconnect(); };
  }, []);
}
