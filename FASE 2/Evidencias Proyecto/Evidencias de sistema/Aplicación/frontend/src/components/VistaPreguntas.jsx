const SECCIONES = [
  {
    titulo: 'Información nutricional',
    preguntas: [
      {
        q: '¿Por qué algunos platos indican "No disponible" en su información nutricional?',
        a: 'Porque esa información aún no ha sido registrada por el casino. El sistema prioriza la transparencia: si un dato no está confirmado, se muestra como "No disponible" en lugar de entregar un valor que podría ser incorrecto.',
      },
      {
        q: '¿Cómo se calculan las calorías totales de un combo?',
        a: 'Se suman las calorías de cada componente del combo (entrada, plato principal, postre y bebida). Si alguno de ellos no cuenta con información nutricional registrada, el total también se muestra como "No disponible", para evitar entregar un dato parcial que pueda inducir a error.',
      },
    ],
  },
  {
    titulo: 'Alérgenos',
    preguntas: [
      {
        q: '¿Cómo puedo saber si un plato contiene un alérgeno que me afecta?',
        a: 'Cada preparación muestra sus alérgenos declarados junto a la información nutricional. Estos provienen de un catálogo fijo (gluten, lácteos, huevo, pescado, mariscos, frutos secos, maní y soya), lo que garantiza que la información sea consistente y verificable. Si tienes dudas sobre algún ingrediente o la preparación de un plato, consulta directamente con el personal del casino.',
      },
      {
        q: '¿Qué significa que un plato no muestre alérgenos?',
        a: 'Significa que no contiene ninguno de los alérgenos del catálogo declarado. Si tienes una alergia que no está en esa lista, te recomendamos confirmar directamente con el personal del casino antes de consumir el plato. Ante cualquier duda o detalle específico, el personal del casino puede entregarte más información.',
      },
    ],
  },
  {
    titulo: 'Menú y disponibilidad',
    preguntas: [
      {
        q: '¿El menú puede cambiar durante el día?',
        a: 'Sí. La planificación puede ajustarse por motivos operativos (por ejemplo, falta de un ingrediente), y el estado de disponibilidad de cada plato se actualiza en tiempo real por el personal del casino.',
      },
      {
        q: '¿Cada cuánto se actualiza la información de esta página?',
        a: 'La información se actualiza automáticamente cada 30 segundos, por lo que no necesitas recargar la página para ver los cambios de disponibilidad.',
      },
    ],
  },
];

export default function VistaPreguntas() {
  return (
    <div className="preguntas-lista">
      {SECCIONES.map((seccion) => (
        <section key={seccion.titulo} className="preguntas-seccion">
          <h2>{seccion.titulo}</h2>
          {seccion.preguntas.map((p) => (
            <details key={p.q} className="pregunta-item">
              <summary>{p.q}</summary>
              <p>{p.a}</p>
            </details>
          ))}
        </section>
      ))}
    </div>
  );
}
