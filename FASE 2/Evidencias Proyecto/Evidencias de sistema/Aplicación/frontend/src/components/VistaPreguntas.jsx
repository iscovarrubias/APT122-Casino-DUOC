const SECCIONES = [
  {
    titulo: 'Información nutricional',
    preguntas: [
      {
        q: '¿Por qué algunos platos dicen "No disponible" en vez de mostrar las calorías?',
        a: 'Porque esa información todavía no fue validada por el casino o la nutricionista. El sistema nunca muestra un dato nutricional inventado: si no está confirmado, prefiere decir "No disponible" antes que arriesgarse a mostrar algo incorrecto.',
      },
      {
        q: '¿Cómo se calculan las calorías totales de un combo?',
        a: 'Sumando las calorías de cada componente (entrada, plato principal, postre y bebida). Si a cualquiera de ellos le falta la validación nutricional, el total también se muestra como "No disponible", en vez de un número parcial que podría confundir.',
      },
    ],
  },
  {
    titulo: 'Alérgenos',
    preguntas: [
      {
        q: '¿Cómo sé si un plato tiene un alérgeno que me afecta?',
        a: 'Cada preparación muestra sus alérgenos declarados justo debajo de la información nutricional, tomados de un catálogo fijo (gluten, lácteos, frutos secos, mariscos, huevo y soya), no de texto libre.',
      },
      {
        q: '¿Qué pasa si un plato no muestra ningún alérgeno?',
        a: 'Significa que no tiene ninguno de los alérgenos del catálogo declarado. Si tienes una alergia que no está en esa lista, te recomendamos confirmar directamente con el personal del casino.',
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
        q: '¿Cada cuánto se actualiza esta página?',
        a: 'La consulta se actualiza sola cada 30 segundos, así que no necesitas recargar la página a mano para ver los cambios de disponibilidad.',
      },
      {
        q: '¿Por qué la entrada, el postre y la bebida son iguales en todas las categorías?',
        a: 'Porque el casino los planifica una sola vez para todo el día: solo el plato principal cambia según la categoría (Principal, JUNAEB, Vegetariano, Hipocalórico).',
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
