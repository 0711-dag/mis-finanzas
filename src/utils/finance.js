// ══════════════════════════════════════════════
// 💼 Cálculos financieros reutilizables
// Métricas del hogar: ahorro, endeudamiento, deudas,
// presupuestos y metas.
// ══════════════════════════════════════════════

/**
 * Redondea a 2 decimales (evita "0.1 + 0.2 = 0.30000000000000004").
 */
function r2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/**
 * Suma segura de una propiedad numérica en un array.
 */
function sumBy(arr, key) {
  return (arr || []).reduce((s, x) => s + (Number(x?.[key]) || 0), 0);
}

// ══════════════════════════════════════════════
// DEUDAS
// ══════════════════════════════════════════════

/**
 * Suma total de saldos pendientes de todas las deudas.
 */
function calcDebtTotals(debts) {
  const total = sumBy(debts, "saldoPendiente");
  const porTipo = { tarjeta: 0, cuotas: 0, prestamo: 0 };
  (debts || []).forEach((d) => {
    const t = d.tipo || "cuotas";
    if (porTipo[t] != null) porTipo[t] += Number(d.saldoPendiente) || 0;
  });
  return {
    total: r2(total),
    porTipo: {
      tarjeta: r2(porTipo.tarjeta),
      cuotas: r2(porTipo.cuotas),
      prestamo: r2(porTipo.prestamo),
    },
    count: (debts || []).length,
    activeCount: (debts || []).filter(
      (d) => (Number(d.saldoPendiente) || 0) > 0
    ).length,
  };
}

/**
 * Calcula el saldo real de una deuda restando pagos extra manuales.
 * El saldo "base" (debt.saldoPendiente) ya se actualiza con el plan automático,
 * esto añade los pagos extra fuera del plan.
 */
function calcDebtRealBalance(debt, extraPayments) {
  const extras = (extraPayments || [])
    .filter((p) => p.debtId === debt.id)
    .reduce((s, p) => s + (Number(p.monto) || 0), 0);
  return r2(Math.max(0, (Number(debt.saldoPendiente) || 0) - extras));
}

/**
 * Utilización de una tarjeta de crédito (0-100%).
 */
function calcCardUtilization(debt) {
  if (debt.tipo !== "tarjeta") return 0;
  const limite = Number(debt.limiteCredito) || 0;
  if (limite <= 0) return 0;
  const saldo = Number(debt.saldoPendiente) || 0;
  return r2(Math.min(100, (saldo / limite) * 100));
}

// ══════════════════════════════════════════════
// MÉTRICAS DEL CICLO
// ══════════════════════════════════════════════

/**
 * Calcula las métricas financieras principales para un ciclo dado.
 *
 * Devuelve:
 *  - ingresos: total del ciclo
 *  - gastosFijos: pagos de tipo "fixedExpenseId" (recurrentes) del ciclo
 *  - gastosVariables: total de variableExpenses del ciclo
 *  - cuotasDeuda: pagos con debtId del ciclo
 *  - pagosManuales: pagos del ciclo sin origen (ni fijo ni deuda)
 *  - totalGastos: suma de todos los gastos
 *  - balance: ingresos − gastos
 *  - ahorroReal: balance + aportes registrados a metas en el ciclo
 *  - tasaAhorro: (ahorro / ingresos) × 100
 */
function calcMonthlyMetrics(data, cycleMK) {
  if (!data || !cycleMK) {
    return {
      ingresos: 0,
      gastosFijos: 0,
      gastosVariables: 0,
      cuotasDeuda: 0,
      pagosManuales: 0,
      totalGastos: 0,
      balance: 0,
      aportesMetas: 0,
      ahorroReal: 0,
      tasaAhorro: 0,
    };
  }

  const ingresos = (data.incomes || [])
    .filter((i) => i.month === cycleMK)
    .reduce((s, i) => s + (Number(i.amount) || 0), 0);

  const payments = (data.payments || []).filter((p) => p.month === cycleMK);

  const gastosFijos = payments
    .filter((p) => p.fixedExpenseId)
    .reduce((s, p) => s + (Number(p.monto) || 0), 0);

  const cuotasDeuda = payments
    .filter((p) => p.debtId)
    .reduce((s, p) => s + (Number(p.monto) || 0), 0);

  const pagosManuales = payments
    .filter((p) => !p.fixedExpenseId && !p.debtId)
    .reduce((s, p) => s + (Number(p.monto) || 0), 0);

  const gastosVariables = (data.variableExpenses || [])
    .filter((v) => v.month === cycleMK)
    .reduce((s, v) => s + (Number(v.monto) || 0), 0);

  const aportesMetas = (data.savingsDeposits || [])
    .filter((d) => d.month === cycleMK)
    .reduce((s, d) => s + (Number(d.monto) || 0), 0);

  const totalGastos = gastosFijos + gastosVariables + cuotasDeuda + pagosManuales;
  const balance = ingresos - totalGastos;
  const ahorroReal = balance; // el dinero no gastado ES el ahorro potencial
  const tasaAhorro = ingresos > 0 ? (ahorroReal / ingresos) * 100 : 0;

  return {
    ingresos: r2(ingresos),
    gastosFijos: r2(gastosFijos),
    gastosVariables: r2(gastosVariables),
    cuotasDeuda: r2(cuotasDeuda),
    pagosManuales: r2(pagosManuales),
    totalGastos: r2(totalGastos),
    balance: r2(balance),
    aportesMetas: r2(aportesMetas),
    ahorroReal: r2(ahorroReal),
    tasaAhorro: r2(tasaAhorro),
  };
}

