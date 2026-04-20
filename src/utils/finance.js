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
// 🆕 CLASIFICACIÓN CF / CV / DISCRECIONAL
// ══════════════════════════════════════════════

/**
 * Constantes de tipos de gasto según el modelo contable CF / CV / Discrecional.
 *  - CF: Costo Fijo. No cambia aunque no uses nada.
 *  - CV: Costo Variable. Necesario pero varía con el uso.
 *  - Discrecional: opcional, no esencial, reducible.
 */
const TIPO_GASTO = {
  CF: "CF",
  CV: "CV",
  DISCRECIONAL: "Discrecional",
};

// Mapa de categoría → tipo de gasto para GASTOS FIJOS.
// Se evalúa comparando el nombre de la categoría (puede venir con emoji delante).
const FIXED_CATEGORY_TO_TIPO = {
  "Vivienda": TIPO_GASTO.CF,
  "Seguros": TIPO_GASTO.CF,
  "Educación": TIPO_GASTO.CF,
  "Servicios": TIPO_GASTO.CV,
  "Transporte": TIPO_GASTO.CV,
  "Suscripciones": TIPO_GASTO.DISCRECIONAL,
};

// Mapa de categoría → tipo de gasto para GASTOS VARIABLES.
const VARIABLE_CATEGORY_TO_TIPO = {
  "Supermercado": TIPO_GASTO.CV,
  "Transporte": TIPO_GASTO.CV,
  "Salud": TIPO_GASTO.CV,
  "Hogar": TIPO_GASTO.CV,
  "Restaurantes": TIPO_GASTO.DISCRECIONAL,
  "Ropa": TIPO_GASTO.DISCRECIONAL,
  "Ocio": TIPO_GASTO.DISCRECIONAL,
};

/**
 * Extrae la palabra significativa de una categoría tipo "🛒 Supermercado".
 * Quita el emoji inicial y espacios sobrantes.
 */
function extractCategoryName(categoria) {
  if (!categoria || typeof categoria !== "string") return "";
  // Elimina el primer token si no contiene letras (emoji) y devuelve el resto
  const parts = categoria.trim().split(/\s+/);
  if (parts.length > 1 && !/[a-záéíóúñA-ZÁÉÍÓÚÑ]/.test(parts[0])) {
    return parts.slice(1).join(" ");
  }
  return parts.join(" ");
}

/**
 * Infiere el tipo de gasto (CF / CV / Discrecional) para un gasto concreto.
 * Si el gasto ya tiene el campo `tipoGasto` definido, lo respeta.
 * Si no, aplica la heurística por categoría + origen.
 *
 * @param {object} gasto - objeto con { categoria, tipoGasto?, ... }
 * @param {"fixed"|"variable"|"debt"|"manual"} origen
 * @returns {"CF"|"CV"|"Discrecional"}
 */
function inferTipoGasto(gasto, origen) {
  // 1. Si ya está clasificado manualmente, respeta
  if (gasto?.tipoGasto && Object.values(TIPO_GASTO).includes(gasto.tipoGasto)) {
    return gasto.tipoGasto;
  }

  // 2. Deudas: siempre CF
  if (origen === "debt") return TIPO_GASTO.CF;

  // 3. Por categoría
  const catName = extractCategoryName(gasto?.categoria);

  if (origen === "fixed") {
    // Fallback conservador: si es gasto fijo sin categoría reconocible, se asume CF
    return FIXED_CATEGORY_TO_TIPO[catName] || TIPO_GASTO.CF;
  }

  if (origen === "variable") {
    // Fallback conservador: si es gasto variable sin categoría reconocible, se asume CV
    return VARIABLE_CATEGORY_TO_TIPO[catName] || TIPO_GASTO.CV;
  }

  // 4. Pagos manuales sin origen: CV (gasto puntual necesario)
  return TIPO_GASTO.CV;
}

/**
 * Desglose del ciclo en CF / CV / Discrecional + totales derivados.
 *
 * Clasifica cada movimiento del ciclo según el modelo contable:
 *  - CF (Costo Fijo): gastos fijos clasificados como CF + cuotas de deuda
 *  - CV (Costo Variable): gastos variables clasificados como CV + fijos CV (ej. luz)
 *  - Discrecional: gastos etiquetados como Discrecional (fijos o variables)
 *
 * Devuelve:
 *  - cf, cv, discrecional: sumas por tipo
 *  - ct (costo total): CF + CV — punto de equilibrio del hogar
 *  - egresosTotales: CF + CV + Discrecional — todo lo que sale
 *  - pagosManuales: importe de pagos sin origen (clasificados como CV)
 */
