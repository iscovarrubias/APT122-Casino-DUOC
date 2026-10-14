import { useEstudiante } from '../utils/estudiante';
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
    <div className="mensaje mensaje-aviso" role="alert" style={{ marginBottom: 16 }}>
      <strong>Atención:</strong> este menú contiene {encontrados.length === 1 ? 'un alérgeno' : 'alérgenos'} que registraste en tu perfil: <strong>{encontrados.join(', ')}</strong>.
      Si tienes dudas, confirma con el personal del casino.
    </div>
  );
}