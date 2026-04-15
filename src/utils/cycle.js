// ══════════════════════════════════════════════
// 📅 CICLO FINANCIERO PERSONALIZADO: 27 → 26
// ══════════════════════════════════════════════
// "Abril 2026" = del 27 de marzo 2026 al 26 de abril 2026

import { MS, formatMonthLabel } from "./format.js";

/** Día de inicio del ciclo (configurable en el futuro) */
const CYCLE_START_DAY = 27;

/**
 * Dado un mes clave "YYYY-MM", devuelve las fechas de inicio y fin del ciclo.
 * Ejemplo: "2026-04" → { start: "2026-03-27", end: "2026-04-26" }
 */
function getCycleDates(mk) {
  const [y, m] = mk.split("-").map(Number);
  const prevMonth = m === 1 ? 12 : m - 1;
  const prevYear = m === 1 ? y - 1 : y;
  const start = `${prevYear}-${String(prevMonth).padStart(2, "0")}-${CYCLE_START_DAY}`;
  const end = `${y}-${String(m).padStart(2, "0")}-${CYCLE_START_DAY - 1}`;
  return { start, end };
}

/**
 * Dada una fecha "YYYY-MM-DD", devuelve a qué mes financiero pertenece.
 * Si el día es >= 27, pertenece al mes SIGUIENTE.
 * Si el día es <= 26, pertenece al mes ACTUAL.
 */
function dateToFinancialMonth(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  if (d >= CYCLE_START_DAY) {
    const nextMonth = m === 12 ? 1 : m + 1;
    const nextYear = m === 12 ? y + 1 : y;
    return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
  }
  return `${y}-${String(m).padStart(2, "0")}`;
}

/**
 * Comprueba si una fecha cae dentro del ciclo de un mes financiero.
 */
function isDateInCycle(dateStr, mk) {
  if (!dateStr || !mk) return false;
  const { start, end } = getCycleDates(mk);
  return dateStr >= start && dateStr <= end;
}

/**
 * Devuelve el mes financiero actual.
 */
function todayMK() {
  const d = new Date();
  return dateToFinancialMonth(d.toISOString().split("T")[0]);
}

/**
 * Etiqueta del mes con rango del ciclo.
 * Ejemplo: "Abril 2026  (27 mar → 26 abr)"
 */
function formatMonthLabelWithCycle(mk) {
  const { start, end } = getCycleDates(mk);
  const [, sm, sd] = start.split("-");
  const [, em, ed] = end.split("-");
  return `${formatMonthLabel(mk)}  (${parseInt(sd)} ${MS[parseInt(sm) - 1]} → ${parseInt(ed)} ${MS[parseInt(em) - 1]})`;
}

/**
 * Calcula la fecha de pago de un gasto fijo recurrente dentro de un ciclo.
 * Si el día de pago cae dentro del ciclo (27 del mes anterior → 26 del mes),
 * devuelve la fecha exacta. Si no, ajusta al mes correcto.
 */
function getRecurringPaymentDate(diaPago, cycleMK) {
  const day = parseInt(diaPago);
  if (isNaN(day) || day < 1 || day > 31) return null;

  const { start, end } = getCycleDates(cycleMK);
  const [startY, startM] = start.split("-").map(Number);
  const [endY, endM] = end.split("-").map(Number);

  // El ciclo abarca dos meses: del 27 del mes anterior al 26 del mes actual
  // Si el día >= 27, cae en el primer mes del rango (mes anterior)
  // Si el día <= 26, cae en el segundo mes del rango (mes actual)
  let targetY, targetM;
  if (day >= CYCLE_START_DAY) {
    targetY = startY;
    targetM = startM;
  } else {
    targetY = endY;
    targetM = endM;
  }

  // Validar que el día existe en ese mes (ej: 31 de febrero → ajustar)
  const lastDayOfMonth = new Date(targetY, targetM, 0).getDate();
  const actualDay = Math.min(day, lastDayOfMonth);

  return `${targetY}-${String(targetM).padStart(2, "0")}-${String(actualDay).padStart(2, "0")}`;
}

export {
  CYCLE_START_DAY,
  getCycleDates,
  dateToFinancialMonth,
  isDateInCycle,
  todayMK,
  formatMonthLabelWithCycle,
  getRecurringPaymentDate,
};
