import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { fallo: false };

  static getDerivedStateFromError() {
    return { fallo: true };
  }

  componentDidCatch(error) {
    console.error(error);
  }

  render() {
    if (!this.state.fallo) return this.props.children;
    return (
      <main className="no-encontrada" role="alert">
        <h1>Algo salió mal</h1>
        <p>Ocurrió un error inesperado. Recarga la página para continuar.</p>
        <button type="button" className="boton boton-primario" onClick={() => window.location.reload()}>Recargar</button>
      </main>
    );
  }
}
