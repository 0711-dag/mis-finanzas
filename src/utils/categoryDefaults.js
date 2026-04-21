// ══════════════════════════════════════════════
// 🏷️ Categorías por defecto — LISTA ÚNICA UNIFICADA
// Fuente única de verdad para las categorías "de fábrica".
// Las mismas categorías sirven para gastos fijos Y variables.
// Los usuarios pueden AÑADIR categorías custom desde la UI,
// pero las default siempre están presentes (no se pueden eliminar).
// Formato: string "emoji Nombre" para mantener compatibilidad con
// los datos existentes (que guardan la categoría como string).
// ══════════════════════════════════════════════

// 🌐 Lista ÚNICA de categorías por defecto (fijos + variables)
// Se compone tomando lo mejor de las dos listas anteriores y unificando
// los duplicados (Transporte, Vivienda/Hogar).
const DEFAULT_CATEGORIES = [
  "🏠 Vivienda",        // alquiler, hipoteca, comunidad, hogar
  "💡 Servicios",       // luz, agua, gas, internet
  "🛡️ Seguros",         // hogar, vida, coche
  "🛒 Supermercado",    // compra diaria
  "🚗 Transporte",      // combustible, abono, parking…
  "🏥 Salud",           // farmacia, médico
  "🎓 Educación",       // colegios, cursos, libros
  "🍽️ Restaurantes",
  "👕 Ropa",
  "🎉 Ocio",
  "📺 Suscripciones",   // Netflix, Spotify, gimnasio
  "📦 Otros",
];

// 🔁 Alias de migración: si un gasto ya está guardado con una etiqueta
// antigua (de las dos listas separadas), la mapeamos a la nueva etiqueta
// unificada. La migración se aplica automáticamente al cargar datos.
//
// Solo migramos categorías duplicadas o renombradas. Las que ya coinciden
// con la lista unificada no aparecen aquí (no hace falta).
const LEGACY_CATEGORY_ALIASES = {
  // Variables → unificadas
  "⛽ Transporte": "🚗 Transporte",   // antes solo variables con ⛽
  "🏠 Hogar": "🏠 Vivienda",          // se unifica con Vivienda
  // (el resto: 🛒 Supermercado, 🏥 Salud, 🍽️ Restaurantes, 👕 Ropa, 🎉 Ocio,
  //  📦 Otros, 🏠 Vivienda, 💡 Servicios, 🛡️ Seguros, 📺 Suscripciones,
  //  🎓 Educación, 🚗 Transporte → ya coinciden con la lista única)
};

/**
 * Devuelve las categorías por defecto.
 * 🆕 Acepta cualquier `tipo` por compatibilidad con el código antiguo,
 * pero SIEMPRE devuelve la misma lista unificada.
 *
 * @param {"fixed" | "variable" | "any"} _tipo - ignorado (compatibilidad)
 * @returns {string[]} array de strings con formato "emoji Nombre"
 */
function getDefaultCategories(_tipo) {
  // Ya no filtramos por tipo: una sola lista global.
  return DEFAULT_CATEGORIES;
}

/**
 * Comprueba si una categoría (string "emoji Nombre") es una default.
 * Útil para decidir si se puede eliminar o no.
 */
function isDefaultCategory(_tipo, label) {
  // `_tipo` se ignora — la lista es única.
  return DEFAULT_CATEGORIES.includes(label);
}

/**
 * 🆕 Normaliza una categoría antigua a la nueva etiqueta unificada.
 * Si no hay alias, devuelve el string tal cual.
 * Se usa en `migrateData` y en la inferencia CF/CV/Discrecional.
 *
 * @param {string} label - etiqueta original, p.ej. "⛽ Transporte"
 * @returns {string} etiqueta normalizada, p.ej. "🚗 Transporte"
 */
function normalizeCategoryLabel(label) {
  if (!label || typeof label !== "string") return label;
  return LEGACY_CATEGORY_ALIASES[label] || label;
}

// Mantenemos los nombres antiguos exportados por compatibilidad con
// cualquier import existente (CategoryManager, etc.): ambos apuntan ahora
// a la misma lista única.
const DEFAULT_FIXED_CATEGORIES = DEFAULT_CATEGORIES;
const DEFAULT_VARIABLE_CATEGORIES = DEFAULT_CATEGORIES;

export {
  DEFAULT_CATEGORIES,
  DEFAULT_FIXED_CATEGORIES,
  DEFAULT_VARIABLE_CATEGORIES,
  LEGACY_CATEGORY_ALIASES,
  getDefaultCategories,
  isDefaultCategory,
  normalizeCategoryLabel,
};
