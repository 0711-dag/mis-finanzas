// ══════════════════════════════════════════════
// 🔒 Validación y sanitización de datos
// ══════════════════════════════════════════════
import {
  normalizeCategoryLabel,
  resolveLegacyStringToId,
  buildDefaultCategories,
  buildCategoryLabel,
  DEFAULT_IDS,
} from "./utils/categoryDefaults.js";
import { genId, monthKey, addMonths } from "./utils/format.js";

// Límites para evitar abuso de la base de datos
const LIMITS = {
  MAX_TEXT_LENGTH: 100,
  MAX_DEBTS: 50,
  MAX_PAYMENTS: 500,
  MAX_FIXED_EXPENSES: 30,
  MAX_INCOMES: 100,
  MAX_VARIABLE_EXPENSES: 500,
  MAX_BUDGETS: 200,
  MAX_SAVINGS_GOALS: 20,
  MAX_SAVINGS_DEPOSITS: 500,
  MAX_DEBT_PAYMENTS: 500,
  MAX_CUSTOM_CATEGORIES: 50,
  MAX_AMOUNT: 99_999_999,
  MAX_CUOTAS: 360,
};

const DEBT_TYPES = ["tarjeta", "cuotas", "prestamo"];
const INCOME_TYPES = ["fijo", "variable"];
const GOAL_TYPES = ["emergencia", "personalizada"];

// Compatibilidad: sigue aceptado en validateCustomCategory
const CATEGORY_TYPES = ["fixed", "variable", "any"];

// Clasificación contable admitida
const TIPO_GASTO_VALUES = ["CF", "CV", "Discrecional"];

// 🆕 Versión del esquema. Si data.schemaVersion < SCHEMA_VERSION,
// se aplica migración v1 → v2 una sola vez.
const SCHEMA_VERSION = 2;

function sanitizeText(text, maxLen = LIMITS.MAX_TEXT_LENGTH) {
  if (typeof text !== "string") return "";
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/[<>"'`]/g, "")
    .trim()
    .slice(0, maxLen);
}

function sanitizeAmount(value) {
  const num = parseFloat(value);
  if (isNaN(num) || num < 0) return 0;
  if (num > LIMITS.MAX_AMOUNT) return LIMITS.MAX_AMOUNT;
  return Math.round(num * 100) / 100;
}

function sanitizeInteger(value, max = LIMITS.MAX_CUOTAS) {
  const num = parseInt(value, 10);
  if (isNaN(num) || num < 0) return 0;
  if (num > max) return max;
  return num;
}

// Sanea fechas: si no es una "YYYY-MM-DD" válida, devuelve "" (nunca undefined).
// Firebase Realtime Database rechaza objetos con propiedades undefined,
// por lo que es CRÍTICO no dejar estos campos sin valor explícito.
function sanitizeDateString(value) {
  if (typeof value !== "string") return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return value;
}

function isValidDate(dateStr) {
  if (typeof dateStr !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

function isValidMonth(monthStr) {
  if (typeof monthStr !== "string") return false;
  return /^\d{4}-\d{2}$/.test(monthStr);
}

function canAddMore(section, currentData) {
  const limits = {
    debts: LIMITS.MAX_DEBTS,
    payments: LIMITS.MAX_PAYMENTS,
    fixedExpenses: LIMITS.MAX_FIXED_EXPENSES,
    incomes: LIMITS.MAX_INCOMES,
    variableExpenses: LIMITS.MAX_VARIABLE_EXPENSES,
    budgets: LIMITS.MAX_BUDGETS,
    savingsGoals: LIMITS.MAX_SAVINGS_GOALS,
    savingsDeposits: LIMITS.MAX_SAVINGS_DEPOSITS,
    debtPayments: LIMITS.MAX_DEBT_PAYMENTS,
    customCategories: LIMITS.MAX_CUSTOM_CATEGORIES,
    categories: LIMITS.MAX_CUSTOM_CATEGORIES + 50, // defaults + custom
  };
  const max = limits[section];
  if (!max) return true;
  return (currentData[section] || []).length < max;
}

// ══════════════════════════════════════════════
// stripUndefined — Defensa en profundidad
// ──────────────────────────────────────────────
// Firebase Realtime Database lanza un error y aborta TODA la escritura
// si encuentra cualquier propiedad con valor `undefined` en el árbol.
// Esto incluye undefined dentro de objetos anidados o arrays.
//
// Esta función recorre recursivamente la estructura y elimina cualquier
// undefined antes de pasársela a `set()`. Funciona sobre objetos y arrays
// y preserva null, 0, "", false (que son valores válidos en Firebase).
//
// Es idempotente y segura sobre tipos primitivos.
// ══════════════════════════════════════════════
function stripUndefined(value) {
  // Primitivos y null pasan tal cual
  if (value === null) return null;
  if (typeof value !== "object") return value;

  // Arrays: limpiar cada elemento, manteniendo el orden
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item));
  }

  // Objetos: omitir claves con undefined, limpiar el resto
  const out = {};
  for (const key in value) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
    const v = value[key];
    if (v === undefined) continue;
    out[key] = stripUndefined(v);
  }
  return out;
}

