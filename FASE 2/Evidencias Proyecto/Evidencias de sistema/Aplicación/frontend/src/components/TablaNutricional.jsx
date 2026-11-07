export default function TablaNutricional({ info }) {
  if (!info) {
    return <p className="no-disponible-texto">Información nutricional no disponible todavía.</p>;
  }

  const filas = [
    ['Calorías', info.calorias, 'kcal', 0],
    ['Proteínas', info.proteinas_g, 'g', 1],
    ['Carbohidratos', info.carbohidratos_g, 'g', 1],
    ['Grasas', info.grasas_g, 'g', 1],
  ];

  return (
    <table className="tabla-nutricional">
      <thead>
        <tr><th>Nutriente</th><th>Cantidad</th></tr>
      </thead>
      <tbody>
        {filas.map(([nombre, valor, unidad, decimales = 1]) => (
          <tr key={nombre}>
            <td>{nombre}</td>
            <td>{valor != null ? `${Number(valor).toFixed(decimales)} ${unidad}` : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
