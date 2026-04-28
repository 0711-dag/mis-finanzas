// ══════════════════════════════════════════════
// 🛒 Gastos variables
// v2: categoría referenciada por categoryId en data.categories.
// ══════════════════════════════════════════════
import { useState } from "react";
import Section from "./Section.jsx";
import ActionButtons from "./shared/ActionButtons.jsx";
import BudgetPanel from "./BudgetPanel.jsx";
import CategoryManager from "./CategoryManager.jsx";
import useCategories from "../hooks/useCategories.js";
import { fmt, fmtDate, todayISO, formatMonthLabel } from "../utils/format.js";
import { dateToFinancialMonth } from "../utils/cycle.js";
import { calcBudgetUsage } from "../utils/finance.js";
import { buildCategoryLabel } from "../utils/categoryDefaults.js";

export default function VariableExpenses({
  filteredVarExpenses,
  addRow,
  deleteRow,
  saveRowEdit,
  selectedMonth,
  setAddingTo,
  addingTo,
  mobileMode,
  data,
  addOrUpdateBudget,
  removeBudget,
  copyBudgetsFromPrevCycle,
  getPrevCycle,
  addCategory,
  updateCategory,
  deleteCategory,
}) {
  const [newRow, setNewRow] = useState({});
  const [editingRow, setEditingRow] = useState(null);
  const [showBudget, setShowBudget] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  const total = filteredVarExpenses.reduce((s, v) => s + (v.monto || 0), 0);

  // 🆕 v2
  const { items, findById } = useCategories("variable", data?.categories, data?.customCategories);

  const canManageCategories = typeof addCategory === "function";

  // Estado del presupuesto global (chip en cabecera). Pasamos categories al cálculo.
  const budgets = data?.budgets || [];
  const usage = calcBudgetUsage(
    budgets,
    data?.variableExpenses || [],
    selectedMonth,
    data?.categories || []
  );
  const hayPresupuesto = usage.totalPresupuestado > 0;

  // 🛠️ FIX (chip): el porcentaje del chip debe medirse SOLO con el gasto
  // de las categorías que tienen presupuesto definido. `usage.totalGastado`
  // suma todo el gasto variable del ciclo (incluido el de categorías sin
  // presupuesto), lo que hacía que apareciera "309% usado" cuando había
  // gasto en categorías no presupuestadas.
  //
  // Recalculamos aquí solo a efectos del chip, sin tocar `calcBudgetUsage`
  // (lo siguen consumiendo el panel y el informe sin cambios).
  const gastadoEnPresupuestos = usage.categorias
    .filter((c) => c.presupuestado > 0)
    .reduce((s, c) => s + (Number(c.gastado) || 0), 0);

  const pctGlobal = hayPresupuesto
    ? (gastadoEnPresupuestos / usage.totalPresupuestado) * 100
    : 0;

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
    const catObj = findById(editingRow.fields.categoryId);
    const fields = {
      ...editingRow.fields,
      categoria: catObj ? buildCategoryLabel(catObj) : (editingRow.fields.categoria || ""),
    };
    saveRowEdit("variableExpenses", editingRow.id, fields);
    setEditingRow(null);
  };
  const isRowEditing = (id) => editingRow?.id === id;
  const rowField = (field) => editingRow?.fields?.[field] ?? "";
  const setRowField = (field, val) =>
    setEditingRow((prev) => prev ? { ...prev, fields: { ...prev.fields, [field]: val } } : prev);

  const handleAdd = () => {
    setAddingTo("variableExpenses");
    setNewRow({ concepto: "", monto: "", fecha: todayISO(), categoryId: "" });
  };

  const handleSaveNew = () => {
    const catObj = findById(newRow.categoryId);
    const success = addRow("variableExpenses", {
      concepto: newRow.concepto,
      monto: parseFloat(newRow.monto) || 0,
      fecha: newRow.fecha,
      month: dateToFinancialMonth(newRow.fecha) || selectedMonth,
      categoryId: newRow.categoryId || "",
      categoria: catObj ? buildCategoryLabel(catObj) : "",
    });
    if (success) setAddingTo(null);
  };

  const CategorySelector = ({ value, onChange }) => (
    <div style={{ display: "flex", gap: 6 }}>
      <select
        className="sheet-input"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={{ flex: 1 }}
      >
        <option value="">— Categoría —</option>
        {items.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
      {canManageCategories && (
        <button
          type="button"
          onClick={() => setShowCategoryManager(true)}
          title="Gestionar categorías"
          style={{
            padding: "0 12px",
            background: "var(--bg-surface)",
            border: "1.5px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            fontSize: 14,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          ⚙️
        </button>
      )}
    </div>
  );

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

      <CategorySelector
        value={newRow.categoryId}
        onChange={(v) => setNewRow({ ...newRow, categoryId: v })}
      />

      <button className="btn-primary btn-primary--accent" onClick={handleSaveNew} style={{ marginTop: 4 }}>
        Añadir gasto
      </button>
    </div>
  );

  // Helper: display de categoría en la fila (emoji + nombre actualizados)
  const getDisplayCat = (v) => {
    const cat = findById(v.categoryId);
    if (cat) return { emoji: cat.emoji || "📦", text: cat.nombre };
    if (v.categoria) {
      return {
        emoji: v.categoria.split(" ")[0] || "📦",
        text: v.categoria.replace(/^[^\s]+\s/, "") || "Sin categoría",
      };
    }
    return { emoji: "📦", text: "Sin categoría" };
  };

  return (
    <Section title={`Gastos variables · ${formatMonthLabel(selectedMonth)}`} icon="🛒" onAdd={handleAdd} mobileMode={mobileMode}>
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
          fontSize: 12, fontWeight: 600,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          cursor: "pointer", textAlign: "left",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span>📊</span>
          <span>
            {hayPresupuesto
              ? `Presupuesto: ${fmt(gastadoEnPresupuestos)} / ${fmt(usage.totalPresupuestado)} (${pctGlobal.toFixed(0)}%)`
              : "Definir presupuesto"}
          </span>
        </span>
        <span style={{ fontSize: 14 }}>{showBudget ? "▲" : "▼"}</span>
      </button>

      {showBudget && addOrUpdateBudget && (
        <BudgetPanel
          budgets={budgets}
          variableExpenses={data?.variableExpenses || []}
          cycleMK={selectedMonth}
          addOrUpdateBudget={addOrUpdateBudget}
          removeBudget={removeBudget}
          copyBudgetsFromPrevCycle={copyBudgetsFromPrevCycle}
          getPrevCycle={getPrevCycle}
          // 🆕 v2: pasamos items (objetos) en vez de strings
          allCategoryItems={items}
          categories={data?.categories || []}
        />
      )}

      {addingTo === "variableExpenses" && AddForm}

      <div className="item-list">
        {filteredVarExpenses.map((v) => {
          const re = isRowEditing(v.id);
          const { emoji: catEmoji, text: catText } = getDisplayCat(v);

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

                <CategorySelector
                  value={rowField("categoryId")}
                  onChange={(v) => setRowField("categoryId", v)}
                />

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

      {showCategoryManager && canManageCategories && (
        <CategoryManager
          data={data}
          onAdd={addCategory}
          onUpdate={updateCategory}
          onDelete={deleteCategory}
          onClose={() => setShowCategoryManager(false)}
        />
      )}
    </Section>
  );
}
