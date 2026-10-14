import DatePicker from 'react-datepicker';
import { es } from 'date-fns/locale';
import { Calendar } from 'lucide-react';

function aFecha(iso) {
  if (!iso) return null;
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d || 1);
}

function aFechaDesdeMes(mes) {
  if (!mes) return null;
  const [y, m] = String(mes).slice(0, 7).split('-').map(Number);
  return new Date(y, m - 1, 1);
}

function aISO(fecha) {
  if (!fecha) return '';
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function aMesISO(fecha) {
  if (!fecha) return '';
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export default function CampoFecha({
  value, onChange, min, max,
  modo = 'dia',
  placeholder,
  ariaLabel,
}) {
  const esMes = modo === 'mes';
  const seleccionada = esMes ? aFechaDesdeMes(value) : aFecha(value);
  const minima = esMes ? aFechaDesdeMes(min) : (min ? aFecha(min) : undefined);
  const maxima = esMes ? aFechaDesdeMes(max) : (max ? aFecha(max) : undefined);

  const props = esMes
    ? {
        showMonthYearPicker: true,
        showFullMonthYearPicker: true,
        dateFormat: 'MMMM yyyy',
        placeholderText: placeholder || 'mes y año',
      }
    : {
        dateFormat: 'dd/MM/yyyy',
        placeholderText: placeholder || 'dd/mm/aaaa',
        calendarStartDay: 1,
      };

  return (
    <div className="campo-fecha">
      <span className="campo-fecha-icono" aria-hidden="true">
        <Calendar size={16} />
      </span>
      <DatePicker
        selected={seleccionada}
        onChange={(fecha) => onChange(esMes ? aMesISO(fecha) : aISO(fecha))}
        locale={es}
        minDate={minima}
        maxDate={maxima}
        ariaLabel={ariaLabel}
        showPopperArrow={false}
        popperPlacement="bottom-start"
        className="campo-fecha-input"
        {...props}
      />
    </div>
  );
}