export default function TablaNutricional({ info }) {
  if (!info) {
    return <p className="no-disponible-texto">Información nutricional no disponible todavía.</p>;
  }

  const filas = [
    ['Calorías', info.calorias, 'kcal'],
    ['Proteínas', info.proteinas_g, 'g'],
    ['Carbohidratos', info.carbohidratos_g, 'g'],
    ['Grasas', info.grasas_g, 'g'],
  ];

  return (
    <table className="tabla-nutricional">
      <thead>
        <tr><th>Nutriente</th><th>Cantidad</th></tr>
      </thead>
      <tbody>
        {filas.map(([nombre, valor, unidad]) => (
          <tr key={nombre}>
            <td>{nombre}</td>
            <td>{valor != null ? `${valor}${unidad}` : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
