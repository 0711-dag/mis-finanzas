// ══════════════════════════════════════════════
// 📱 Bottom-sheet de gasto rápido (v2)
//
// v2: los chips de categoría rápida se generan a partir de data.categories
// (las primeras N defaults, por orden). Al seleccionar una, se guarda el
// categoryId en el nuevo gasto (y también categoria como back-up string).
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

export default function QuickAddSheet({ addRow, selectedMonth, onClose, data }) {
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [fecha, setFecha] = useState(todayISO());
  const [dateChip, setDateChip] = useState("today");
  const [success, setSuccess] = useState(false);
  const [shake, setShake] = useState(false);
  const amountRef = useRef(null);

  // Construir chips desde data.categories (preferidas + primeras custom si faltan)
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

    // Rellenar con customs populares si aún no llegamos a 8
    if (list.length < 8) {
      const picked = new Set(list.map((x) => x.id));
      const customs = categories.filter((c) => c.kind === "custom" && !picked.has(c.id));
      for (const c of customs) {
        if (list.length >= 8) break;
        list.push({
          id: c.id,
          emoji: c.emoji || "📦",
          label: c.nombre.length > 8 ? c.nombre.slice(0, 7) + "." : c.nombre,
        });
      }
    }

    return list.length > 0 ? list : FALLBACK_CHIPS;
  }, [data?.categories]);

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

  const handleSave = () => {
    if (!concepto.trim() || !monto) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }

    // Resolver label para back-up categoria (string) desde data.categories
    const cat = categoryId && data?.categories
      ? (data.categories || []).find((c) => c.id === categoryId)
      : null;
    const categoriaLabel = cat ? buildCategoryLabel(cat) : "";

    const result = addRow("variableExpenses", {
      concepto: concepto.trim(),
      monto: parseFloat(monto) || 0,
      fecha,
      month: dateToFinancialMonth(fecha) || selectedMonth,
      categoryId: categoryId || "",
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

            <input
              className="sheet-input"
              type="text"
              placeholder="¿En qué lo gastaste?"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={100}
              autoComplete="off"
            />

            <div className="date-chips">
              <button
                className={`date-chip ${dateChip === "today" ? "date-chip--active" : ""}`}
                onClick={() => handleSetDateChip("today")}
              >
                Hoy
              </button>
              <button
                className={`date-chip ${dateChip === "yesterday" ? "date-chip--active" : ""}`}
                onClick={() => handleSetDateChip("yesterday")}
              >
                Ayer
              </button>
              <input
                className={`date-chip ${dateChip === "custom" ? "date-chip--active" : ""}`}
                type="date"
                value={fecha}
                onChange={(e) => { setFecha(e.target.value); setDateChip("custom"); }}
                style={{
                  border: "1.5px solid transparent",
                  background: dateChip === "custom" ? "var(--accent)" : "var(--bg-subtle)",
                  color: dateChip === "custom" ? "var(--accent-text)" : "var(--text-secondary)",
                  fontSize: 12, fontWeight: 600,
                  padding: "8px 14px", borderRadius: 999,
                  fontFamily: "inherit", outline: "none",
                  colorScheme: "light dark",
                }}
              />
            </div>

            <div className="cat-chips">
              {chips.map((c) => {
                const activo = categoryId && c.id && categoryId === c.id;
                return (
                  <button
                    key={c.id || c.label}
                    className={`cat-chip ${activo ? "cat-chip--active" : ""}`}
                    onClick={() => setCategoryId(activo ? "" : c.id)}
                    disabled={!c.id}
                    title={!c.id ? "Esta categoría no está disponible aún" : ""}
                  >
                    <span className="cat-chip__emoji">{c.emoji}</span>
                    <span>{c.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              className="btn-primary btn-primary--accent"
              onClick={handleSave}
              disabled={!concepto.trim() || !monto}
            >
              {monto ? `Guardar ${fmt(parseFloat(monto) || 0)}` : "Guardar gasto"}
            </button>
          </>
        )}
      </div>
    </>
  );
}
