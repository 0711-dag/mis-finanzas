import { useState } from "react";
import Section from "./Section.jsx";
import ActionButtons from "./shared/ActionButtons.jsx";
import BudgetPanel from "./BudgetPanel.jsx";
import { fmt, fmtDate, todayISO, formatMonthLabel } from "../utils/format.js";
import { dateToFinancialMonth } from "../utils/cycle.js";
import { calcBudgetUsage } from "../utils/finance.js";

const CATEGORIES = [
  "🛒 Supermercado",
  "⛽ Transporte",
  "🏠 Hogar",
  "🍽️ Restaurantes",
  "👕 Ropa",
  "🏥 Salud",
  "🎉 Ocio",
  "📦 Otros",
];

export default function VariableExpenses({
  filteredVarExpenses,
  addRow,
  deleteRow,
  saveRowEdit,
  selectedMonth,
  setAddingTo,
  addingTo,
  mobileMode,
  // Nuevas props para presupuesto
  data,
  addOrUpdateBudget,
  removeBudget,
  copyBudgetsFromPrevCycle,
  getPrevCycle,
}) {
  const [newRow, setNewRow] = useState({});
  const [editingRow, setEditingRow] = useState(null);
  const [showBudget, setShowBudget] = useState(false);

  const total = filteredVarExpenses.reduce((s, v) => s + (v.monto || 0), 0);

  // Calcular estado del presupuesto global (para el chip de la cabecera)
  const budgets = data?.budgets || [];
  const usage = calcBudgetUsage(budgets, data?.variableExpenses || [], selectedMonth);
  const hayPresupuesto = usage.totalPresupuestado > 0;
  const pctGlobal = hayPresupuesto ? (usage.totalGastado / usage.totalPresupuestado) * 100 : 0;

  // Color del chip según estado global
  const chipColor = pctGlobal >= 100 ? "danger"
    : pctGlobal >= 80 ? "warning"
    : "success";

  const chipBg = {
    success: "var(--success-bg)",
    warning: "var(--warning-bg)",
    danger: "var(--danger-bg)",
  }[chipColor];

  const chipText = {
    success: "var(--success-text)",
    warning: "var(--warning-text)",
    danger: "var(--danger-text)",
  }[chipColor];

  const startRowEdit = (_s, item) => setEditingRow({ id: item.id, fields: { ...item } });
  const cancelRowEdit = () => setEditingRow(null);
  const handleSaveRowEdit = () => {
    if (!editingRow) return;
    saveRowEdit("variableExpenses", editingRow.id, editingRow.fields);
    setEditingRow(null);
  };
  const isRowEditing = (id) => editingRow?.id === id;
  const rowField = (field) => editingRow?.fields?.[field] ?? "";
  const setRowField = (field, val) =>
    setEditingRow((prev) => prev ? { ...prev, fields: { ...prev.fields, [field]: val } } : prev);

  const handleAdd = () => {
    setAddingTo("variableExpenses");
    setNewRow({ concepto: "", monto: "", fecha: todayISO(), categoria: "" });
  };

  const handleSaveNew = () => {
    const success = addRow("variableExpenses", {
      concepto: newRow.concepto,
      monto: parseFloat(newRow.monto) || 0,
      fecha: newRow.fecha,
      month: dateToFinancialMonth(newRow.fecha) || selectedMonth,
      categoria: newRow.categoria || "",
    });
    if (success) setAddingTo(null);
  };

  const AddForm = (
    <div style={{
      background: "var(--bg-subtle)",
      borderRadius: "var(--radius-md)",
      padding: 14, marginBottom: 10,
      border: "1.5px solid var(--accent)",
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10 }}>
        Nuevo gasto variable
      </div>
      <input className="sheet-input" placeholder="Concepto" value={newRow.concepto || ""} onChange={(e) => setNewRow({ ...newRow, concepto: e.target.value })} maxLength={100} />
      <div style={{ display: "flex", gap: 6 }}>
        <input className="sheet-input" type="number" placeholder="Monto €" value={newRow.monto || ""} onChange={(e) => setNewRow({ ...newRow, monto: e.target.value })} style={{ flex: 1 }} />
        <input className="sheet-input" type="date" value={newRow.fecha || ""} onChange={(e) => setNewRow({ ...newRow, fecha: e.target.value })} style={{ flex: 1, colorScheme: "light dark" }} />
      </div>
      <select className="sheet-input" value={newRow.categoria || ""} onChange={(e) => setNewRow({ ...newRow, categoria: e.target.value })}>
        <option value="">— Categoría —</option>
        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <button className="btn-primary btn-primary--accent" onClick={handleSaveNew} style={{ marginTop: 4 }}>
        Añadir gasto
      </button>
    </div>
  );

  return (
    <Section title={`Gastos variables · ${formatMonthLabel(selectedMonth)}`} icon="🛒" onAdd={handleAdd} mobileMode={mobileMode}>
      {/* Toggle de presupuesto: botón siempre visible con resumen si existe */}
      <button
        onClick={() => setShowBudget(!showBudget)}
        style={{
          width: "100%",
          padding: "10px 12px",
          marginBottom: 10,
          background: hayPresupuesto ? chipBg : "var(--bg-subtle)",
          color: hayPresupuesto ? chipText : "var(--text-secondary)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          fontSize: 12,
          fontWeight: 600,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span>📊</span>
          <span>
            {hayPresupuesto
              ? `Presupuesto: ${fmt(usage.totalGastado)} / ${fmt(usage.totalPresupuestado)} (${pctGlobal.toFixed(0)}%)`
              : "Definir presupuesto"}
          </span>
        </span>
        <span style={{ fontSize: 14 }}>
          {showBudget ? "▲" : "▼"}
        </span>
      </button>

      {/* Panel de presupuesto desplegable */}
      {showBudget && addOrUpdateBudget && (
        <BudgetPanel
          budgets={budgets}
          variableExpenses={data?.variableExpenses || []}
          cycleMK={selectedMonth}
          addOrUpdateBudget={addOrUpdateBudget}
          removeBudget={removeBudget}
          copyBudgetsFromPrevCycle={copyBudgetsFromPrevCycle}
          getPrevCycle={getPrevCycle}
        />
      )}

      {addingTo === "variableExpenses" && AddForm}

      <div className="item-list">
        {filteredVarExpenses.map((v) => {
          const re = isRowEditing(v.id);
          const catEmoji = v.categoria?.split(" ")[0] || "📦";
          const catText = v.categoria?.replace(/^[^\s]+\s/, "") || "Sin categoría";

          if (re) {
            return (
              <div key={v.id} style={{
                background: "var(--bg-subtle)", borderRadius: "var(--radius-md)",
                padding: 12, border: "1.5px solid var(--accent)",
                display: "flex", flexDirection: "column", gap: 6,
              }}>
                <input className="sheet-input" value={rowField("concepto")} onChange={(e) => setRowField("concepto", e.target.value)} maxLength={100} />
                <div style={{ display: "flex", gap: 6 }}>
                  <input className="sheet-input" type="number" value={rowField("monto")} onChange={(e) => setRowField("monto", parseFloat(e.target.value) || 0)} style={{ flex: 1 }} />
                  <input className="sheet-input" type="date" value={rowField("fecha")} onChange={(e) => setRowField("fecha", e.target.value)} style={{ flex: 1, colorScheme: "light dark" }} />
                </div>
                <select className="sheet-input" value={rowField("categoria")} onChange={(e) => setRowField("categoria", e.target.value)}>
                  <option value="">— Categoría —</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn-primary btn-primary--accent" onClick={handleSaveRowEdit} style={{ flex: 1 }}>Guardar</button>
                  <button className="btn-secondary" onClick={cancelRowEdit}>Cancelar</button>
                </div>
              </div>
            );
          }

          return (
            <div key={v.id} className="item">
              <div className="item__icon">{catEmoji}</div>
              <div className="item__body">
                <div className="item__title">{v.concepto}</div>
                <div className="item__subtitle">{fmtDate(v.fecha)} · {catText}</div>
              </div>
              <div className="item__right">
                <div className="item__amount item__amount--neg">−{fmt(v.monto).replace("−", "").replace("-", "")}</div>
                <div style={{ display: "flex", gap: 2, marginTop: 4, justifyContent: "flex-end" }}>
                  <ActionButtons
                    section="variableExpenses" id={v.id} item={v}
                    isEditing={false}
                    onStartEdit={startRowEdit}
                    onSaveEdit={handleSaveRowEdit}
                    onCancelEdit={cancelRowEdit}
                    onDelete={() => deleteRow("variableExpenses", v.id)}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {filteredVarExpenses.length === 0 && addingTo !== "variableExpenses" && (
          <div className="empty">
            <div className="empty__emoji">🛒</div>
            <div className="empty__title">Sin gastos este ciclo</div>
            <div className="empty__subtitle">Usa el botón + o el FAB para añadir</div>
          </div>
        )}
      </div>

      {filteredVarExpenses.length > 0 && (
        <div style={{
          padding: "10px 14px", marginTop: 6,
          background: "var(--bg-subtle)", borderRadius: "var(--radius-md)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5 }}>Total</span>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--category-expense)" }}>{fmt(total)}</div>
        </div>
      )}
    </Section>
  );
}
