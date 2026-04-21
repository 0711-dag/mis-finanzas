// ══════════════════════════════════════════════
// 🏷️ Categorías por defecto — Modelo v2 (ID estable)
//
// Ahora cada default es un OBJETO con:
//   { id, nombre, emoji, tipoGasto, orden }
//
// Los IDs son estables (string fijo tipo "default_vivienda") para que
// si el usuario renombra o cambia el emoji, su ID siga siendo el mismo
// y los gastos referenciados sigan funcionando.
//
// Los aliases legacy siguen existiendo para normalizar strings viejos
// durante la migración a v2.
// ══════════════════════════════════════════════

// Definición de las categorías "de fábrica".
// IMPORTANTE: el `id` es inmutable. Si se cambia aquí, se rompen gastos
// ya guardados. Nunca editar un id existente; añadir uno nuevo.
const DEFAULT_CATEGORY_DEFS = [
  { id: "default_vivienda",      nombre: "Vivienda",     emoji: "🏠",  tipoGasto: "CF",           orden: 0 },
  { id: "default_servicios",     nombre: "Servicios",    emoji: "💡",  tipoGasto: "CV",           orden: 1 },
  { id: "default_seguros",       nombre: "Seguros",      emoji: "🛡️", tipoGasto: "CF",           orden: 2 },
  { id: "default_supermercado",  nombre: "Supermercado", emoji: "🛒",  tipoGasto: "CV",           orden: 3 },
  { id: "default_transporte",    nombre: "Transporte",   emoji: "🚗",  tipoGasto: "CV",           orden: 4 },
  { id: "default_salud",         nombre: "Salud",        emoji: "🏥",  tipoGasto: "CV",           orden: 5 },
  { id: "default_educacion",     nombre: "Educación",    emoji: "🎓",  tipoGasto: "CF",           orden: 6 },
  { id: "default_restaurantes",  nombre: "Restaurantes", emoji: "🍽️", tipoGasto: "Discrecional", orden: 7 },
  { id: "default_ropa",          nombre: "Ropa",         emoji: "👕",  tipoGasto: "Discrecional", orden: 8 },
  { id: "default_ocio",          nombre: "Ocio",         emoji: "🎉",  tipoGasto: "Discrecional", orden: 9 },
  { id: "default_suscripciones", nombre: "Suscripciones", emoji: "📺", tipoGasto: "Discrecional", orden: 10 },
  { id: "default_otros",         nombre: "Otros",        emoji: "📦",  tipoGasto: "",             orden: 11 },
];

// Set rápido para saber si un id es de un default (no se puede borrar).
const DEFAULT_IDS = new Set(DEFAULT_CATEGORY_DEFS.map((d) => d.id));

// ══════════════════════════════════════════════
// ALIASES LEGACY — resolver strings antiguos a ID estable
// ══════════════════════════════════════════════
//
// La Entrega 1 ya normalizaba "⛽ Transporte" → "🚗 Transporte" y
// "🏠 Hogar" → "🏠 Vivienda". Esta tabla mapea strings legacy (ANTES y
// DESPUÉS de aquella normalización) directamente a IDs estables.
//
// Se usa sólo durante la migración de v1 → v2 y en los fallbacks de
// resolución de categoría por string.
const STRING_TO_DEFAULT_ID = {
  // Nombres unificados actuales
  "🏠 Vivienda":      "default_vivienda",
  "💡 Servicios":     "default_servicios",
  "🛡️ Seguros":       "default_seguros",
  "🛒 Supermercado":  "default_supermercado",
  "🚗 Transporte":    "default_transporte",
  "🏥 Salud":         "default_salud",
  "🎓 Educación":     "default_educacion",
  "🍽️ Restaurantes":  "default_restaurantes",
  "👕 Ropa":          "default_ropa",
  "🎉 Ocio":          "default_ocio",
  "📺 Suscripciones": "default_suscripciones",
  "📦 Otros":         "default_otros",
  // Legacy (antes de Entrega 1) — por si algún dato no se migró
  "⛽ Transporte":    "default_transporte",
  "🏠 Hogar":         "default_vivienda",
};

