// ══════════════════════════════════════════════
// 🏷️ Hook useCategories
// Fusiona las categorías por defecto del tipo indicado con TODAS las
// categorías custom del usuario (globales, sin filtrar por tipo).
// Devuelve un array de strings "emoji Nombre" listo para usar
// en un <select>.
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
 * @param {"fixed" | "variable"} tipo - Determina qué defaults incluir.
 *   Las custom se incluyen TODAS, independientemente de su tipo original.
 * @param {Array} customCategories - array completo de `data.customCategories`.
 * @returns {{
 *   categories: string[],         // lista unificada para el <select>
 *   customOfType: Array,          // TODAS las custom (no filtradas por tipo)
 *   defaults: string[],           // solo las default del tipo (para bloquear borrado)
 * }}
 */
export default function useCategories(tipo, customCategories) {
  return useMemo(() => {
    const defaults = getDefaultCategories(tipo);

    // 🌐 Categorías custom: TODAS, sin filtrar por tipo — son globales.
    // Mantenemos la misma prop (customOfType) por compatibilidad con el
    // resto del código, pero ahora contiene todas las custom del usuario.
    const allCustom = (customCategories || []);

    // Construir labels de las custom y eliminar duplicados contra los defaults
    const customLabels = allCustom
      .map(buildLabel)
      .filter((label) => !defaults.includes(label));

    return {
      categories: [...defaults, ...customLabels],
      customOfType: allCustom,
      defaults,
    };
  }, [tipo, customCategories]);
}
