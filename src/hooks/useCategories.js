// ══════════════════════════════════════════════
// 🏷️ Hook useCategories (v2)
//
// Devuelve la lista ordenada de categorías listas para un <select>:
//   items: [{ id, label, emoji, nombre, kind, tipoGasto }]
//
// También devuelve:
//   categories: referencia al array crudo (para look-ups)
//   findById(id): helper para obtener una categoría por id
//
// Para retrocompatibilidad con el código v1 también expone:
//   options: array de strings "emoji Nombre" (como devolvía antes
//     `categories`). Sirve para los componentes legacy todavía por actualizar.
// ══════════════════════════════════════════════
import { useMemo } from "react";
import {
  buildDefaultCategories,
  buildCategoryLabel,
  findCategoryById,
} from "../utils/categoryDefaults.js";

/**
 * @param {"fixed"|"variable"|"any"} _tipo - ignorado (compatibilidad v1)
 * @param {Array} categoriesRaw - data.categories (v2) o undefined
 * @param {Array} [customCategoriesLegacy] - data.customCategories (v1) para
 *   usuarios sin migrar todavía. Si llega y `categoriesRaw` está vacío, lo
 *   usamos como fallback junto con los defaults sembrados al vuelo.
 */
export default function useCategories(_tipo, categoriesRaw, customCategoriesLegacy) {
  return useMemo(() => {
    // Caso v2: usamos la tabla tal cual
    let list = Array.isArray(categoriesRaw) ? categoriesRaw : null;

    // Fallback por si nos llaman antes de que la migración se complete
    // o por algún componente todavía no actualizado. Nunca devolvemos
    // array vacío.
    if (!list || list.length === 0) {
      const defaults = buildDefaultCategories();
      const legacy = (customCategoriesLegacy || []).map((c) => ({
        id: c.id || `legacy_${c.nombre}`,
        kind: "custom",
        nombre: c.nombre || "Sin nombre",
        emoji: c.emoji || "📦",
        tipoGasto: c.tipoGasto || "",
        createdAt: c.createdAt || Date.now(),
      }));
      list = [...defaults, ...legacy];
    }

    // Orden: defaults por campo `orden`, después custom por createdAt asc
    const defaults = list
      .filter((c) => c.kind === "default")
      .slice()
      .sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0));

    const customs = list
      .filter((c) => c.kind === "custom")
      .slice()
      .sort((a, b) => (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0));

    const ordered = [...defaults, ...customs];

    // items: forma "rica" lista para renderizar selects modernos.
    const items = ordered.map((c) => ({
      id: c.id,
      label: buildCategoryLabel(c),
      emoji: c.emoji || "📦",
      nombre: c.nombre || "",
      kind: c.kind || "custom",
      tipoGasto: c.tipoGasto || "",
    }));

    // options: forma legacy "emoji Nombre" para componentes v1 sin actualizar.
    const options = items.map((it) => it.label);

    // Helper para look-up por id en la lista ya ordenada.
    const findById = (id) => findCategoryById(ordered, id);

    return {
      items,
      options,
      categories: ordered,
      findById,
    };
  }, [categoriesRaw, customCategoriesLegacy]);
}
