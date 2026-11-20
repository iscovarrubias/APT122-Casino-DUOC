import { describe, it, expect, vi, afterEach } from 'vitest';
import { sumarDias, lunesDe, ultimoDiaMes, sumarMeses, nombreMes, fechaLarga, fechaCorta, etiquetaRango, atajos } from './periodos';

describe('periodos: cálculo de fechas para análisis y planificación', () => {
  afterEach(() => vi.useRealTimers());

  it('suma y resta días cruzando meses y años', () => {
    expect(sumarDias('2026-11-30', 1)).toBe('2026-12-01');
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28');
    expect(sumarDias('2028-03-01', -1)).toBe('2028-02-29');
  });

  it('encuentra el lunes de la semana, incluso desde un domingo', () => {
    expect(lunesDe('2026-11-20')).toBe('2026-11-16');
    expect(lunesDe('2026-11-16')).toBe('2026-11-16');
    expect(lunesDe('2026-11-22')).toBe('2026-11-16');
  });

  it('conoce el último día de cada mes, con años bisiestos', () => {
    expect(ultimoDiaMes('2026-02')).toBe('2026-02-28');
    expect(ultimoDiaMes('2028-02')).toBe('2028-02-29');
    expect(ultimoDiaMes('2026-04')).toBe('2026-04-30');
    expect(ultimoDiaMes('2026-12')).toBe('2026-12-31');
  });

  it('suma meses cruzando años', () => {
    expect(sumarMeses('2026-12', 1)).toBe('2027-01');
    expect(sumarMeses('2026-01', -1)).toBe('2025-12');
  });

  it('escribe las fechas en español', () => {
    expect(nombreMes('2026-11')).toBe('Noviembre de 2026');
    expect(fechaLarga('2026-11-05')).toBe('5 de noviembre de 2026');
    expect(fechaCorta('2026-11-05')).toBe('05/11/2026');
  });

  it('nombra los rangos de forma natural', () => {
    expect(etiquetaRango('2026-11-01', '2026-11-30')).toBe('Noviembre de 2026');
    expect(etiquetaRango('2026-11-20', '2026-11-20')).toBe('20 de noviembre de 2026');
    expect(etiquetaRango('2026-11-16', '2026-11-21')).toBe('16 de noviembre de 2026 al 21 de noviembre de 2026');
  });

  it('los atajos parten de la fecha de hoy en Chile', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-20T15:00:00Z'));
    const [semana, mes, mesAnt, treinta] = atajos();
    expect(semana).toMatchObject({ desde: '2026-11-16', hasta: '2026-11-21' });
    expect(mes).toMatchObject({ desde: '2026-11-01', hasta: '2026-11-30' });
    expect(mesAnt).toMatchObject({ desde: '2026-10-01', hasta: '2026-10-31' });
    expect(treinta).toMatchObject({ desde: '2026-10-22', hasta: '2026-11-20' });
  });
});
