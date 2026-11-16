import PaginaError from './PaginaError';

export default function NoEncontrada({ rutaInicio = '/' }) {
  return <PaginaError codigo={404} rutaInicio={rutaInicio} />;
}
