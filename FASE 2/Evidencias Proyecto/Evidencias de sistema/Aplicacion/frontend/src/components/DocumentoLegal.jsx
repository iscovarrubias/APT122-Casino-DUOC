import { ExternalLink, ShieldCheck, FileText } from 'lucide-react';
import { navegar } from '../ruteo/useRuta';
import { ACTUALIZACION_LEGAL, URL_PRIVACIDAD_DUOC, URL_REPOSITORIO } from '../utils/legal';

function Seccion({ id, titulo, children }) {
  return (
    <section className="legal-seccion" aria-labelledby={`legal-${id}`}>
      <h2 id={`legal-${id}`}>{titulo}</h2>
      {children}
    </section>
  );
}

function EnlaceExterno({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="legal-enlace">
      {children} <ExternalLink size={13} aria-hidden="true" />
      <span className="sr-only"> (se abre en una pestaña nueva)</span>
    </a>
  );
}

function EnlaceInterno({ ruta, children }) {
  return (
    <button type="button" className="legal-enlace legal-enlace--boton" onClick={() => navegar(ruta)}>
      {children}
    </button>
  );
}

function Terminos() {
  return (
    <>
      <Seccion id="t1" titulo="1. Aceptación y alcance">
        <p>
          Estos términos regulan el uso de Casinos DUOC UC, la plataforma para consultar el menú del casino de la sede Valparaíso y apoyar su gestión.
          Al usarla, aceptas estas condiciones. Si no estás de acuerdo, puedes seguir informándote del menú directamente en el casino.
        </p>
      </Seccion>

      <Seccion id="t2" titulo="2. Qué ofrece la plataforma">
        <ul>
          <li>Consultar el menú del día y de la semana, sin necesidad de crear una cuenta.</li>
          <li>Ver la información nutricional y los alérgenos declarados de cada preparación.</li>
          <li>Saber en tiempo real si un plato está disponible, por agotarse o agotado.</li>
          <li>Con tu cuenta institucional: guardar alergias, favoritos y una categoría preferida, y calificar los platos.</li>
          <li>Para el personal del casino: planificar el menú, registrar ventas, controlar la jornada y revisar estadísticas.</li>
        </ul>
      </Seccion>

      <Seccion id="t3" titulo="3. Información del menú">
        <p>
          El menú es informativo y puede cambiar durante el día por motivos operativos, como la falta de un ingrediente. La disponibilidad se actualiza
          con cada venta, pero puede haber un breve desfase con lo que ocurre en el mostrador. Los precios vigentes son los que informa el casino.
        </p>
      </Seccion>

      <Seccion id="t4" titulo="4. Alérgenos e información nutricional">
        <p>
          Los alérgenos se declaran por preparación según un catálogo fijo (gluten, lácteos, huevo, pescado, mariscos, frutos secos, maní y soya).
          Cuando un dato nutricional aparece como «No disponible», significa que el casino aún no lo ha confirmado.
        </p>
        <p className="legal-destacado">
          Esta información es referencial y no reemplaza la consulta con el personal del casino. Si tienes una alergia o una condición de salud,
          confirma con el personal antes de consumir un plato.
        </p>
      </Seccion>

      <Seccion id="t5" titulo="5. Cuentas y acceso">
        <p>
          Los estudiantes ingresan con su cuenta institucional de Duoc UC a través de Microsoft. El personal del casino usa las credenciales que le
          asigna la administración. Las cuentas son personales: no compartas tu acceso y avisa al casino si detectas un uso indebido.
        </p>
      </Seccion>

      <Seccion id="t6" titulo="6. Opiniones y calificaciones">
        <p>
          Tus calificaciones y comentarios son públicos para otros estudiantes, que verán tu nombre, la inicial de tu apellido, las estrellas y el
          comentario. Te pedimos opinar con respeto y sobre la comida o el servicio. No se permiten insultos, contenido discriminatorio, datos de
          otras personas ni publicidad.
        </p>
        <p>
          El casino puede revisar y ocultar opiniones que no cumplan estas reglas. Puedes editar o eliminar tus opiniones cuando quieras. La{' '}
          <EnlaceInterno ruta="/privacidad">Política de Privacidad</EnlaceInterno> explica qué ocurre con ellas después.
        </p>
      </Seccion>

      <Seccion id="t7" titulo="7. Uso adecuado">
        <p>
          No está permitido intentar entrar a secciones sin el permiso correspondiente, vulnerar la seguridad del sistema, sobrecargarlo con
          solicitudes automatizadas ni usar la plataforma con fines distintos a los descritos.
        </p>
      </Seccion>

      <Seccion id="t8" titulo="8. Disponibilidad del servicio">
        <p>
          Hacemos lo posible para que la plataforma esté siempre disponible, pero puede tener interrupciones por mantención o fallas de los
          proveedores. Si la página tarda en abrir después de un rato sin uso, espera unos segundos mientras el servidor se inicia.
        </p>
      </Seccion>

      <Seccion id="t9" titulo="9. Carácter académico y propiedad intelectual">
        <p>
          Casinos DUOC UC es un Proyecto APT (Capstone) de Ingeniería en Informática de Duoc UC, sede Valparaíso, y se entrega sin garantías de
          servicio. El nombre, el logotipo y las marcas de Duoc UC pertenecen a Duoc UC y se usan en este contexto académico. El código de la
          plataforma es obra del equipo de desarrollo.
        </p>
      </Seccion>

      <Seccion id="t10" titulo="10. Cambios y legislación aplicable">
        <p>
          Si estos términos cambian, publicaremos la nueva versión en esta página con su fecha de actualización. Se rigen por las leyes de la
          República de Chile.
        </p>
      </Seccion>
    </>
  );
}