// ══════════════════════════════════════════════
// VALIDADORES
// ══════════════════════════════════════════════

function validateDebt(debt) {
  const errors = [];
  const tipoRaw = typeof debt.tipo === "string" ? debt.tipo.toLowerCase() : "cuotas";
  const tipo = DEBT_TYPES.includes(tipoRaw) ? tipoRaw : "cuotas";

  const clean = {
    entidad: sanitizeText(debt.entidad),
    tipo,
    saldoPendiente: sanitizeAmount(debt.saldoPendiente),
    proxCuota: sanitizeAmount(debt.proxCuota),
    totalCuotas: sanitizeInteger(debt.totalCuotas),
    cuotaActual: sanitizeInteger(debt.cuotaActual),
    // Saneada: nunca undefined. "" si no es fecha válida.
    fechaInicio: sanitizeDateString(debt.fechaInicio),
    limiteCredito: sanitizeAmount(debt.limiteCredito),
    pagoMinimo: sanitizeAmount(debt.pagoMinimo),
    tasaInteres: sanitizeAmount(debt.tasaInteres),
  };

  if (!clean.entidad) errors.push("Falta el nombre de la entidad");
  if (clean.saldoPendiente <= 0) errors.push("El saldo debe ser mayor que 0");

  if (tipo === "cuotas" || tipo === "prestamo") {
    if (clean.totalCuotas <= 0) errors.push("Debes indicar el número total de cuotas");
    if (clean.proxCuota <= 0) errors.push("La cuota mensual debe ser mayor que 0");
    if (!clean.fechaInicio) errors.push("La fecha de inicio no es válida");
  }
  if (tipo === "tarjeta") {
    if (clean.limiteCredito > 0 && clean.saldoPendiente > clean.limiteCredito) {
      errors.push("El saldo no puede superar el límite de crédito");
    }
  }

  return { valid: errors.length === 0, errors, data: clean };
}

// ══════════════════════════════════════════════
// 🆕 Helpers UI para el formulario de deudas (Entrega 2)
// ──────────────────────────────────────────────
// Estos helpers NO sustituyen a validateDebt — sólo lo utilizan para
// que el componente DebtTable pueda decidir si habilita el botón
// "Crear deuda" y para mostrar un preview de las cuotas que se
// generarán, sin necesidad de duplicar la lógica de validación.
// ══════════════════════════════════════════════

/**
 * Devuelve true si el formulario de deuda es lo suficientemente válido
 * como para guardar (es decir, validateDebt() devolvería valid=true).
 * Útil para deshabilitar el botón "Crear deuda" mientras falten datos.
 *
 * @param {object} debt — el draft del formulario
 * @returns {boolean}
 */
function isDebtFormReady(debt) {
  if (!debt || typeof debt !== "object") return false;
  return validateDebt(debt).valid;
}