/**
 * Construye la tabla inicial de categorías para un usuario nuevo o
 * para sembrar durante la migración v1→v2.
 * Cada objeto tiene kind="default" y un createdAt estable (0) para que
 * nunca se confunda con categorías custom creadas por el usuario.
 */
function buildDefaultCategories() {
  return DEFAULT_CATEGORY_DEFS.map((d) => ({
    id: d.id,
    kind: "default",
    nombre: d.nombre,
    emoji: d.emoji,
    tipoGasto: d.tipoGasto,
    orden: d.orden,
    createdAt: 0,
  }));
}

/**
 * Dado un string "emoji Nombre", intenta resolverlo a un ID de default.
 * Devuelve null si no es una default conocida (legacy o actual).
 */
function resolveLegacyStringToId(label) {
  if (!label || typeof label !== "string") return null;
  return STRING_TO_DEFAULT_ID[label] || null;
}

/**
 * Construye un label "emoji Nombre" a partir de una categoría (objeto).
 * Si no tiene emoji, usa 📦 como fallback.
 */
function buildCategoryLabel(cat) {
  if (!cat) return "";
  const emoji = cat.emoji || "📦";
  return `${emoji} ${cat.nombre || ""}`.trim();
}

/**
 * Busca una categoría por id en una tabla `categories`.
 * Devuelve el objeto completo o null si no existe.
 */
function findCategoryById(categories, id) {
  if (!id || !categories || !categories.length) return null;
  return categories.find((c) => c.id === id) || null;
}

/**
 * Comprueba si un id pertenece a una categoría por defecto.
 */
function isDefaultId(id) {
  return DEFAULT_IDS.has(id);
}

// ══════════════════════════════════════════════
// Compatibilidad con código antiguo (v1)
// Se mantienen las siguientes exports porque otros archivos pueden
// importarlas. Generan los strings "emoji Nombre" desde los objetos v2.
// ══════════════════════════════════════════════

const DEFAULT_CATEGORIES = DEFAULT_CATEGORY_DEFS.map((d) => `${d.emoji} ${d.nombre}`);
const DEFAULT_FIXED_CATEGORIES = DEFAULT_CATEGORIES;
const DEFAULT_VARIABLE_CATEGORIES = DEFAULT_CATEGORIES;

function getDefaultCategories(_tipo) {
  return DEFAULT_CATEGORIES;
}

function isDefaultCategory(_tipo, label) {
  return DEFAULT_CATEGORIES.includes(label);
}

/**
 * LEGACY: en v1 servía para normalizar "⛽ Transporte" → "🚗 Transporte".
 * En v2 la categoría se identifica por ID, así que esta función se
 * mantiene por compatibilidad pero para resoluciones nuevas deberías
 * usar `resolveLegacyStringToId`.
 */
const LEGACY_CATEGORY_ALIASES = {
  "⛽ Transporte": "🚗 Transporte",
  "🏠 Hogar": "🏠 Vivienda",
};

function normalizeCategoryLabel(label) {
  if (!label || typeof label !== "string") return label;
  return LEGACY_CATEGORY_ALIASES[label] || label;
}

export {
  // v2 (nuevo)
  DEFAULT_CATEGORY_DEFS,
  DEFAULT_IDS,
  buildDefaultCategories,
  resolveLegacyStringToId,
  buildCategoryLabel,
  findCategoryById,
  isDefaultId,
  // v1 (compatibilidad)
  DEFAULT_CATEGORIES,
  DEFAULT_FIXED_CATEGORIES,
  DEFAULT_VARIABLE_CATEGORIES,
  LEGACY_CATEGORY_ALIASES,
  getDefaultCategories,
  isDefaultCategory,
  normalizeCategoryLabel,
};
