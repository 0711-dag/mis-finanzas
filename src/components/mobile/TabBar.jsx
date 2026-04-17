// ══════════════════════════════════════════════
// 📱 Tab bar inferior móvil con FAB central
// ══════════════════════════════════════════════

const TABS = [
  { id: "home", icon: "📊", label: "Resumen" },
  { id: "payments", icon: "📅", label: "Pagos" },
  { id: "debts", icon: "💳", label: "Deudas" },
  { id: "more", icon: "⚙️", label: "Más" },
];

export default function TabBar({ active, onChange, onAddClick }) {
  return (
    <nav className="tab-bar">
      <button
        className={`tab-item ${active === "home" ? "tab-item--active" : ""}`}
        onClick={() => onChange("home")}
      >
        <span className="tab-item__icon">📊</span>
        <span className="tab-item__label">Resumen</span>
      </button>

      <button
        className={`tab-item ${active === "payments" ? "tab-item--active" : ""}`}
        onClick={() => onChange("payments")}
      >
        <span className="tab-item__icon">📅</span>
        <span className="tab-item__label">Pagos</span>
      </button>

      {/* FAB central */}
      <button
        className="tab-fab"
        onClick={onAddClick}
        aria-label="Añadir gasto rápido"
      >
        +
      </button>

      <button
        className={`tab-item ${active === "debts" ? "tab-item--active" : ""}`}
        onClick={() => onChange("debts")}
      >
        <span className="tab-item__icon">💳</span>
        <span className="tab-item__label">Deudas</span>
      </button>

      <button
        className={`tab-item ${active === "more" ? "tab-item--active" : ""}`}
        onClick={() => onChange("more")}
      >
        <span className="tab-item__icon">⚙️</span>
        <span className="tab-item__label">Más</span>
      </button>
    </nav>
  );
}
