// ══════════════════════════════════════════════
// 📊 Agregado de gasto por categoría en el ciclo (v2)
//
// v2: agrupa por categoryId. Si un item no tiene categoryId pero tiene
// `categoria` (string legacy) y resuelve a una default conocida, también
// se agrupa correctamente. Los huérfanos van a "Sin categoría".
//
// 🛡️ Fallback defensivo: si `data.categories` llega vacío, sembramos los
// defaults al vuelo para que el label resuelva siempre a un nombre bonito
// (no al id crudo como `default_vivienda`).
// ══════════════════════════════════════════════
import { r2, resolveCategoryId } from "./finance.js";
import {
  findCategoryById,
  buildCategoryLabel,
  buildDefaultCategories,
} from "./categoryDefaults.js";

export function calcCategoriesOverview(data, cycleMK) {
  const empty = {
    categorias: [],
    totalCategorizado: 0,
    sinCategoria: { total: 0, pagado: 0, pendiente: 0, items: 0 },
    cuotasDeuda: { total: 0, pagado: 0, pendiente: 0, items: 0 },
    totalCiclo: 0,
  };
  if (!data || !cycleMK) return empty;

  // 🛡️ Garantizar que tenemos una tabla utilizable para resolver labels.
  // Si `data.categories` está vacío por cualquier motivo (migración no
  // completada, estado intermedio…), sembramos los defaults al vuelo.
  // Las custom (si las hubiera) se toman del legacy `customCategories`
  // para no perder referencias a categorías de usuario.
  let categories = Array.isArray(data.categories) ? data.categories : [];
  if (categories.length === 0) {
    const defaults = buildDefaultCategories();
    const legacyCustoms = (data.customCategories || []).map((c) => ({
      id: c.id || `legacy_${c.nombre}`,
      kind: "custom",
      nombre: c.nombre || "Sin nombre",
      emoji: c.emoji || "📦",
      tipoGasto: c.tipoGasto || "",
      createdAt: c.createdAt || 0,
    }));
    categories = [...defaults, ...legacyCustoms];
  }

  // Mapa por ID de categoría
  const porId = {};
  const addTo = (id, monto, pagado) => {
    if (!porId[id]) porId[id] = { total: 0, pagado: 0, pendiente: 0, items: 0 };
    const slot = porId[id];
    slot.total += monto;
    if (pagado) slot.pagado += monto;
    else slot.pendiente += monto;
    slot.items += 1;
  };

  const sinCat = { total: 0, pagado: 0, pendiente: 0, items: 0 };
  const addToSinCat = (monto, pagado) => {
    sinCat.total += monto;
    if (pagado) sinCat.pagado += monto;
    else sinCat.pendiente += monto;
    sinCat.items += 1;
  };

  const cuotas = { total: 0, pagado: 0, pendiente: 0, items: 0 };

  // ─── 1. Gastos variables (siempre ejecutados) ───
  const variables = (data.variableExpenses || []).filter((v) => v.month === cycleMK);
  for (const v of variables) {
    const monto = Number(v.monto) || 0;
    if (monto <= 0) continue;
    const id = resolveCategoryId(v, categories);
    if (id) addTo(id, monto, true);
    else addToSinCat(monto, true);
  }

  // ─── 2. Pagos del ciclo ───
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
      cuotas.total += monto;
      if (pagado) cuotas.pagado += monto;
      else cuotas.pendiente += monto;
      cuotas.items += 1;
      continue;
    }

    if (p.fixedExpenseId) {
      const fixed = fixedById[p.fixedExpenseId];
      const id = fixed ? resolveCategoryId(fixed, categories) : "";
      if (id) addTo(id, monto, pagado);
      else addToSinCat(monto, pagado);
      continue;
    }

    // Pago manual
    const idManual = resolveCategoryId(p, categories);
    if (idManual) addTo(idManual, monto, pagado);
    else addToSinCat(monto, pagado);
  }

  // ─── 3. Construir array ordenado por total descendente ───
  // Para cada id agregado, buscamos su categoría actual y generamos
  // un label visible fresco (si el usuario la renombró, se ve el cambio).
  const categorias = Object.entries(porId)
    .map(([id, stats]) => {
      const cat = findCategoryById(categories, id);
      // 🛡️ Si por lo que sea no se encuentra, usamos un label genérico
      // en vez del id crudo (que era el bug de la UI).
      const label = cat ? buildCategoryLabel(cat) : "📦 Categoría desconocida";
      return {
        categoryId: id,
        categoria: label,
        total: r2(stats.total),
        pagado: r2(stats.pagado),