/**
 * Genera un preview de las cuotas que se crearían al guardar la deuda,
 * SIN tocar el estado ni guardar nada. Mismo cálculo que addDebtWithPlan
 * en useFinancialData, pero sólo para mostrar al usuario lo que va a
 * pasar antes de pulsar "Crear deuda".
 *
 * Devuelve [] cuando:
 *  - El tipo no genera plan (tarjeta).
 *  - Faltan campos clave (totalCuotas, proxCuota o fechaInicio).
 *  - El número de cuotas excede el límite máximo.
 *
 * Cada item del array tiene la forma:
 *   { cuotaNum, dayPago: "YYYY-MM-DD", monto, financialMonth }
 *
 * NOTA: el cálculo se hace sobre los datos saneados (mismo que validateDebt
 * usa internamente), así que "11/13/2025" o fechas inválidas devuelven [].
 *
 * @param {object} debt — el draft del formulario
 * @param {object} [opts] — { maxPreview?: number }
 * @returns {Array}
 */
function previewDebtPlan(debt, opts = {}) {
  const maxPreview = Math.max(1, Math.min(LIMITS.MAX_CUOTAS, opts.maxPreview || LIMITS.MAX_CUOTAS));

  if (!debt || typeof debt !== "object") return [];

  // Reusamos validateDebt para sanear y obtener los datos limpios.
  const v = validateDebt(debt);
  const clean = v.data || {};

  const tipoGeneraPlan = clean.tipo === "cuotas" || clean.tipo === "prestamo";
  if (!tipoGeneraPlan) return [];
  if (clean.totalCuotas <= 0) return [];
  if (clean.proxCuota <= 0) return [];
  if (!clean.fechaInicio) return [];

  const startMK = monthKey(clean.fechaInicio);
  if (!startMK) return [];
  const day = clean.fechaInicio.split("-")[2] || "01";

  const total = Math.min(clean.totalCuotas, maxPreview);
  const out = [];
  for (let i = 0; i < total; i++) {
    const payMonthRaw = addMonths(startMK, i);
    const [py, pm] = payMonthRaw.split("-");
    const payDate = `${py}-${pm}-${day}`;
    out.push({
      cuotaNum: i + 1,
      dayPago: payDate,
      monto: clean.proxCuota,
      financialMonth: payMonthRaw, // útil sólo para depuración
    });
  }
  return out;
}

function validateFixedExpense(expense) {
  const errors = [];
  const clean = {
    concepto: sanitizeText(expense.concepto),
    diaPago: sanitizeText(expense.diaPago, 10),
    monto: sanitizeAmount(expense.monto),
    recurrente: !!expense.recurrente,
    // 🆕 v2: categoryId es el campo autoritativo; categoria (string) se mantiene como back-up
    categoryId: sanitizeText(expense.categoryId || "", 40),
    categoria: normalizeCategoryLabel(sanitizeText(expense.categoria || "", 30)),
  };
  if (!clean.concepto) errors.push("Falta el concepto");
  if (clean.monto <= 0) errors.push("El monto debe ser mayor que 0");
  if (clean.recurrente) {
    const day = parseInt(clean.diaPago);
    if (isNaN(day) || day < 1 || day > 31) {
      errors.push("Para gastos recurrentes, el día de pago debe ser un número entre 1 y 31");
    }
  }
  return { valid: errors.length === 0, errors, data: clean };
}

function validateIncome(income) {
  const errors = [];
  const tipoRaw = typeof income.tipo === "string" ? income.tipo.toLowerCase() : "fijo";
  const tipo = INCOME_TYPES.includes(tipoRaw) ? tipoRaw : "fijo";

  const clean = {
    concepto: sanitizeText(income.concepto),
    amount: sanitizeAmount(income.amount),
    fecha: sanitizeDateString(income.fecha),
    month: typeof income.month === "string" ? income.month : "",
    titular: sanitizeText(income.titular, 30) || "yo",
    tipo,
  };
  if (!clean.concepto) errors.push("Falta el concepto");
  if (clean.amount <= 0) errors.push("El monto debe ser mayor que 0");
  return { valid: errors.length === 0, errors, data: clean };
}

