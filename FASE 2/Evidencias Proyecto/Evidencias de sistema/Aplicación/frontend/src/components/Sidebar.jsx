export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
         Casinos <span className="brand-accent">DuocUC</span>
      </div>

      <div className="sidebar-greeting">
        <h2>Hola, Estudiante</h2>
        <p>Sede Valparaíso</p>
      </div>

      <nav className="sidebar-nav">
        <button className="sidebar-nav-item active">Diario</button>
        <button className="sidebar-nav-item" disabled title="Próximamente">Semanal</button>
        <button className="sidebar-nav-item" disabled title="Próximamente">Preguntas</button>
      </nav>

      <div className="sidebar-bottom">
        <button className="sidebar-link" disabled title="Requiere cuenta DUOC Microsoft">Configuración</button>
        <button className="sidebar-link" disabled title="Requiere cuenta DUOC Microsoft">Cuenta y perfil</button>
        <button className="sidebar-logout" disabled title="La consulta de menú no requiere sesión">Cerrar sesión</button>
      </div>
    </aside>
  );
}
