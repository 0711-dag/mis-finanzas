// ══════════════════════════════════════════════
// 📱 Bottom-sheet de gasto rápido (v3)
//
// v2: los chips de categoría rápida se generan a partir de data.categories
// (las primeras N defaults, por orden). Al seleccionar una, se guarda el
// categoryId en el nuevo gasto (y también categoria como back-up string).
//
// v3 (Entrega 1/3): reordenado del layout para que las categorías aparezcan
// JUSTO DEBAJO del importe — antes aparecían al final y quedaban tapadas
// por el teclado del sistema en móvil. Además:
//   - Se muestran 6 chips visibles + botón "Más…" que despliega el resto.
//   - La categoría pasa a ser OBLIGATORIA para poder guardar.
//   - Si intenta guardar sin categoría, se hace shake y se resalta el bloque.
// No cambia la lógica de guardado ni el modelo de datos.
// ══════════════════════════════════════════════
import { useState, useRef, useEffect, useMemo } from "react";
import { fmt, todayISO } from "../../utils/format.js";
import { dateToFinancialMonth } from "../../utils/cycle.js";
import { buildCategoryLabel } from "../../utils/categoryDefaults.js";

// Fallback por si `data.categories` no llega por algún motivo (muy improbable
// tras la migración v2, pero cubrimos la esquina). Se muestran sin ID.
const FALLBACK_CHIPS = [
  { id: "", emoji: "🛒", label: "Super" },
  { id: "", emoji: "🚗", label: "Transp." },
  { id: "", emoji: "🍽️", label: "Restau." },
  { id: "", emoji: "🏠", label: "Hogar" },
  { id: "", emoji: "🏥", label: "Salud" },
  { id: "", emoji: "🎉", label: "Ocio" },
  { id: "", emoji: "👕", label: "Ropa" },
  { id: "", emoji: "📦", label: "Otros" },
];

// Qué defaults (por id) queremos priorizar en el quick-add.
// El orden importa: salen de izq→der en la cuadrícula.
const QUICK_PREFERRED_IDS = [
  "default_supermercado",
  "default_transporte",
  "default_restaurantes",
  "default_vivienda",
  "default_salud",
  "default_ocio",
  "default_ropa",
  "default_otros",
];

// 🆕 v3: cuántos chips se muestran antes del botón "Más…"
const VISIBLE_CHIPS = 6;