function calcExpenseBreakdown(data, cycleMK) {
  const empty = {
    cf: 0,
    cv: 0,
    discrecional: 0,
    ct: 0,
    egresosTotales: 0,
    pagosManuales: 0,
  };
  if (!data || !cycleMK) return empty;

  let cf = 0;
  let cv = 0;
  let discrecional = 0;

  // Gastos fijos: buscamos los pagos del ciclo con fixedExpenseId
  // y recuperamos la categoría desde el fixedExpense original.
  const fixedExpensesById = {};
  (data.fixedExpenses || []).forEach((f) => {
    fixedExpensesById[f.id] = f;
  });

  const payments = (data.payments || []).filter((p) => p.month === cycleMK);

  for (const p of payments) {
    const monto = Number(p.monto) || 0;

    if (p.debtId) {
      // Cuota de deuda → CF
      cf += monto;
      continue;
    }

    if (p.fixedExpenseId) {
      // Pago de gasto fijo → buscar categoría y clasificar
      const fixed = fixedExpensesById[p.fixedExpenseId];
      const tipo = inferTipoGasto(fixed || p, "fixed");
      if (tipo === TIPO_GASTO.CF) cf += monto;
      else if (tipo === TIPO_GASTO.DISCRECIONAL) discrecional += monto;
      else cv += monto;
      continue;
    }

    // Pago manual (sin origen) → CV por defecto
    cv += monto;
  }

  // Gastos variables del ciclo
  const variableExpenses = (data.variableExpenses || []).filter(
    (v) => v.month === cycleMK
  );

  for (const v of variableExpenses) {
    const monto = Number(v.monto) || 0;
    const tipo = inferTipoGasto(v, "variable");
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

// ══════════════════════════════════════════════
// 🆕 DESGLOSE DETALLADO CF / CV / Discrecional
//    + separación "Ejecutado" vs "Total programado"
//    + progreso del calendario por origen
// ══════════════════════════════════════════════

/**
 * Igual que calcExpenseBreakdown, pero devuelve para cada tipo (CF/CV/Disc)
 * dos cifras: "total" (todo lo del ciclo) y "ejecutado" (lo ya pagado o ya gastado).
 *
 * Regla de "ejecutado":
 *  - Pagos del calendario → cuentan si estado === "PAGADO"
 *  - Gastos variables → SIEMPRE cuentan como ejecutados (ya salieron del bolsillo)
 *
 * Además devuelve el progreso del calendario por origen (fijos / cuotas / manuales):
 *  - pagado: suma de los pagos con ese origen que están en estado PAGADO
 *  - total: suma de todos los pagos con ese origen (pagados + pendientes)
 *
 * Devuelve:
 *  - cf, cv, discrecional: { total, ejecutado }
 *  - egresosTotales:       { total, ejecutado }
 *  - calendario:           { fijos: {pagado, total}, cuotas: {...}, manuales: {...}, total: {...} }
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

  // Progreso del calendario por origen
  let fijosPagado = 0, fijosTotal = 0;
  let cuotasPagado = 0, cuotasTotal = 0;
  let manualesPagado = 0, manualesTotal = 0;

  // Mapa de gastos fijos por id para poder recuperar su categoría
  const fixedExpensesById = {};
  (data.fixedExpenses || []).forEach((f) => {
    fixedExpensesById[f.id] = f;
  });

  const payments = (data.payments || []).filter((p) => p.month === cycleMK);

  for (const p of payments) {
    const monto = Number(p.monto) || 0;
    const estaPagado = p.estado === "PAGADO";

    // --- Progreso del calendario por origen ---
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

    // --- Clasificación CF/CV/Disc ---
    if (p.debtId) {
      // Cuota de deuda → CF
      cfTotal += monto;
      if (estaPagado) cfExec += monto;
      continue;
    }

    if (p.fixedExpenseId) {
      const fixed = fixedExpensesById[p.fixedExpenseId];
      const tipo = inferTipoGasto(fixed || p, "fixed");
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

    // Pago manual → CV por defecto
    cvTotal += monto;
    if (estaPagado) cvExec += monto;
  }

  // Gastos variables: SIEMPRE cuentan como ejecutados (ya salieron)
  const variableExpenses = (data.variableExpenses || []).filter(
    (v) => v.month === cycleMK
  );

  for (const v of variableExpenses) {
    const monto = Number(v.monto) || 0;
    const tipo = inferTipoGasto(v, "variable");
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
  // 🆕 Clasificación CF / CV / Discrecional
  TIPO_GASTO,
  inferTipoGasto,
  calcExpenseBreakdown,
  // 🆕 Desglose detallado con separación "Ejecutado" vs "Total"
  //     y progreso del calendario por origen
  calcExpenseBreakdownDetailed,
};
