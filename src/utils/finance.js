// ══════════════════════════════════════════════
// 💼 Cálculos financieros reutilizables
// Métricas del hogar: ahorro, endeudamiento, deudas,
// presupuestos y metas.
//
// v2: las categorías son objetos en data.categories identificados por
// `categoryId` estable. `inferTipoGasto` busca por ID y lee el campo
// `tipoGasto` directamente.
// ══════════════════════════════════════════════
import {
  findCategoryById,
  resolveLegacyStringToId,
  buildCategoryLabel,
  normalizeCategoryLabel,
} from "./categoryDefaults.js";

function r2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function sumBy(arr, key) {
  return (arr || []).reduce((s, x) => s + (Number(x?.[key]) || 0), 0);
}

// ══════════════════════════════════════════════
// DEUDAS
// ══════════════════════════════════════════════

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

function calcDebtRealBalance(debt, extraPayments) {
  const extras = (extraPayments || [])
    .filter((p) => p.debtId === debt.id)
    .reduce((s, p) => s + (Number(p.monto) || 0), 0);
  return r2(Math.max(0, (Number(debt.saldoPendiente) || 0) - extras));
}

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
  const ahorroReal = balance;
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

function calcSavingsRate(ingresos, ahorro) {
  if (!ingresos || ingresos <= 0) return 0;
  return r2((ahorro / ingresos) * 100);
}

function calcDebtRatio(cuotasDeuda, ingresos) {
  if (!ingresos || ingresos <= 0) return 0;
  return r2((cuotasDeuda / ingresos) * 100);
}

function evalDebtRatio(ratio) {
  if (ratio === 0) return { label: "Sin deudas", color: "success" };
  if (ratio < 20) return { label: "Saludable", color: "success" };
  if (ratio < 35) return { label: "Aceptable", color: "warning" };
  if (ratio < 50) return { label: "Elevado", color: "warning" };
  return { label: "Crítico", color: "danger" };
}

// ══════════════════════════════════════════════
// 🆕 CLASIFICACIÓN CF / CV / DISCRECIONAL (v2)
// ══════════════════════════════════════════════

const TIPO_GASTO = {
  CF: "CF",
  CV: "CV",
  DISCRECIONAL: "Discrecional",
};

/**
 * Resuelve el categoryId efectivo de un gasto.
 * Prioridad:
 *  1. gasto.categoryId si existe.
 *  2. gasto.categoria (string legacy) resuelto a ID de default.
 *  3. matching contra el label de alguna custom en `categories`.
 *  4. "" si no se puede resolver.
 */
function resolveCategoryId(gasto, categories) {
  if (!gasto) return "";
  if (gasto.categoryId) return gasto.categoryId;
  const label = normalizeCategoryLabel(gasto.categoria || "");
  if (!label) return "";
  const defId = resolveLegacyStringToId(label);
  if (defId) return defId;
  const list = categories || [];
  for (const c of list) {
    if (c.kind === "custom" && buildCategoryLabel(c) === label) return c.id;
  }
  return "";
}

/**
 * Infiere el tipo de gasto (CF / CV / Discrecional) para un gasto concreto.
 * v2: busca la categoría por ID en `categories` y lee su tipoGasto.
 *
 * Orden de prioridad:
 *  1. gasto.tipoGasto si viene definido explícitamente.
 *  2. Deudas → siempre CF.
 *  3. Categoría resuelta por ID → tipoGasto de la tabla.
 *  4. Fallback por origen (fixed→CF, variable→CV, manual→CV).
 *
 * @param {object} gasto
 * @param {"fixed"|"variable"|"debt"|"manual"} origen
 * @param {object} ctx - { categories } — requerido para lookups
 */
function inferTipoGasto(gasto, origen, ctx) {
  // 1. Override explícito a nivel de gasto
  if (gasto?.tipoGasto && Object.values(TIPO_GASTO).includes(gasto.tipoGasto)) {
    return gasto.tipoGasto;
  }

  // 2. Deudas
  if (origen === "debt") return TIPO_GASTO.CF;

  // Aceptamos ctx como objeto { categories } o directamente el array
  // (compatibilidad con llamadas antiguas que pasaban customCategories).
  let categories = [];
  if (Array.isArray(ctx)) categories = ctx;
  else if (ctx && Array.isArray(ctx.categories)) categories = ctx.categories;

  // 3. Lookup por ID de categoría
  const catId = resolveCategoryId(gasto, categories);
  if (catId) {
    const cat = findCategoryById(categories, catId);
    if (cat && cat.tipoGasto && Object.values(TIPO_GASTO).includes(cat.tipoGasto)) {
      return cat.tipoGasto;
    }
  }

  // 4. Fallback por origen
  if (origen === "fixed") return TIPO_GASTO.CF;
  if (origen === "variable") return TIPO_GASTO.CV;
  return TIPO_GASTO.CV;
}

