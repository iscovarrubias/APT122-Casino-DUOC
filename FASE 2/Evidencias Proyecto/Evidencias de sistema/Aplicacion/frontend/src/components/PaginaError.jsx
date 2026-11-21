import { House, LogIn, Utensils, CookingPot, GlassWater, Pizza } from 'lucide-react';
import { navegar } from '../ruteo/useRuta';
import { infoError } from '../utils/errores';
import './paginaError.css';

export default function PaginaError({
  codigo,
  titulo,
  mensaje,
  compacta = false,
  onReintentar,
  onVolver,
  rutaInicio = '/',
  textoInicio = 'Ir al Menú Principal',
  embebido = false,
  sinAcciones = false,
  sinTitulo = false,
}) {
  const info = infoError(codigo);
  const es404 = info.codigo === 404;
  const grave = info.tipo !== 'cliente';
  const reintentar = onReintentar || (() => window.location.reload());
  const Raiz = compacta ? 'section' : 'main';

  const textoFinal = {
    titulo: es404 ? '¡Ups! Parece que este plato no está en el menú.' : titulo || info.titulo,
    mensaje: es404
      ? 'La página que buscas ha desaparecido, o tal vez el chef la ha quitado por hoy. Pero no te preocupes, tenemos otros platos esperando por ti.'
      : mensaje || info.mensaje,
  };

  const botonInicio = (primario) => (
    <button
      type="button"
      className={`pe-boton ${primario ? 'pe-boton-primario' : 'pe-boton-secundario'}`}
      onClick={() => {
        onVolver?.();
        navegar(rutaInicio);
      }}
    >
      {primario ? <Utensils size={18} /> : <House size={18} />}
      {primario ? 'Ir al Menú Principal' : textoInicio}
    </button>
  );

  const botonReintentar = (primario) => (
    <button type="button" className={`pe-boton ${primario ? 'pe-boton-primario' : 'pe-boton-secundario'}`} onClick={reintentar}>
      Reintentar
    </button>
  );

  let acciones;
  if (info.accion === 'login') {
    acciones = (
      <>
        <button type="button" className="pe-boton pe-boton-primario" onClick={() => navegar('/login')}>
          <LogIn size={18} /> Iniciar sesión
        </button>
        {botonInicio(false)}
      </>
    );
  } else if (info.reintentar) {
    acciones = (
      <>
        {botonReintentar(true)}
        {botonInicio(false)}
      </>
    );
  } else {
    acciones = botonInicio(true);
  }

  const clases = ['pagina-error', compacta && 'pagina-error--compacta', embebido && 'pagina-error--embebido'].filter(Boolean).join(' ');

  return (
    <Raiz className={clases} role={grave ? 'alert' : 'status'}>
      {!compacta && (
        <>
          <CookingPot className="pe-fondo-decoracion top-left" size={80} strokeWidth={1} />
          <GlassWater className="pe-fondo-decoracion top-right" size={100} strokeWidth={1} />
          <Pizza className="pe-fondo-decoracion bottom-left" size={90} strokeWidth={1} />
          <Utensils className="pe-fondo-decoracion bottom-right" size={80} strokeWidth={1} />
        </>
      )}

      <div className="pe-contenido">
        <div className="pe-icono-superior pe-exclamacion">!</div>

        {!sinTitulo && (
          <>
            <div className="pe-codigo-grande">{info.codigo ? `Error ${info.codigo}` : 'Error'}</div>
            <h1 className="pe-titulo">{textoFinal.titulo}</h1>
          </>
        )}

        <p className="pe-mensaje">{textoFinal.mensaje}</p>

        {!sinAcciones && <div className="pe-acciones">{acciones}</div>}
      </div>
    </Raiz>
  );
}
