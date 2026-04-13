// ══════════════════════════════════════════════
// 🔒 Validación y sanitización de datos
// ══════════════════════════════════════════════

// Límites para evitar abuso de la base de datos
const LIMITS = {
  MAX_TEXT_LENGTH: 100,       // Máximo caracteres en campos de texto
  MAX_DEBTS: 50,              // Máximo número de deudas
  MAX_PAYMENTS: 500,          // Máximo número de pagos
  MAX_FIXED_EXPENSES: 30,     // Máximo gastos fijos
  MAX_INCOMES: 100,           // Máximo ingresos
  MAX_VARIABLE_EXPENSES: 500, // Máximo gastos variables
  MAX_AMOUNT: 99_999_999,     // Monto máximo permitido (€)
  MAX_CUOTAS: 360,            // Máximo número de cuotas (30 años)
};

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
  };
  const max = limits[section];
  if (!max) return true;
  return (currentData[section] || []).length < max;
}

function validateDebt(debt) {
  const errors = [];
  const clean = {
    entidad: sanitizeText(debt.entidad),
    saldoPendiente: sanitizeAmount(debt.saldoPendiente),
    proxCuota: sanitizeAmount(debt.proxCuota),
    totalCuotas: sanitizeInteger(debt.totalCuotas),
    cuotaActual: sanitizeInteger(debt.cuotaActual),
    fechaInicio: debt.fechaInicio,
  };
  if (!clean.entidad) errors.push("Falta el nombre de la entidad");
  if (clean.saldoPendiente <= 0) errors.push("El saldo debe ser mayor que 0");
  if (clean.totalCuotas > 0 && clean.proxCuota <= 0) errors.push("La cuota debe ser mayor que 0");
  if (clean.totalCuotas > 0 && !isValidDate(clean.fechaInicio)) errors.push("La fecha de inicio no es válida");
  return { valid: errors.length === 0, errors, data: clean };
}

function validateFixedExpense(expense) {
  const errors = [];
  const clean = {
    concepto: sanitizeText(expense.concepto),
    diaPago: sanitizeText(expense.diaPago, 10),
    monto: sanitizeAmount(expense.monto),
  };
  if (!clean.concepto) errors.push("Falta el concepto");
  if (clean.monto <= 0) errors.push("El monto debe ser mayor que 0");
  return { valid: errors.length === 0, errors, data: clean };
}

function validateIncome(income) {
  const errors = [];
  const clean = {
    concepto: sanitizeText(income.concepto),
    amount: sanitizeAmount(income.amount),
    fecha: income.fecha,
    month: income.month,
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
    categoria: sanitizeText(expense.categoria, 30),
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
  };
  if (!clean.concepto) errors.push("Falta el concepto");
  if (clean.monto <= 0) errors.push("El monto debe ser mayor que 0");
  return { valid: errors.length === 0, errors, data: clean };
}

export {
  LIMITS,
  sanitizeText,
  sanitizeAmount,
  sanitizeInteger,
  isValidDate,
  isValidMonth,
  canAddMore,
  validateDebt,
  validateFixedExpense,
  validateIncome,
  validateVariableExpense,
  validatePayment,
};
