import PanelSidebar from './PanelSidebar';
import Ayuda from './Ayuda';

export default function PanelLayout({ ruta, titulo, descripcion, ayuda, accionesTitulo, children }) {
  return (
    <div className="app-layout">
      <a href="#contenido-principal" className="saltar" onClick={(e) => { e.preventDefault(); document.getElementById('contenido-principal')?.focus(); }}>Saltar al contenido</a>
      <PanelSidebar ruta={ruta} />

      <main className="main panel-principal" id="contenido-principal" tabIndex={-1}>
        <div className="panel-contenido">
          <div className="panel-titulo-fila">
            <h1 className="panel-titulo">{titulo}{ayuda && <Ayuda titulo={titulo}>{ayuda}</Ayuda>}</h1>
            {accionesTitulo && <div className="panel-titulo-acciones">{accionesTitulo}</div>}
          </div>
          {descripcion && <p className="panel-descripcion">{descripcion}</p>}
          {children}
        </div>
      </main>
    </div>
  );
}