function validateVariableExpense(expense) {
  const errors = [];
  const clean = {
    concepto: sanitizeText(expense.concepto),
    monto: sanitizeAmount(expense.monto),
    fecha: sanitizeDateString(expense.fecha),
    month: typeof expense.month === "string" ? expense.month : "",
    // 🆕 v2
    categoryId: sanitizeText(expense.categoryId || "", 40),
    categoria: normalizeCategoryLabel(sanitizeText(expense.categoria || "", 30)),
  };
  if (!clean.concepto) errors.push("Falta el concepto");
  if (clean.monto <= 0) errors.push("El monto debe ser mayor que 0");
  return { valid: errors.length === 0, errors, data: clean };
}

function validatePayment(payment) {
  const errors = [];
  const clean = {
    concepto: sanitizeText(payment.concepto),
    monto: sanitizeAmount(payment.monto),
    dayPago: sanitizeDateString(payment.dayPago),
    estado: ["PENDIENTE", "PAGADO"].includes(payment.estado) ? payment.estado : "PENDIENTE",
    month: typeof payment.month === "string" ? payment.month : "",
    debtId: payment.debtId || "",
    // cuotaNum se queda como null o número, nunca undefined
    cuotaNum: payment.cuotaNum == null ? null : Number(payment.cuotaNum) || null,
    fixedExpenseId: payment.fixedExpenseId || "",
  };
  if (!clean.concepto) errors.push("Falta el concepto");
  if (clean.monto <= 0) errors.push("El monto debe ser mayor que 0");
  return { valid: errors.length === 0, errors, data: clean };
}

function validateBudget(budget) {
  const errors = [];
  const clean = {
    cycleMK: typeof budget.cycleMK === "string" ? budget.cycleMK : "",
    // 🆕 v2
    categoryId: sanitizeText(budget.categoryId || "", 40),
    categoria: normalizeCategoryLabel(sanitizeText(budget.categoria || "", 30)),
    monto: sanitizeAmount(budget.monto),
  };
  if (!isValidMonth(clean.cycleMK)) errors.push("Ciclo inválido");
  if (!clean.categoryId && !clean.categoria) errors.push("Falta la categoría");
  if (clean.monto <= 0) errors.push("El monto presupuestado debe ser mayor que 0");
  return { valid: errors.length === 0, errors, data: clean };
}

function validateSavingsGoal(goal) {
  const errors = [];
  const tipoRaw = typeof goal.tipo === "string" ? goal.tipo.toLowerCase() : "personalizada";
  const tipo = GOAL_TYPES.includes(tipoRaw) ? tipoRaw : "personalizada";

  const clean = {
    nombre: sanitizeText(goal.nombre, 50),
    tipo,
    objetivo: sanitizeAmount(goal.objetivo),
    fechaLimite: sanitizeDateString(goal.fechaLimite),
    icono: sanitizeText(goal.icono, 4) || "🎯",
  };
  if (!clean.nombre) errors.push("Falta el nombre de la meta");
  if (clean.objetivo <= 0) errors.push("El objetivo debe ser mayor que 0");
  return { valid: errors.length === 0, errors, data: clean };
}

function validateSavingsDeposit(deposit) {
  const errors = [];
  const clean = {
    goalId: sanitizeText(deposit.goalId, 50),
    monto: sanitizeAmount(deposit.monto),
    fecha: sanitizeDateString(deposit.fecha),
    month: typeof deposit.month === "string" ? deposit.month : "",
    nota: sanitizeText(deposit.nota || "", 100),
  };
  if (!clean.goalId) errors.push("Meta no especificada");
  if (clean.monto <= 0) errors.push("El aporte debe ser mayor que 0");
  if (!clean.fecha) errors.push("Fecha inválida");
  return { valid: errors.length === 0, errors, data: clean };
}

