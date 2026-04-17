// ══════════════════════════════════════════════
// 📱 Bottom-sheet de gasto rápido
// ══════════════════════════════════════════════
import { useState, useRef, useEffect } from "react";
import { fmt, todayISO } from "../../utils/format.js";
import { dateToFinancialMonth } from "../../utils/cycle.js";

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

export default function QuickAddSheet({ addRow, selectedMonth, onClose }) {
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [categoria, setCategoria] = useState("");
  const [fecha, setFecha] = useState(todayISO());
  const [dateChip, setDateChip] = useState("today"); // today | yesterday | custom
  const [success, setSuccess] = useState(false);
  const [shake, setShake] = useState(false);
  const amountRef = useRef(null);

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

    const result = addRow("variableExpenses", {
      concepto: concepto.trim(),
      monto: parseFloat(monto) || 0,
      fecha,
      month: dateToFinancialMonth(fecha) || selectedMonth,
      categoria: categoria || "",
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

            {/* Monto grande */}
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

            {/* Concepto */}
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

            {/* Fecha chips */}
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

            {/* Categorías */}
            <div className="cat-chips">
              {QUICK_CATEGORIES.map((c) => (
                <button
                  key={c.full}
                  className={`cat-chip ${categoria === c.full ? "cat-chip--active" : ""}`}
                  onClick={() => setCategoria(categoria === c.full ? "" : c.full)}
                >
                  <span className="cat-chip__emoji">{c.emoji}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>

            {/* Save */}
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