function Privacidad() {
  return (
    <>
      <Seccion id="p1" titulo="1. Quiénes somos y alcance">
        <p>
          Casinos DUOC UC es un Proyecto APT (Capstone) de Ingeniería en Informática de Duoc UC, sede Valparaíso, desarrollado para el casino de la
          sede. Esta política explica qué datos trata la plataforma, para qué y cómo puedes controlarlos.
        </p>
        <p>
          Tu cuenta institucional se rige además por la{' '}
          <EnlaceExterno href={URL_PRIVACIDAD_DUOC}>Política de Privacidad de Duoc UC</EnlaceExterno>, que esta política complementa y no
          reemplaza.
        </p>
      </Seccion>

      <Seccion id="p2" titulo="2. Marco legal">
        <p>
          Tratamos los datos conforme a la Ley N° 19.628 sobre protección de la vida privada, y diseñamos la plataforma según la Ley N° 21.719, que
          la reforma y crea la Agencia de Protección de Datos Personales. Seguimos sus principios de licitud y lealtad, finalidad, proporcionalidad,
          calidad, responsabilidad, seguridad, transparencia y confidencialidad.
        </p>
      </Seccion>

      <Seccion id="p3" titulo="3. Qué datos tratamos">
        <ul>
          <li>
            <strong>Si solo consultas el menú:</strong> no te pedimos datos personales y no usamos cookies publicitarias ni herramientas de
            analítica o seguimiento.
          </li>
          <li>
            <strong>Si inicias sesión con tu cuenta Duoc UC:</strong> tu nombre y tu correo institucional, que entrega Microsoft. No recibimos ni
            guardamos tu contraseña institucional.
          </li>
          <li>
            <strong>Lo que tú decides agregar:</strong> alergias, categoría de menú preferida, favoritos, calificaciones y comentarios.
          </li>
          <li>
            <strong>Personal del casino:</strong> nombre, correo, rol, sede y una contraseña que se guarda cifrada.
          </li>
        </ul>
      </Seccion>

      <Seccion id="p4" titulo="4. Alergias: un dato sensible">
        <p className="legal-destacado">
          Las alergias son datos relativos a la salud, que la ley considera sensibles. Por eso son voluntarias, se usan solo para avisarte cuando un
          plato contiene un alérgeno que marcaste, no se comparten con nadie y puedes quitarlas cuando quieras desde «Mi perfil».
        </p>
      </Seccion>

      <Seccion id="p5" titulo="5. Para qué usamos los datos">
        <ul>
          <li>Mostrarte el menú con tus favoritos, tu categoría preferida y los avisos de alérgenos.</li>
          <li>Publicar tus calificaciones y comentarios, y calcular el promedio de cada plato.</li>
          <li>Que el casino mejore su oferta con estadísticas agregadas: ventas, platos agotados y promedios de opinión.</li>
          <li>Administrar las cuentas y proteger la plataforma.</li>
        </ul>
        <p>
          No vendemos datos, no los usamos para publicidad y no tomamos decisiones automatizadas que te afecten. Las predicciones de demanda del
          casino usan ventas agregadas, no datos de personas.
        </p>
      </Seccion>

      <Seccion id="p6" titulo="6. Quién puede ver tus datos">
        <ul>
          <li>
            <strong>Otros estudiantes:</strong> ven tu nombre, la inicial de tu apellido, tu calificación y tu comentario. Nunca ven tu correo ni
            tus alergias.
          </li>
          <li>
            <strong>Personal autorizado del casino</strong> (administración y nutricionista): ve el nombre y el correo asociados a opiniones y
            favoritos, para moderar y analizar.
          </li>
          <li>
            <strong>Proveedores tecnológicos:</strong> Microsoft para el inicio de sesión institucional y servicios de alojamiento en la nube para la
            aplicación y la base de datos, cuyos servidores pueden estar fuera de Chile. Solo se usan para que la plataforma funcione.
          </li>
          <li>
            <strong>Autoridades:</strong> solo cuando la ley o un tribunal lo exijan.
          </li>
        </ul>
        <p>
          Cuando editas o eliminas una opinión, deja de mostrarse y de contar en el promedio, pero el casino conserva la versión anterior para
          moderar contenido inapropiado. Puedes pedir que se elimine de forma definitiva.
        </p>
      </Seccion>

      <Seccion id="p7" titulo="7. Lo que guardamos en tu navegador">
        <div className="tabla-scroll">
          <table className="tabla tabla-compacta legal-tabla">
            <thead><tr><th>Nombre</th><th>Para qué sirve</th><th>Cuánto dura</th></tr></thead>
            <tbody>
              <tr><td><code>casino_sesion</code></td><td>Mantener tu sesión iniciada</td><td>Hasta que cierras sesión o vence</td></tr>
              <tr><td><code>casino_tema</code></td><td>Recordar el modo claro u oscuro</td><td>Hasta que lo borres</td></tr>
              <tr><td><code>casino_splash_visto</code></td><td>No repetir la pantalla de carga</td><td>Hasta cerrar la pestaña</td></tr>
              <tr><td><code>casino_login_error</code></td><td>Mostrarte un aviso si el inicio de sesión no se completó</td><td>Hasta que ves el aviso</td></tr>
            </tbody>
          </table>
        </div>
        <p>No usamos cookies de terceros.</p>
      </Seccion>

      <Seccion id="p8" titulo="8. Cómo protegemos los datos">
        <ul>
          <li>Conexión cifrada (HTTPS) entre tu dispositivo y la plataforma.</li>
          <li>Contraseñas del personal guardadas con cifrado irreversible (bcrypt).</li>
          <li>Sesiones con token firmado y fecha de vencimiento.</li>
          <li>Permisos por rol: cada persona ve solo lo que necesita para su trabajo.</li>
          <li>Límite de intentos fallidos de inicio de sesión.</li>
          <li>Pruebas automáticas de seguridad que se ejecutan en cada cambio del sistema.</li>
        </ul>
      </Seccion>

      <Seccion id="p9" titulo="9. Cuánto tiempo conservamos los datos">
        <p>
          Mientras tengas una cuenta o mientras sean necesarios para las finalidades descritas. Las estadísticas del casino se conservan de forma
          agregada, sin identificar a las personas. Puedes pedir la eliminación de tus datos en cualquier momento.
        </p>
      </Seccion>

      <Seccion id="p10" titulo="10. Tus derechos">
        <p>Tienes derecho de acceso, rectificación, supresión, oposición, portabilidad y bloqueo de tus datos.</p>
        <ul>
          <li>
            <strong>Desde la plataforma:</strong> en «Mi perfil» puedes ver y cambiar tus alergias y tu categoría preferida, y quitar favoritos y
            calificaciones cuando quieras.
          </li>
          <li>
            <strong>Para lo demás:</strong> mientras la plataforma sea un proyecto académico, escribe al equipo de desarrollo a través del{' '}
            <EnlaceExterno href={URL_REPOSITORIO}>repositorio del proyecto</EnlaceExterno>, indicando qué necesitas. Si Duoc UC adopta la
            plataforma de forma oficial, las solicitudes se canalizarán por el canal que indica su política de privacidad.
          </li>
          <li>
            <strong>Reclamos:</strong> una vez que la Agencia de Protección de Datos Personales esté en funciones, podrás acudir a ella si
            consideras que tus derechos no fueron respetados.
          </li>
        </ul>
      </Seccion>

      <Seccion id="p11" titulo="11. Cambios a esta política">
        <p>
          Si esta política cambia, publicaremos la nueva versión en esta página con su fecha de actualización. Si el cambio afecta cómo usamos
          tus datos, te lo avisaremos en la plataforma.
        </p>
      </Seccion>
    </>
  );
}

