// ══════════════════════════════════════════════
// 📊 Agregado de gasto por categoría en el ciclo
// Une:
//   - gastos variables (data.variableExpenses) → directos
//   - pagos de gastos fijos (data.payments con fixedExpenseId) →
//     categoría recuperada desde el fixedExpense original
//   - pagos manuales del calendario (payments sin fixedExpenseId ni debtId) →
//     si tienen categoría, se cuentan; si no, van a "Sin categoría"
// Las cuotas de deuda (debtId) NO se atribuyen a ninguna categoría del usuario;
// se devuelven aparte en `cuotasDeuda` para que el total cuadre.
// ══════════════════════════════════════════════
import { r2 } from "./finance.js";

/**
 * Calcula el desglose de gasto por categoría dentro de un ciclo.
 *
 * Devuelve:
 *  - categorias: array ordenado por total descendente con por cada categoría:
 *      { categoria, total, pagado, pendiente, items }
 *      donde `items` es la cantidad de movimientos que contribuyen.
 *  - totalCategorizado: suma de todas las categorías
 *  - sinCategoria: movimientos sin categoría (total, pagado, pendiente, items)
 *  - cuotasDeuda: cuotas de deuda del ciclo (total, pagado, pendiente)
 *  - totalCiclo: totalCategorizado + sinCategoria.total + cuotasDeuda.total
 *
 * Reglas de "pagado" / "pendiente":
 *  - Gastos variables → SIEMPRE cuentan como pagados (ya salieron del bolsillo).
 *  - Pagos (fijos / manuales / cuotas) → según su `estado` (PAGADO | PENDIENTE).
 *
 * @param {object} data - objeto completo del hook useFinancialData
 * @param {string} cycleMK - clave del ciclo "YYYY-MM"
 */
export function calcCategoriesOverview(data, cycleMK) {
  const empty = {
    categorias: [],
    totalCategorizado: 0,
    sinCategoria: { total: 0, pagado: 0, pendiente: 0, items: 0 },
    cuotasDeuda: { total: 0, pagado: 0, pendiente: 0, items: 0 },
    totalCiclo: 0,
  };
  if (!data || !cycleMK) return empty;

  // Mapa local: categoria → { total, pagado, pendiente, items }
  // Usamos un objeto porque el string "🏠 Vivienda" es la clave directa.
  const porCategoria = {};
  const addTo = (categoria, monto, pagado) => {
    if (!porCategoria[categoria]) {
      porCategoria[categoria] = { total: 0, pagado: 0, pendiente: 0, items: 0 };
    }
    const slot = porCategoria[categoria];
    slot.total += monto;
    if (pagado) slot.pagado += monto;
    else slot.pendiente += monto;
    slot.items += 1;
  };

  // Estado para "sin categoría"
  const sinCat = { total: 0, pagado: 0, pendiente: 0, items: 0 };
  const addToSinCat = (monto, pagado) => {
    sinCat.total += monto;
    if (pagado) sinCat.pagado += monto;
    else sinCat.pendiente += monto;
    sinCat.items += 1;
  };

  // Estado para cuotas de deuda (aparte)
  const cuotas = { total: 0, pagado: 0, pendiente: 0, items: 0 };

  // ─── 1. Gastos variables: siempre pagados ─────────────────
  const variables = (data.variableExpenses || []).filter((v) => v.month === cycleMK);
  for (const v of variables) {
    const monto = Number(v.monto) || 0;
    if (monto <= 0) continue;
    const cat = v.categoria && v.categoria.trim() ? v.categoria : "";
    if (cat) addTo(cat, monto, true);
    else addToSinCat(monto, true);
  }

  // ─── 2. Pagos del ciclo (fijos, manuales, cuotas de deuda) ───
  const fixedById = {};
  (data.fixedExpenses || []).forEach((f) => {
    fixedById[f.id] = f;
  });

  const payments = (data.payments || []).filter((p) => p.month === cycleMK);
  for (const p of payments) {
    const monto = Number(p.monto) || 0;
    if (monto <= 0) continue;
    const pagado = p.estado === "PAGADO";

    if (p.debtId) {
      // Cuota de deuda → va al apartado propio
      cuotas.total += monto;
      if (pagado) cuotas.pagado += monto;
      else cuotas.pendiente += monto;
      cuotas.items += 1;
      continue;
    }

    if (p.fixedExpenseId) {
      // Pago de gasto fijo → buscamos categoría en el fixedExpense original
      const fixed = fixedById[p.fixedExpenseId];
      const cat = fixed?.categoria && fixed.categoria.trim() ? fixed.categoria : "";
      if (cat) addTo(cat, monto, pagado);
      else addToSinCat(monto, pagado);
      continue;
    }

    // Pago manual (sin origen). No hay categoría en el modelo actual de `payments`,
    // así que todos van a "Sin categoría". Si algún día se añade un campo
    // `categoria` a los pagos manuales, se respetaría aquí automáticamente.
    const catManual = p.categoria && p.categoria.trim() ? p.categoria : "";
    if (catManual) addTo(catManual, monto, pagado);
    else addToSinCat(monto, pagado);
  }

  // ─── 3. Construir array ordenado por total descendente ───
  const categorias = Object.entries(porCategoria)
    .map(([categoria, stats]) => ({
      categoria,
      total: r2(stats.total),
      pagado: r2(stats.pagado),
      pendiente: r2(stats.pendiente),
      items: stats.items,
    }))
    .sort((a, b) => b.total - a.total);

  const totalCategorizado = categorias.reduce((s, c) => s + c.total, 0);
  const totalCiclo = totalCategorizado + sinCat.total + cuotas.total;

  return {
    categorias,
    totalCategorizado: r2(totalCategorizado),
    sinCategoria: {
      total: r2(sinCat.total),
      pagado: r2(sinCat.pagado),
      pendiente: r2(sinCat.pendiente),
      items: sinCat.items,
    },
    cuotasDeuda: {
      total: r2(cuotas.total),
      pagado: r2(cuotas.pagado),
      pendiente: r2(cuotas.pendiente),
      items: cuotas.items,
    },
    totalCiclo: r2(totalCiclo),
  };
}
