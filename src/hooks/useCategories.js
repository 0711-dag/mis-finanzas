// ══════════════════════════════════════════════
// 🏷️ Hook useCategories
// Fusiona las categorías por defecto con las custom del usuario
// para un tipo concreto ("fixed" | "variable").
// Devuelve un array de strings "emoji Nombre" listo para usar
// en un <select> (mantiene la forma actual de los datos).
// ══════════════════════════════════════════════
import { useMemo } from "react";
import { getDefaultCategories } from "../utils/categoryDefaults.js";

/**
 * Construye el label "emoji Nombre" a partir de una categoría custom.
 * Si no tiene emoji, usa 📦 como fallback.
 */
function buildLabel(cat) {
  const emoji = cat.emoji || "📦";
  return `${emoji} ${cat.nombre}`;
}

/**
 * Hook principal.
 * @param {"fixed" | "variable"} tipo - El tipo de categoría a devolver.
 * @param {Array} customCategories - array completo de `data.customCategories`.
 * @returns {{
 *   categories: string[],         // lista unificada para el <select>
 *   customOfType: Array,          // solo las custom del tipo (para gestión)
 *   defaults: string[],           // solo las default (para bloquear borrado)
 * }}
 */
export default function useCategories(tipo, customCategories) {
  return useMemo(() => {
    const defaults = getDefaultCategories(tipo);
    const customOfType = (customCategories || []).filter((c) => c.tipo === tipo);

    // Construir labels de las custom y eliminar duplicados contra los defaults
    const customLabels = customOfType
      .map(buildLabel)
      .filter((label) => !defaults.includes(label));

    return {
      categories: [...defaults, ...customLabels],
      customOfType,
      defaults,
    };
  }, [tipo, customCategories]);
}