function validateDebtExtraPayment(payment) {
  const errors = [];
  const clean = {
    debtId: sanitizeText(payment.debtId, 50),
    monto: sanitizeAmount(payment.monto),
    fecha: sanitizeDateString(payment.fecha),
    month: typeof payment.month === "string" ? payment.month : "",
    nota: sanitizeText(payment.nota || "", 100),
  };
  if (!clean.debtId) errors.push("Deuda no especificada");
  if (clean.monto <= 0) errors.push("El monto debe ser mayor que 0");
  if (!clean.fecha) errors.push("Fecha inválida");
  return { valid: errors.length === 0, errors, data: clean };
}

// ══════════════════════════════════════════════
// 🆕 VALIDADOR DE CATEGORÍAS (v2)
//
// Ahora valida cualquier categoría (default o custom) editada o creada.
// kind: "default" | "custom"
// ══════════════════════════════════════════════

function validateCategory(cat) {
  const errors = [];

  const kindRaw = typeof cat.kind === "string" ? cat.kind : "custom";
  const kind = (kindRaw === "default" || kindRaw === "custom") ? kindRaw : "custom";

  const tipoGastoRaw = typeof cat.tipoGasto === "string" ? cat.tipoGasto : "";
  const tipoGasto = TIPO_GASTO_VALUES.includes(tipoGastoRaw) ? tipoGastoRaw : "";

  const clean = {
    kind,
    nombre: sanitizeText(cat.nombre, 25),
    emoji: typeof cat.emoji === "string" ? cat.emoji.trim().slice(0, 4) : "",
    tipoGasto,
  };

  if (!clean.nombre) errors.push("Falta el nombre de la categoría");
  if (clean.nombre.length < 2) errors.push("El nombre es demasiado corto");

  return { valid: errors.length === 0, errors, data: clean };
}

/**
 * Compatibilidad hacia atrás: en Entrega 1 se llamaba validateCustomCategory
 * y recibía { tipo, nombre, emoji, tipoGasto }. Se mantiene como alias del
 * nuevo validateCategory ignorando `tipo`.
 */
function validateCustomCategory(cat) {
  return validateCategory({
    kind: "custom",
    nombre: cat.nombre,
    emoji: cat.emoji,
    tipoGasto: cat.tipoGasto,
  });
}

// ══════════════════════════════════════════════
// MIGRACIÓN AUTOMÁTICA v1 → v2
//
// Convierte:
//   - data.customCategories[] → data.categories[] (unificada: default+custom)
//   - fixedExpenses[].categoria (string) → + categoryId (ID estable)
//   - variableExpenses[].categoria (string) → + categoryId
//   - budgets[].categoria (string) → + categoryId
//
// Mantiene el campo `categoria` original como back-up de solo lectura.
// Marca data.schemaVersion = 2 para no repetir la migración.
// ══════════════════════════════════════════════

/**
 * Migra la tabla de categorías custom (v1) + siembra defaults → tabla unificada v2.
 * Devuelve el array `categories` unificado (defaults primero, custom después).
 * Los ids de las custom se preservan tal cual para no romper referencias.
 */
function migrateCategoriesTable(rawCustom) {
  const defaults = buildDefaultCategories();

  // Las custom se preservan tal cual (su id no cambia, pasan a kind:"custom").
  const customs = (rawCustom || []).map((c) => ({
    id: c.id || genId(),
    kind: "custom",
    nombre: sanitizeText(c.nombre || "", 25) || "Sin nombre",
    emoji: (typeof c.emoji === "string" && c.emoji.trim()) ? c.emoji.trim().slice(0, 4) : "📦",
    tipoGasto: TIPO_GASTO_VALUES.includes(c.tipoGasto) ? c.tipoGasto : "",
    createdAt: Number(c.createdAt) || Date.now(),
  }));

  return [...defaults, ...customs];
}

