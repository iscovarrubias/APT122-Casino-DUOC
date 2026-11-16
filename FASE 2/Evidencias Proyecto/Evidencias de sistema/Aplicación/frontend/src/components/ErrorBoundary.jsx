import { Component } from 'react';
import PaginaError from './PaginaError';

export default class ErrorBoundary extends Component {
  state = { fallo: false, detalle: null };

  static getDerivedStateFromError(error) {
    return { fallo: true, detalle: error?.message || null };
  }

  componentDidCatch(error) {
    console.error(error);
  }

  render() {
    if (!this.state.fallo) return this.props.children;
    return (
      <PaginaError
        codigo={500}
        titulo="Algo salió mal"
        mensaje="Ocurrió un error inesperado en la aplicación. Recarga la página para continuar."
        detalle={this.state.detalle}
        onReintentar={() => window.location.reload()}
      />
    );
  }
}