/**
 * Tasa de ahorro (%).
 */
function calcSavingsRate(ingresos, ahorro) {
  if (!ingresos || ingresos <= 0) return 0;
  return r2((ahorro / ingresos) * 100);
}

/**
 * Ratio de endeudamiento: cuotas de deuda / ingresos × 100.
 * Sano: < 30-35%.
 */
function calcDebtRatio(cuotasDeuda, ingresos) {
  if (!ingresos || ingresos <= 0) return 0;
  return r2((cuotasDeuda / ingresos) * 100);
}

/**
 * Devuelve una evaluación textual del ratio de endeudamiento.
 */
function evalDebtRatio(ratio) {
  if (ratio === 0) return { label: "Sin deudas", color: "success" };
  if (ratio < 20) return { label: "Saludable", color: "success" };
  if (ratio < 35) return { label: "Aceptable", color: "warning" };
  if (ratio < 50) return { label: "Elevado", color: "warning" };
  return { label: "Crítico", color: "danger" };
}

// ══════════════════════════════════════════════
// PRESUPUESTO
// ══════════════════════════════════════════════

/**
 * Dado un array de budgets y gastos variables, devuelve por cada categoría:
 *  - presupuestado
 *  - gastado
 *  - restante
 *  - porcentaje usado
 */
function calcBudgetUsage(budgets, variableExpenses, cycleMK) {
  const budgetsCycle = (budgets || []).filter((b) => b.cycleMK === cycleMK);
  const expensesCycle = (variableExpenses || []).filter((v) => v.month === cycleMK);

  // Gastos por categoría
  const gastosPorCat = {};
  for (const v of expensesCycle) {
    const cat = v.categoria || "Sin categoría";
    gastosPorCat[cat] = (gastosPorCat[cat] || 0) + (Number(v.monto) || 0);
  }

  // Por cada presupuesto definido
  const rows = budgetsCycle.map((b) => {
    const gastado = gastosPorCat[b.categoria] || 0;
    const restante = b.monto - gastado;
    const pct = b.monto > 0 ? (gastado / b.monto) * 100 : 0;
    return {
      categoria: b.categoria,
      presupuestado: r2(b.monto),
      gastado: r2(gastado),
      restante: r2(restante),
      porcentaje: r2(pct),
      estado:
        pct >= 100 ? "excedido" : pct >= 80 ? "alerta" : "ok",
    };
  });

  // Categorías con gasto pero sin presupuesto definido
  const presupuestadas = new Set(budgetsCycle.map((b) => b.categoria));
  const sinPresupuesto = Object.entries(gastosPorCat)
    .filter(([cat]) => !presupuestadas.has(cat))
    .map(([cat, monto]) => ({
      categoria: cat,
      presupuestado: 0,
      gastado: r2(monto),
      restante: r2(-monto),
      porcentaje: 0,
      estado: "sin_presupuesto",
    }));

  const totalPresupuestado = rows.reduce((s, r) => s + r.presupuestado, 0);
  const totalGastado =
    rows.reduce((s, r) => s + r.gastado, 0) +
    sinPresupuesto.reduce((s, r) => s + r.gastado, 0);

  return {
    categorias: [...rows, ...sinPresupuesto],
    totalPresupuestado: r2(totalPresupuestado),
    totalGastado: r2(totalGastado),
    totalRestante: r2(totalPresupuestado - totalGastado),
  };
}

// ══════════════════════════════════════════════
// METAS DE AHORRO
// ══════════════════════════════════════════════

/**
 * Progreso de una meta de ahorro (%).
 */
function calcGoalProgress(goal, deposits) {
  if (!goal || !goal.objetivo) return { acumulado: 0, porcentaje: 0, falta: 0 };
  const acumulado = (deposits || [])
    .filter((d) => d.goalId === goal.id)
    .reduce((s, d) => s + (Number(d.monto) || 0), 0);
  const pct = (acumulado / goal.objetivo) * 100;
  return {
    acumulado: r2(acumulado),
    porcentaje: r2(Math.min(100, pct)),
    falta: r2(Math.max(0, goal.objetivo - acumulado)),
  };
}

/**
 * Sugiere una meta de fondo de emergencia basada en los gastos fijos mensuales.
 * Devuelve rango conservador (3x) a saludable (6x).
 */
function suggestEmergencyFund(fixedExpenses) {
  const mensual = (fixedExpenses || []).reduce(
    (s, f) => s + (Number(f.monto) || 0),
    0
  );
  return {
    mensual: r2(mensual),
    minimo: r2(mensual * 3),
    recomendado: r2(mensual * 6),
  };
}

/**
 * Dado una meta y sus aportes, estima cuánto debería aportarse por mes
 * para cumplir la fecha límite.
 */
function calcMonthlyTarget(goal, deposits) {
  if (!goal?.fechaLimite) return null;
  const { falta } = calcGoalProgress(goal, deposits);
  const hoy = new Date();
  const limite = new Date(goal.fechaLimite);
  const mesesRestantes = Math.max(
    1,
    (limite.getFullYear() - hoy.getFullYear()) * 12 +
      (limite.getMonth() - hoy.getMonth())
  );
  return r2(falta / mesesRestantes);
}

export {
  r2,
  sumBy,
  calcDebtTotals,
  calcDebtRealBalance,
  calcCardUtilization,
  calcMonthlyMetrics,
  calcSavingsRate,
  calcDebtRatio,
  evalDebtRatio,
  calcBudgetUsage,
  calcGoalProgress,
  suggestEmergencyFund,
  calcMonthlyTarget,
};
