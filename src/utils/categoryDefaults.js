// ══════════════════════════════════════════════
// 🏷️ Categorías por defecto
// Fuente única de verdad para las categorías "de fábrica".
// Los usuarios pueden AÑADIR categorías custom desde la UI,
// pero las default siempre están presentes (no se pueden eliminar).
// Formato: string "emoji Nombre" para mantener compatibilidad con
// los datos existentes (que guardan la categoría como string).
// ══════════════════════════════════════════════

// Categorías por defecto para gastos fijos del hogar
const DEFAULT_FIXED_CATEGORIES = [
  "🏠 Vivienda",        // alquiler, hipoteca, comunidad
  "💡 Servicios",       // luz, agua, gas, internet
  "🛡️ Seguros",         // hogar, vida, coche
  "📺 Suscripciones",   // Netflix, Spotify, gimnasio
  "🎓 Educación",       // colegios, cursos
  "🚗 Transporte",      // parking mensual, abono
  "📦 Otros",
];

// Categorías por defecto para gastos variables
const DEFAULT_VARIABLE_CATEGORIES = [
  "🛒 Supermercado",
  "⛽ Transporte",
  "🏠 Hogar",
  "🍽️ Restaurantes",
  "👕 Ropa",
  "🏥 Salud",
  "🎉 Ocio",
  "📦 Otros",
];

/**
 * Devuelve las categorías por defecto para un tipo concreto.
 * @param {"fixed" | "variable"} tipo
 * @returns {string[]} array de strings con formato "emoji Nombre"
 */
function getDefaultCategories(tipo) {
  if (tipo === "fixed") return DEFAULT_FIXED_CATEGORIES;
  if (tipo === "variable") return DEFAULT_VARIABLE_CATEGORIES;
  return [];
}

/**
 * Comprueba si una categoría (string "emoji Nombre") es una default.
 * Útil para decidir si se puede eliminar o no.
 */
function isDefaultCategory(tipo, label) {
  return getDefaultCategories(tipo).includes(label);
}

export {
  DEFAULT_FIXED_CATEGORIES,
  DEFAULT_VARIABLE_CATEGORIES,
  getDefaultCategories,
  isDefaultCategory,
};
