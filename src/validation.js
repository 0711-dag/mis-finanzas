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
import { genId } from "./utils/format.js";

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
    fechaInicio: debt.fechaInicio,
    limiteCredito: sanitizeAmount(debt.limiteCredito),
    pagoMinimo: sanitizeAmount(debt.pagoMinimo),
    tasaInteres: sanitizeAmount(debt.tasaInteres),
  };

  if (!clean.entidad) errors.push("Falta el nombre de la entidad");
  if (clean.saldoPendiente <= 0) errors.push("El saldo debe ser mayor que 0");

  if (tipo === "cuotas" || tipo === "prestamo") {
    if (clean.totalCuotas <= 0) errors.push("Debes indicar el número total de cuotas");
    if (clean.proxCuota <= 0) errors.push("La cuota mensual debe ser mayor que 0");
    if (!isValidDate(clean.fechaInicio)) errors.push("La fecha de inicio no es válida");
  }
  if (tipo === "tarjeta") {
    if (clean.limiteCredito > 0 && clean.saldoPendiente > clean.limiteCredito) {
      errors.push("El saldo no puede superar el límite de crédito");
    }
  }

  return { valid: errors.length === 0, errors, data: clean };
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
    fecha: income.fecha,
    month: income.month,
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
    fecha: expense.fecha,
    month: expense.month,
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
    dayPago: payment.dayPago,
    estado: ["PENDIENTE", "PAGADO"].includes(payment.estado) ? payment.estado : "PENDIENTE",
    month: payment.month,
    debtId: payment.debtId || "",
    cuotaNum: payment.cuotaNum || null,
    fixedExpenseId: payment.fixedExpenseId || "",
  };
  if (!clean.concepto) errors.push("Falta el concepto");
  if (clean.monto <= 0) errors.push("El monto debe ser mayor que 0");
  return { valid: errors.length === 0, errors, data: clean };
}

function validateBudget(budget) {
  const errors = [];
  const clean = {
    cycleMK: budget.cycleMK,
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
    fechaLimite: goal.fechaLimite || "",
    icono: sanitizeText(goal.icono, 4) || "🎯",
  };
  if (!clean.nombre) errors.push("Falta el nombre de la meta");
  if (clean.objetivo <= 0) errors.push("El objetivo debe ser mayor que 0");
  if (clean.fechaLimite && !isValidDate(clean.fechaLimite)) {
    errors.push("Fecha límite inválida");
  }
  return { valid: errors.length === 0, errors, data: clean };
}

function validateSavingsDeposit(deposit) {
  const errors = [];
  const clean = {
    goalId: sanitizeText(deposit.goalId, 50),
    monto: sanitizeAmount(deposit.monto),
    fecha: deposit.fecha,
    month: deposit.month,
    nota: sanitizeText(deposit.nota || "", 100),
  };
  if (!clean.goalId) errors.push("Meta no especificada");
  if (clean.monto <= 0) errors.push("El aporte debe ser mayor que 0");
  if (!isValidDate(clean.fecha)) errors.push("Fecha inválida");
  return { valid: errors.length === 0, errors, data: clean };
}

function validateDebtExtraPayment(payment) {
  const errors = [];
  const clean = {
    debtId: sanitizeText(payment.debtId, 50),
    monto: sanitizeAmount(payment.monto),
    fecha: payment.fecha,
    month: payment.month,
    nota: sanitizeText(payment.nota || "", 100),
  };
  if (!clean.debtId) errors.push("Deuda no especificada");
  if (clean.monto <= 0) errors.push("El monto debe ser mayor que 0");
  if (!isValidDate(clean.fecha)) errors.push("Fecha inválida");
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
  // Helpers
  isValidDate,
  isValidMonth,
  canAddMore,
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
  // Migración
  migrateData,
  migrateCategoriesTable,
  resolveCategoryIdFromString,
};