export default function QuickAddSheet({ addRow, selectedMonth, onClose, data }) {
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [fecha, setFecha] = useState(todayISO());
  const [dateChip, setDateChip] = useState("today");
  const [success, setSuccess] = useState(false);
  const [shake, setShake] = useState(false);
  // 🆕 v3: controla si se ven todas las categorías o solo las 6 primeras
  const [expandedCats, setExpandedCats] = useState(false);
  // 🆕 v3: marca el bloque de categorías con error visual cuando falta elegir
  const [categoryError, setCategoryError] = useState(false);
  const amountRef = useRef(null);

  // Construir chips desde data.categories (preferidas + primeras custom si faltan)
  // NOTA: ahora devolvemos hasta 12 (antes 8) para que "Más…" tenga sentido.
  const chips = useMemo(() => {
    const categories = data?.categories || [];
    if (categories.length === 0) return FALLBACK_CHIPS;

    const byId = {};
    categories.forEach((c) => { byId[c.id] = c; });

    const list = [];

    // Primero las preferidas que existan
    for (const id of QUICK_PREFERRED_IDS) {
      if (byId[id]) {
        const c = byId[id];
        list.push({
          id: c.id,
          emoji: c.emoji || "📦",
          // Recortamos el label a 7 chars para que quepa bien en el chip
          label: c.nombre.length > 8 ? c.nombre.slice(0, 7) + "." : c.nombre,
        });
      }
    }

    // Rellenar con customs populares hasta un máximo de 12
    // (12 = 6 visibles + 6 extra bajo "Más…")
    const MAX_CHIPS = 12;
    if (list.length < MAX_CHIPS) {
      const picked = new Set(list.map((x) => x.id));
      const customs = categories.filter((c) => c.kind === "custom" && !picked.has(c.id));
      for (const c of customs) {
        if (list.length >= MAX_CHIPS) break;
        list.push({
          id: c.id,
          emoji: c.emoji || "📦",
          label: c.nombre.length > 8 ? c.nombre.slice(0, 7) + "." : c.nombre,
        });
      }
    }

    return list.length > 0 ? list : FALLBACK_CHIPS;
  }, [data?.categories]);

  // 🆕 v3: chips visibles según estado expandido/colapsado
  const visibleChips = expandedCats ? chips : chips.slice(0, VISIBLE_CHIPS);
  const hasMoreChips = chips.length > VISIBLE_CHIPS;

  // 🆕 v3: si el usuario tiene una categoría seleccionada que está oculta
  // (fuera de los primeros 6), forzamos la vista expandida para que la vea.
  useEffect(() => {
    if (!categoryId || expandedCats) return;
    const idx = chips.findIndex((c) => c.id === categoryId);
    if (idx >= VISIBLE_CHIPS) setExpandedCats(true);
  }, [categoryId, chips, expandedCats]);

  useEffect(() => {
    setTimeout(() => amountRef.current?.focus(), 150);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSetDateChip = (chip) => {
    setDateChip(chip);
    if (chip === "today") setFecha(todayISO());
    else if (chip === "yesterday") {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      setFecha(d.toISOString().split("T")[0]);
    }
  };

  // 🆕 v3: al seleccionar una categoría limpiamos cualquier marca de error
  const handleSelectCategory = (id) => {
    setCategoryId((prev) => (prev === id ? "" : id));
    setCategoryError(false);
  };

  const handleSave = () => {
    // Validación: importe y concepto (como antes)
    if (!concepto.trim() || !monto) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }

    // 🆕 v3: validación de categoría obligatoria
    if (!categoryId) {
      setCategoryError(true);
      setShake(true);
      setTimeout(() => setShake(false), 400);
      // Si el usuario no veía todos los chips, abrimos el panel
      // para que le sea fácil elegir uno.
      if (!expandedCats && hasMoreChips) setExpandedCats(true);
      return;
    }

    // Resolver label para back-up categoria (string) desde data.categories
    const cat = data?.categories
      ? (data.categories || []).find((c) => c.id === categoryId)
      : null;
    const categoriaLabel = cat ? buildCategoryLabel(cat) : "";

    const result = addRow("variableExpenses", {
      concepto: concepto.trim(),
      monto: parseFloat(monto) || 0,
      fecha,
      month: dateToFinancialMonth(fecha) || selectedMonth,
      categoryId: categoryId,
      categoria: categoriaLabel,
    });

    if (result) {
      setSuccess(true);
      setTimeout(onClose, 850);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  };

  // 🆕 v3: el botón principal ahora también bloquea sin categoría
  const canSave = !!concepto.trim() && !!monto && !!categoryId;

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div
        className={`sheet ${shake ? "sheet--shake" : ""} ${success ? "sheet--success" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet__handle" />

        {success ? (
          <div style={{ padding: "20px 0 8px", textAlign: "center" }}>
            <div style={{
              width: 56, height: 56, margin: "0 auto 12px",
              borderRadius: "50%", background: "var(--success)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 28, fontWeight: 300,
              animation: "pulseSuccess 0.3s ease",
            }}>✓</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--success)" }}>
              {fmt(parseFloat(monto) || 0)} guardado
            </div>
          </div>
        ) : (
          <>
            <h2 className="sheet__title">Gasto rápido</h2>

            {/* 1. Importe */}
            <div className="amount-input-wrap">
              <input
                ref={amountRef}
                className="amount-input num"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                onKeyDown={handleKeyDown}
                min="0"
                max="99999999"
                step="0.01"
              />
              <span className="amount-input__currency">€</span>
            </div>

            {/* 2. 🆕 v3: Categorías JUSTO debajo del importe
                   (antes estaban al final del modal y el teclado las tapaba) */}
            <div className={`cat-chips cat-chips--compact ${categoryError ? "cat-chips--error" : ""}`}>
              {visibleChips.map((c) => {
                const activo = categoryId && c.id && categoryId === c.id;
                return (
                  <button
                    key={c.id || c.label}
                    className={`cat-chip ${activo ? "cat-chip--active" : ""}`}
                    onClick={() => handleSelectCategory(c.id)}
                    disabled={!c.id}
                    title={!c.id ? "Esta categoría no está disponible aún" : ""}
                  >
                    <span className="cat-chip__emoji">{c.emoji}</span>
                    <span>{c.label}</span>
                  </button>
                );
              })}

              {/* Botón "Más…" / "Menos" — solo si hay más chips que los visibles */}