/**
 * Desglose del ciclo en CF / CV / Discrecional + totales derivados.
 */
function calcExpenseBreakdown(data, cycleMK) {
  const empty = {
    cf: 0, cv: 0, discrecional: 0,
    ct: 0, egresosTotales: 0, pagosManuales: 0,
  };
  if (!data || !cycleMK) return empty;

  let cf = 0, cv = 0, discrecional = 0;
  const ctx = { categories: data.categories || [] };

  const fixedExpensesById = {};
  (data.fixedExpenses || []).forEach((f) => {
    fixedExpensesById[f.id] = f;
  });

  const payments = (data.payments || []).filter((p) => p.month === cycleMK);

  for (const p of payments) {
    const monto = Number(p.monto) || 0;

    if (p.debtId) {
      cf += monto;
      continue;
    }

    if (p.fixedExpenseId) {
      const fixed = fixedExpensesById[p.fixedExpenseId];
      const tipo = inferTipoGasto(fixed || p, "fixed", ctx);
      if (tipo === TIPO_GASTO.CF) cf += monto;
      else if (tipo === TIPO_GASTO.DISCRECIONAL) discrecional += monto;
      else cv += monto;
      continue;
    }

    cv += monto;
  }

  const variableExpenses = (data.variableExpenses || []).filter(
    (v) => v.month === cycleMK
  );

  for (const v of variableExpenses) {
    const monto = Number(v.monto) || 0;
    const tipo = inferTipoGasto(v, "variable", ctx);
    if (tipo === TIPO_GASTO.DISCRECIONAL) discrecional += monto;
    else if (tipo === TIPO_GASTO.CF) cf += monto;
    else cv += monto;
  }

  const pagosManuales = payments
    .filter((p) => !p.fixedExpenseId && !p.debtId)
    .reduce((s, p) => s + (Number(p.monto) || 0), 0);

  const ct = cf + cv;
  const egresosTotales = cf + cv + discrecional;

  return {
    cf: r2(cf),
    cv: r2(cv),
    discrecional: r2(discrecional),
    ct: r2(ct),
    egresosTotales: r2(egresosTotales),
    pagosManuales: r2(pagosManuales),
  };
}

/**
 * Desglose detallado con separación ejecutado / total + calendario por origen.
 */
function calcExpenseBreakdownDetailed(data, cycleMK) {
  const empty = {
    cf: { total: 0, ejecutado: 0 },
    cv: { total: 0, ejecutado: 0 },
    discrecional: { total: 0, ejecutado: 0 },
    egresosTotales: { total: 0, ejecutado: 0 },
    calendario: {
      fijos: { pagado: 0, total: 0 },
      cuotas: { pagado: 0, total: 0 },
      manuales: { pagado: 0, total: 0 },
      total: { pagado: 0, total: 0 },
    },
  };
  if (!data || !cycleMK) return empty;

  let cfTotal = 0, cfExec = 0;
  let cvTotal = 0, cvExec = 0;
  let dscTotal = 0, dscExec = 0;

  let fijosPagado = 0, fijosTotal = 0;
  let cuotasPagado = 0, cuotasTotal = 0;
  let manualesPagado = 0, manualesTotal = 0;

  const ctx = { categories: data.categories || [] };

  const fixedExpensesById = {};
  (data.fixedExpenses || []).forEach((f) => {
    fixedExpensesById[f.id] = f;
  });

  const payments = (data.payments || []).filter((p) => p.month === cycleMK);

  for (const p of payments) {
    const monto = Number(p.monto) || 0;
    const estaPagado = p.estado === "PAGADO";

    if (p.debtId) {
      cuotasTotal += monto;
      if (estaPagado) cuotasPagado += monto;
    } else if (p.fixedExpenseId) {
      fijosTotal += monto;
      if (estaPagado) fijosPagado += monto;
    } else {
      manualesTotal += monto;
      if (estaPagado) manualesPagado += monto;
    }

    if (p.debtId) {
      cfTotal += monto;
      if (estaPagado) cfExec += monto;
      continue;
    }

    if (p.fixedExpenseId) {
      const fixed = fixedExpensesById[p.fixedExpenseId];
      const tipo = inferTipoGasto(fixed || p, "fixed", ctx);
      if (tipo === TIPO_GASTO.CF) {
        cfTotal += monto;
        if (estaPagado) cfExec += monto;
      } else if (tipo === TIPO_GASTO.DISCRECIONAL) {
        dscTotal += monto;
        if (estaPagado) dscExec += monto;
      } else {
        cvTotal += monto;
        if (estaPagado) cvExec += monto;
      }
      continue;
    }

    cvTotal += monto;
    if (estaPagado) cvExec += monto;
  }

  const variableExpenses = (data.variableExpenses || []).filter(
    (v) => v.month === cycleMK
  );

  for (const v of variableExpenses) {
    const monto = Number(v.monto) || 0;
    const tipo = inferTipoGasto(v, "variable", ctx);
    if (tipo === TIPO_GASTO.DISCRECIONAL) {
      dscTotal += monto;
      dscExec += monto;
    } else if (tipo === TIPO_GASTO.CF) {
      cfTotal += monto;
      cfExec += monto;
    } else {
      cvTotal += monto;
      cvExec += monto;
    }
  }

  const totTotal = cfTotal + cvTotal + dscTotal;
  const totExec = cfExec + cvExec + dscExec;
  const calTotalPagado = fijosPagado + cuotasPagado + manualesPagado;
  const calTotalTotal = fijosTotal + cuotasTotal + manualesTotal;

  return {
    cf: { total: r2(cfTotal), ejecutado: r2(cfExec) },
    cv: { total: r2(cvTotal), ejecutado: r2(cvExec) },
    discrecional: { total: r2(dscTotal), ejecutado: r2(dscExec) },
    egresosTotales: { total: r2(totTotal), ejecutado: r2(totExec) },
    calendario: {
      fijos: { pagado: r2(fijosPagado), total: r2(fijosTotal) },
      cuotas: { pagado: r2(cuotasPagado), total: r2(cuotasTotal) },
      manuales: { pagado: r2(manualesPagado), total: r2(manualesTotal) },
      total: { pagado: r2(calTotalPagado), total: r2(calTotalTotal) },
    },
  };
}

