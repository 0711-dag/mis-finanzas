// ══════════════════════════════════════════════
// 🔒 Validación y sanitización de datos
// ══════════════════════════════════════════════
import { normalizeCategoryLabel } from "./utils/categoryDefaults.js";

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
  MAX_CUSTOM_CATEGORIES: 50,   // categorías custom por usuario
  MAX_AMOUNT: 99_999_999,
  MAX_CUOTAS: 360,
};

// Tipos permitidos
const DEBT_TYPES = ["tarjeta", "cuotas", "prestamo"];
const INCOME_TYPES = ["fijo", "variable"];
const GOAL_TYPES = ["emergencia", "personalizada"];

// 🆕 Tipos de categoría: ahora las categorías son globales, así que
// aceptamos "any" (recomendado para nuevas) además de "fixed"/"variable"
// por compatibilidad con datos antiguos.
const CATEGORY_TYPES = ["fixed", "variable", "any"];

// 🆕 Clasificación contable por defecto para nuevas categorías custom.
// El usuario puede elegir una distinta al crearla.
const TIPO_GASTO_VALUES = ["CF", "CV", "Discrecional"];

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
    // 🆕 Normalizamos la categoría a la etiqueta unificada si hace falta
    categoria: normalizeCategoryLabel(sanitizeText(expense.categoria, 30)),
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
    // 🆕 Normalizamos la categoría a la etiqueta unificada si hace falta
    categoria: normalizeCategoryLabel(sanitizeText(expense.categoria, 30)),
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
    // 🆕 Normalizamos la categoría a la etiqueta unificada
    categoria: normalizeCategoryLabel(sanitizeText(budget.categoria, 30)),
    monto: sanitizeAmount(budget.monto),
  };
  if (!isValidMonth(clean.cycleMK)) errors.push("Ciclo inválido");
  if (!clean.categoria) errors.push("Falta la categoría");
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
// 🆕 VALIDADOR DE CATEGORÍAS CUSTOM
// ══════════════════════════════════════════════

/**
 * Valida una categoría personalizada creada por el usuario.
 * - `tipo` debe ser "fixed" | "variable" | "any"; "any" es el recomendado
 *   porque la lista ahora es única. Si llega vacío, se asume "any".
 * - `nombre` obligatorio, máx. 25 caracteres visibles
 * - `emoji` opcional; si falta, se usará 📦 como fallback
 * - `tipoGasto` opcional; si viene, debe ser "CF" | "CV" | "Discrecional".
 *   Si no viene, se deja undefined y se infiere por nombre/origen.
 */
function validateCustomCategory(cat) {
  const errors = [];
  const tipoRaw = typeof cat.tipo === "string" ? cat.tipo.toLowerCase() : "any";
  const tipo = CATEGORY_TYPES.includes(tipoRaw) ? tipoRaw : "any";

  const tipoGastoRaw = typeof cat.tipoGasto === "string" ? cat.tipoGasto : "";
  const tipoGasto = TIPO_GASTO_VALUES.includes(tipoGastoRaw) ? tipoGastoRaw : "";

  const clean = {
    tipo,
    nombre: sanitizeText(cat.nombre, 25),
    // El emoji puede contener caracteres como "🛡️" (con variante) → no lo sanitizamos agresivamente.
    emoji: typeof cat.emoji === "string" ? cat.emoji.trim().slice(0, 4) : "",
    tipoGasto, // "" si no se declaró → el cálculo usará la inferencia
  };

  if (!clean.nombre) errors.push("Falta el nombre de la categoría");
  if (clean.nombre.length < 2) errors.push("El nombre es demasiado corto");

  return { valid: errors.length === 0, errors, data: clean };
}

// ══════════════════════════════════════════════
// MIGRACIÓN AUTOMÁTICA DE DATOS EXISTENTES
// Aplica valores por defecto sin romper nada + 🆕 normaliza categorías
// antiguas ("⛽ Transporte" → "🚗 Transporte", "🏠 Hogar" → "🏠 Vivienda").
// ══════════════════════════════════════════════
function migrateData(rawData) {
  if (!rawData) return rawData;

  return {
    debts: (rawData.debts || []).map((d) => ({
      tipo: d.tipo && DEBT_TYPES.includes(d.tipo) ? d.tipo : "cuotas",
      limiteCredito: d.limiteCredito || 0,
      pagoMinimo: d.pagoMinimo || 0,
      tasaInteres: d.tasaInteres || 0,
      ...d,
    })),
    payments: rawData.payments || [],
    fixedExpenses: (rawData.fixedExpenses || []).map((f) => ({
      ...f,
      // 🆕 Normalizar categoría legacy (no sobreescribe las que ya son válidas)
      categoria: normalizeCategoryLabel(f.categoria || ""),
    })),
    incomes: (rawData.incomes || []).map((i) => ({
      titular: i.titular || "yo",
      tipo: i.tipo && INCOME_TYPES.includes(i.tipo) ? i.tipo : "fijo",
      ...i,
    })),
    // 🆕 Normalizar categorías en gastos variables
    variableExpenses: (rawData.variableExpenses || []).map((v) => ({
      ...v,
      categoria: normalizeCategoryLabel(v.categoria || ""),
    })),
    // 🆕 Normalizar categorías en presupuestos (para que se sigan vinculando)
    budgets: (rawData.budgets || []).map((b) => ({
      ...b,
      categoria: normalizeCategoryLabel(b.categoria || ""),
    })),
    savingsGoals: rawData.savingsGoals || [],
    savingsDeposits: rawData.savingsDeposits || [],
    debtPayments: rawData.debtPayments || [],
    // Categorías custom — array vacío por defecto para usuarios existentes
    customCategories: rawData.customCategories || [],
  };
}

export {
  LIMITS,
  DEBT_TYPES,
  INCOME_TYPES,
  GOAL_TYPES,
  CATEGORY_TYPES,
  TIPO_GASTO_VALUES,
  sanitizeText,
  sanitizeAmount,
  sanitizeInteger,
  isValidDate,
  isValidMonth,
  canAddMore,
  migrateData,
  validateDebt,
  validateFixedExpense,
  validateIncome,
  validateVariableExpense,
  validatePayment,
  validateBudget,
  validateSavingsGoal,
  validateSavingsDeposit,
  validateDebtExtraPayment,
  validateCustomCategory,
};
