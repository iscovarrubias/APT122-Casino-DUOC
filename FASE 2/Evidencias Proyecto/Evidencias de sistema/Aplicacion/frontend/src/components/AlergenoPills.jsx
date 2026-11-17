export default function AlergenoPills({ alergenos }) {
  if (!alergenos || alergenos.length === 0) {
    return <p className="no-disponible-texto">No cuenta con alérgenos declarados.</p>;
  }
  return (
    <div className="alergenos-pills">
      {alergenos.map((a) => (
        <span key={a} className="pill-alergeno">{a}</span>
      ))}
    </div>
  );
}
