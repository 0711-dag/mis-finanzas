// ══════════════════════════════════════════════
// 🏷️ Hook useCategories
// 🆕 LISTA ÚNICA UNIFICADA: ya no hay "categorías de fijos" y
// "categorías de variables". Una sola lista sirve para todos los contextos.
// El parámetro `tipo` se mantiene por compatibilidad con llamadas
// existentes, pero se ignora.
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
 * @param {"fixed" | "variable" | "any"} _tipo - parámetro IGNORADO,
 *   se mantiene por compatibilidad con llamadas existentes.
 * @param {Array} customCategories - array completo de `data.customCategories`.
 * @returns {{
 *   categories: string[],   // lista unificada (defaults + custom)
 *   customOfType: Array,    // TODAS las custom (nombre legado mantenido)
 *   defaults: string[],     // solo las default (para bloquear borrado)
 * }}
 */
export default function useCategories(_tipo, customCategories) {
  return useMemo(() => {
    // 🌐 Lista única de defaults — sin filtrar por tipo.
    const defaults = getDefaultCategories();

    // Todas las categorías custom son globales y se ven siempre.
    const allCustom = (customCategories || []);

    // Construir labels de las custom y eliminar duplicados contra los defaults
    const customLabels = allCustom
      .map(buildLabel)
      .filter((label) => !defaults.includes(label));

    return {
      categories: [...defaults, ...customLabels],
      customOfType: allCustom, // nombre legado, ahora contiene TODAS
      defaults,
    };
  }, [customCategories]);
}