/**
 * Dado un string legacy "emoji Nombre" y la tabla `categories` ya construida,
 * devuelve el categoryId resuelto.
 * Estrategia:
 *  1. Si es una default conocida → devolvemos su id estable.
 *  2. Si matchea el label de alguna custom → devolvemos su id.
 *  3. Si no → devolvemos "" (gasto queda sin categoría).
 *
 * Nunca crea categorías nuevas: los strings desconocidos caen como
 * "sin categoría" (mismo tratamiento que ya tienen los gastos sin string).
 */
function resolveCategoryIdFromString(label, categories) {
  if (!label || typeof label !== "string") return "";
  // 1. Default por string (actual o legacy)
  const defId = resolveLegacyStringToId(normalizeCategoryLabel(label));
  if (defId && DEFAULT_IDS.has(defId)) return defId;
  // 2. Custom por label exacto
  const list = categories || [];
  for (const c of list) {
    if (c.kind !== "custom") continue;
    if (buildCategoryLabel(c) === label) return c.id;
  }
  // 3. No resuelto
  return "";
}

/**
 * Migración idempotente del objeto `data` de Firebase a esquema v2.
 *
 * - Si `data.schemaVersion >= SCHEMA_VERSION`, devuelve `data` tal cual.
 * - Si no, construye `data.categories` (defaults + custom legacy) y rellena
 *   `categoryId` en gastos fijos, gastos variables y presupuestos a partir
 *   del string `categoria` heredado, sin destruir ese string (queda como
 *   back-up por si algún componente legacy lo lee).
 * - Marca `data.schemaVersion = SCHEMA_VERSION` para no volver a migrar.
 *
 * IMPORTANTE: esta función debe ser segura ante valores nulos/undefined en
 * cualquier sub-array, porque puede ejecutarse sobre datos muy viejos o
 * sobre el snapshot en pleno guardado.
 */
function migrateData(data) {
  if (!data || typeof data !== "object") return data;
  if (Number(data.schemaVersion) >= SCHEMA_VERSION) return data;

  // 1. Construir tabla unificada de categorías (defaults + custom legacy)
  const categories = migrateCategoriesTable(data.customCategories);

  // 2. Helper: añadir categoryId a un item si tiene `categoria` (string)
  //    pero no tiene `categoryId` aún. Nunca pisa un categoryId existente.
  const withCategoryId = (item) => {
    if (!item || typeof item !== "object") return item;
    if (item.categoryId) return item; // ya tiene id explícito → respetar
    const label = normalizeCategoryLabel(item.categoria || "");
    if (!label) return item; // sin string → queda sin clasificar
    const id = resolveCategoryIdFromString(label, categories);
    if (!id) return item; // string desconocido → sin clasificar
    return { ...item, categoryId: id };
  };

  // 3. Aplicar a las tres colecciones que llevan categoría
  const fixedExpenses = (data.fixedExpenses || []).map(withCategoryId);
  const variableExpenses = (data.variableExpenses || []).map(withCategoryId);
  const budgets = (data.budgets || []).map(withCategoryId);

  return {
    ...data,
    categories,
    fixedExpenses,
    variableExpenses,
    budgets,
    schemaVersion: SCHEMA_VERSION,
  };
}

// ══════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════
export {
  // Constantes
  LIMITS,
  SCHEMA_VERSION,
  // Sanitizadores
  sanitizeText,
  sanitizeAmount,
  sanitizeInteger,
  sanitizeDateString,
  // Helpers
  isValidDate,
  isValidMonth,
  canAddMore,
  stripUndefined,
  // Validadores
  validateDebt,
  validateFixedExpense,
  validateIncome,
  validateVariableExpense,
  validatePayment,
  validateBudget,
  validateSavingsGoal,
  validateSavingsDeposit,
  validateDebtExtraPayment,
  validateCategory,
  validateCustomCategory,
  // 🆕 Helpers de UI (Entrega 2)
  isDebtFormReady,
  previewDebtPlan,
  // Migración
  migrateData,
  migrateCategoriesTable,
  resolveCategoryIdFromString,
};