export default function DocumentoLegal({ tipo }) {
  const esPrivacidad = tipo === 'privacidad';
  return (
    <article className="legal">
      <div className="segmentado legal-pestanas" role="group" aria-label="Documento legal">
        <button type="button" className={!esPrivacidad ? 'activo' : ''} aria-pressed={!esPrivacidad} onClick={() => navegar('/terminos')}>
          <FileText size={14} aria-hidden="true" /> Términos
        </button>
        <button type="button" className={esPrivacidad ? 'activo' : ''} aria-pressed={esPrivacidad} onClick={() => navegar('/privacidad')}>
          <ShieldCheck size={14} aria-hidden="true" /> Privacidad
        </button>
      </div>

      <p className="legal-fecha">Última actualización: {ACTUALIZACION_LEGAL}</p>

      <div className="legal-resumen">
        {esPrivacidad
          ? 'En corto: para ver el menú no necesitas dar ningún dato. Si inicias sesión, usamos tu nombre y correo institucional, y lo que tú decidas agregar. No vendemos datos ni los usamos para publicidad.'
          : 'En corto: la plataforma te informa del menú del casino. La información de alérgenos es referencial, tus opiniones son públicas y deben ser respetuosas, y tu cuenta es personal.'}
      </div>

      {esPrivacidad ? <Privacidad /> : <Terminos />}

      <div className="legal-pie">
        <button type="button" className="boton boton-secundario" onClick={() => navegar('/')}>Volver al menú</button>
      </div>
    </article>
  );
}
