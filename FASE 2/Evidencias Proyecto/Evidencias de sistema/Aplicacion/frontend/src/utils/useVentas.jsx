import { useState, useRef } from 'react';
import { registrarVenta } from '../api/gestion';
import { resolverOpcionVenta } from './opciones';
import ModalOpcion from '../components/ModalOpcion';

export const ETIQUETA_VENTA = { solo_plato: 'Solo plato', completo_maquina: 'Completo + bebida de máquina' };

export function useVentas({ estado, cargar, setError, setAviso }) {
  const [modalOpcion, setModalOpcion] = useState(null);
  const ultimoToque = useRef(0);

  async function ejecutar(categoria, opcion, tipo) {
    try {
      await registrarVenta(categoria, opcion, tipo);
      const extra = ETIQUETA_VENTA[tipo];
      setAviso(`${categoria}${opcion ? ` - ${opcion}` : ''}${extra ? ` - ${extra}` : ''} registrado`);
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function iniciar(categoria, tipo) {
    if (tipo === 'solo_plato') {
      await ejecutar(categoria, null, tipo);
      return;
    }
    const resolucion = resolverOpcionVenta(estado?.composicion?.[categoria] || [], estado?.componentes || []);
    if (resolucion?.opciones) {
      setModalOpcion({ categoria, opciones: resolucion.opciones, tipo });
      return;
    }
    await ejecutar(categoria, resolucion?.opcion || null, tipo);
  }

  const antirrebote = () => {
    if (Date.now() - ultimoToque.current < 400) return false;
    ultimoToque.current = Date.now();
    setError(null);
    return true;
  };

  async function vender(categoria, tipo = 'combo') {
    if (!antirrebote()) return;
    if (categoria === 'JUNAEB' && tipo !== 'combo') return;
    await iniciar(categoria, tipo);
  }

  async function elegirOpcion(opcion) {
    const { categoria, tipo } = modalOpcion;
    setModalOpcion(null);
    await ejecutar(categoria, opcion, tipo);
  }

  const modales = (
    <>
      {modalOpcion && (
        <ModalOpcion
          categoria={modalOpcion.categoria}
          opciones={modalOpcion.opciones}
          componentes={estado?.componentes || []}
          onElegir={elegirOpcion}
          onCancelar={() => setModalOpcion(null)}
        />
      )}
    </>
  );

  return { vender, modales };
}
