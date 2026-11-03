import { useEstudiante } from '../utils/estudiante';
import Mensaje from './Mensaje';
export default function AvisoAlergias({ componentes }) {
  const { alergias } = useEstudiante();
  if (!alergias || alergias.length === 0) return null;

  const encontrados = [];
  for (const c of componentes || []) {
    for (const a of c.alergenos || []) {
      if (alergias.includes(a) && !encontrados.includes(a)) encontrados.push(a);
    }
  }
  if (encontrados.length === 0) return null;

  return (
    <Mensaje tipo="aviso" role="alert" titulo="Este menú contiene alérgenos de tu perfil" style={{ marginBottom: 16 }}>
      Contiene {encontrados.length === 1 ? 'un alérgeno' : 'alérgenos'} que registraste: <strong>{encontrados.join(', ')}</strong>.
      Si tienes dudas, confirma con el personal del casino.
    </Mensaje>
  );
}