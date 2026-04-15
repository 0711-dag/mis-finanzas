import { useState, useRef, useEffect } from "react";
import { fmt, todayISO } from "../utils/format.js";
import { dateToFinancialMonth } from "../utils/cycle.js";

const QUICK_CATEGORIES = [
  { emoji: "🛒", label: "Super", full: "🛒 Supermercado" },
  { emoji: "⛽", label: "Transp.", full: "⛽ Transporte" },
  { emoji: "🍽️", label: "Restau.", full: "🍽️ Restaurantes" },
  { emoji: "🏠", label: "Hogar", full: "🏠 Hogar" },
  { emoji: "🏥", label: "Salud", full: "🏥 Salud" },
  { emoji: "🎉", label: "Ocio", full: "🎉 Ocio" },
  { emoji: "👕", label: "Ropa", full: "👕 Ropa" },
  { emoji: "📦", label: "Otros", full: "📦 Otros" },
];

export default function QuickAddFAB({ addRow, selectedMonth }) {
  const [open, setOpen] = useState(false);
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [categoria, setCategoria] = useState("");
  const [success, setSuccess] = useState(false);
  const [shake, setShake] = useState(false);
  const conceptoRef = useRef(null);
  const panelRef = useRef(null);

  // Focus concepto input when panel opens
  useEffect(() => {
    if (open && conceptoRef.current) {
      // Small delay to let animation start
      setTimeout(() => conceptoRef.current?.focus(), 150);
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        handleClose();
      }
    };
    // Delay to avoid the FAB click itself closing it
    setTimeout(() => document.addEventListener("click", handler), 10);
    return () => document.removeEventListener("click", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const handleClose = () => {
    setOpen(false);
    setConcepto("");
    setMonto("");
    setCategoria("");
    setSuccess(false);
  };

  const handleSave = () => {
    if (!concepto.trim() || !monto) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    const fecha = todayISO();
    const result = addRow("variableExpenses", {
      concepto: concepto.trim(),
      monto: parseFloat(monto) || 0,
      fecha,
      month: dateToFinancialMonth(fecha) || selectedMonth,
      categoria: categoria || "",
    });

    if (result) {
      setSuccess(true);
      // Brief success state, then close
      setTimeout(() => {
        handleClose();
      }, 900);
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
      {/* Backdrop overlay */}
      {open && <div className="fab-backdrop" onClick={handleClose} />}

      {/* Quick-add panel */}
      {open && (
        <div
          ref={panelRef}
          className={`fab-panel ${shake ? "fab-panel--shake" : ""} ${success ? "fab-panel--success" : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
          {success ? (
            <div className="fab-success">
              <span className="fab-success__icon">✓</span>
              <span className="fab-success__text">
                {fmt(parseFloat(monto) || 0)} guardado
              </span>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="fab-panel__header">
                <span className="fab-panel__title">Gasto rápido</span>
                <button className="fab-panel__close" onClick={handleClose}>✕</button>
              </div>

              {/* Concepto */}
              <input
                ref={conceptoRef}
                className="fab-input fab-input--concepto"
                type="text"
                placeholder="¿En qué gastaste?"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={100}
                autoComplete="off"
              />

              {/* Monto — large & prominent */}
              <div className="fab-monto-wrap">
                <input
                  className="fab-input fab-input--monto"
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
                <span className="fab-monto-currency">€</span>
              </div>

              {/* Category chips */}
              <div className="fab-cats">
                {QUICK_CATEGORIES.map((c) => (
                  <button
                    key={c.full}
                    className={`fab-cat-chip ${categoria === c.full ? "fab-cat-chip--active" : ""}`}
                    onClick={() => setCategoria(categoria === c.full ? "" : c.full)}
                    type="button"
                  >
                    <span className="fab-cat-chip__emoji">{c.emoji}</span>
                    <span className="fab-cat-chip__label">{c.label}</span>
                  </button>
                ))}
              </div>

              {/* Save button */}
              <button
                className="fab-save"
                onClick={handleSave}
                disabled={!concepto.trim() || !monto}
              >
                {monto ? `Guardar ${fmt(parseFloat(monto) || 0)}` : "Guardar gasto"}
              </button>
            </>
          )}
        </div>
      )}

      {/* FAB button */}
      <button
        className={`fab-button ${open ? "fab-button--open" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          if (open) handleClose();
          else setOpen(true);
        }}
        title="Añadir gasto rápido"
        aria-label="Añadir gasto rápido"
      >
        <span className="fab-button__icon">{open ? "✕" : "+"}</span>
      </button>
    </>
  );
}