// ══════════════════════════════════════════════
// PRESUPUESTO (v2: agrupa por categoryId cuando está disponible)
// ══════════════════════════════════════════════

/**
 * Devuelve la "clave de agrupación" de un item con categoría.
 * En v2 preferimos `categoryId`; si no está, cae al string `categoria`
 * (compatibilidad con datos no migrados todavía).
 */
function getCatKey(item) {
  if (item?.categoryId) return item.categoryId;
  if (item?.categoria) return normalizeCategoryLabel(item.categoria);
  return "";
}

/**
 * Resuelve el label visible de una categoría para mostrar en UI/informes.
 * Preferimos la tabla `categories`; si la clave es un string legacy no migrado,
 * devolvemos el string tal cual.
 */
function labelFromKey(key, categories) {
  if (!key) return "Sin categoría";
  const cat = findCategoryById(categories, key);
  if (cat) return buildCategoryLabel(cat);
  // Key legacy (string "emoji Nombre")
  return key;
}

function calcBudgetUsage(budgets, variableExpenses, cycleMK, categories = []) {
  const budgetsCycle = (budgets || []).filter((b) => b.cycleMK === cycleMK);
  const expensesCycle = (variableExpenses || []).filter((v) => v.month === cycleMK);

  // Gastos agregados por clave (categoryId || string legacy)
  const gastosPorKey = {};
  for (const v of expensesCycle) {
    const key = getCatKey(v);
    const k = key || "__sin__";
    gastosPorKey[k] = (gastosPorKey[k] || 0) + (Number(v.monto) || 0);
  }

  const rows = budgetsCycle.map((b) => {
    const key = getCatKey(b);
    const gastado = gastosPorKey[key] || 0;
    const restante = b.monto - gastado;
    const pct = b.monto > 0 ? (gastado / b.monto) * 100 : 0;
    return {
      // categoria: label visible (puede renombrarse; se resuelve fresh)
      categoria: labelFromKey(key, categories),
      // Mantenemos la clave original para ediciones/borrados
      _key: key,
      categoryId: b.categoryId || (categories.some((c) => c.id === key) ? key : ""),
      presupuestado: r2(b.monto),
      gastado: r2(gastado),
      restante: r2(restante),
      porcentaje: r2(pct),
      estado: pct >= 100 ? "excedido" : pct >= 80 ? "alerta" : "ok",
    };
  });

  const presupuestadas = new Set(budgetsCycle.map((b) => getCatKey(b)));
  const sinPresupuesto = Object.entries(gastosPorKey)
    .filter(([key]) => !presupuestadas.has(key) && key !== "__sin__")
    .map(([key, monto]) => ({
      categoria: labelFromKey(key, categories),
      _key: key,
      categoryId: categories.some((c) => c.id === key) ? key : "",
      presupuestado: 0,
      gastado: r2(monto),
      restante: r2(-monto),
      porcentaje: 0,
      estado: "sin_presupuesto",
    }));

  // Si hay gastos sin categoría
  if (gastosPorKey["__sin__"]) {
    sinPresupuesto.push({
      categoria: "Sin categoría",
      _key: "__sin__",
      categoryId: "",
      presupuestado: 0,
      gastado: r2(gastosPorKey["__sin__"]),
      restante: r2(-gastosPorKey["__sin__"]),
      porcentaje: 0,
      estado: "sin_presupuesto",
    });
  }

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
  TIPO_GASTO,
  inferTipoGasto,
  resolveCategoryId,
  getCatKey,
  labelFromKey,
  calcExpenseBreakdown,
  calcExpenseBreakdownDetailed,
};
