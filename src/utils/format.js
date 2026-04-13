// ══════════════════════════════════════════════
// Utilidades de formato (moneda, fechas, meses)
// ══════════════════════════════════════════════

const MONTHS = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

const MS = [
  "ene","feb","mar","abr","may","jun",
  "jul","ago","sep","oct","nov","dic",
];

/** Formatea un número como moneda EUR */
const fmt = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(n);
};

/** Formatea una fecha "YYYY-MM-DD" → "15 mar" */
const fmtDate = (d) => {
  if (!d) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [, m, day] = d.split("-");
    return `${parseInt(day)} ${MS[parseInt(m) - 1]}`;
  }
  if (/^\d{4}-\d{2}$/.test(d)) {
    const [y, m] = d.split("-");
    return `${MS[parseInt(m) - 1]} ${y}`;
  }
  return d;
};

/** Formatea month key "2026-04" → "abr 26" */
const fmtMonthShort = (mk) => {
  if (!mk) return "—";
  const [y, m] = mk.split("-");
  return `${MS[parseInt(m) - 1]} ${y.slice(2)}`;
};

/** "2026-04" → "Abril 2026" */
const formatMonthLabel = (mk) => {
  const [y, m] = mk.split("-");
  return `${MONTHS[parseInt(m) - 1]} ${y}`;
};

/** Genera un ID único */
const genId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/** Fecha de hoy en formato ISO */
const todayISO = () => new Date().toISOString().split("T")[0];

/** Extrae "YYYY-MM" de una fecha */
const monthKey = (date) => date?.slice(0, 7) || "";

/** Suma n meses a un month key */
const addMonths = (mk, n) => {
  const [y, m] = mk.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export {
  MONTHS,
  MS,
  fmt,
  fmtDate,
  fmtMonthShort,
  formatMonthLabel,
  genId,
  todayISO,
  monthKey,
  addMonths,
};
