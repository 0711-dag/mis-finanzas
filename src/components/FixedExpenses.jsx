import { useState } from "react";
import Section from "./Section.jsx";
import ActionButtons from "./shared/ActionButtons.jsx";
import CategoryManager from "./CategoryManager.jsx";
import useCategories from "../hooks/useCategories.js";
import { fmt } from "../utils/format.js";

export default function FixedExpenses({
  data,
  addRow,
  deleteRow,
  saveRowEdit,
  toggleRecurrente,
  setAddingTo,
  addingTo,
  mobileMode,
  // CRUD de categorías custom (opcional: si no llega, se oculta el botón de gestión)
  addCategory,
  updateCategory,
  deleteCategory,
}) {
  const [newRow, setNewRow] = useState({});
  const [editingRow, setEditingRow] = useState(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  const expenses = data.fixedExpenses || [];
  const total = expenses.reduce((s, f) => s + (f.monto || 0), 0);
  const totalRecurrente = expenses.filter((f) => f.recurrente).reduce((s, f) => s + (f.monto || 0), 0);

  // Lista unificada de categorías (defaults + custom del usuario)
  const { categories } = useCategories("fixed", data.customCategories);

  // Indica si están disponibles las funciones de gestión (para enseñar el botón)
  const canManageCategories = typeof addCategory === "function";

  // Gastos fijos sin clasificar (para el aviso al usuario)
  const sinClasificar = expenses.filter((f) => !f.categoria).length;

  const startRowEdit = (_s, item) => setEditingRow({ id: item.id, fields: { ...item } });
  const cancelRowEdit = () => setEditingRow(null);
  const handleSaveRowEdit = () => {
    if (!editingRow) return;
    saveRowEdit("fixedExpenses", editingRow.id, editingRow.fields);
    setEditingRow(null);
  };
  const isRowEditing = (id) => editingRow?.id === id;
  const rowField = (field) => editingRow?.fields?.[field] ?? "";
  const setRowField = (field, val) =>
    setEditingRow((prev) => prev ? { ...prev, fields: { ...prev.fields, [field]: val } } : prev);

  const handleAdd = () => {
    setAddingTo("fixedExpenses");
    setNewRow({ concepto: "", diaPago: "", monto: "", recurrente: true, categoria: "" });
  };

  const handleSaveNew = () => {
    const success = addRow("fixedExpenses", {
      concepto: newRow.concepto,
      diaPago: newRow.diaPago,
      monto: parseFloat(newRow.monto) || 0,
      recurrente: !!newRow.recurrente,
      categoria: newRow.categoria || "",
    });
    if (success) setAddingTo(null);
  };

  // Fila del selector de categoría + botón de gestión
  const CategorySelector = ({ value, onChange }) => (
    <div style={{ display: "flex", gap: 6 }}>
      <select
        className="sheet-input"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={{ flex: 1 }}
      >
        <option value="">— Categoría —</option>
        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
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
        Nuevo gasto fijo
      </div>
      <input className="sheet-input" placeholder="Concepto (ej: Luz, Alquiler)" value={newRow.concepto || ""} onChange={(e) => setNewRow({ ...newRow, concepto: e.target.value })} maxLength={100} />
      <div style={{ display: "flex", gap: 6 }}>
        <input className="sheet-input" placeholder={newRow.recurrente ? "Día (1-31)" : "Ej: 1, 15..."} value={newRow.diaPago || ""} onChange={(e) => setNewRow({ ...newRow, diaPago: e.target.value })} maxLength={10} style={{ flex: 1 }} />
        <input className="sheet-input" type="number" placeholder="Monto €" value={newRow.monto || ""} onChange={(e) => setNewRow({ ...newRow, monto: e.target.value })} style={{ flex: 1 }} />
      </div>

      <CategorySelector
        value={newRow.categoria}
        onChange={(v) => setNewRow({ ...newRow, categoria: v })}
      />

      <label style={{
        display: "flex", alignItems: "center", gap: 8, padding: "6px 0",
        fontSize: 12, color: "var(--text-secondary)", cursor: "pointer",
      }}>
        <button
          type="button"
          className={`toggle ${newRow.recurrente ? "toggle--on" : ""}`}
          onClick={() => setNewRow({ ...newRow, recurrente: !newRow.recurrente })}
        >
          <div className="toggle__knob" />
        </button>
        <span style={{ fontWeight: 600 }}>Generar pago automático cada ciclo</span>
      </label>

      <button className="btn-primary btn-primary--accent" onClick={handleSaveNew} style={{ marginTop: 4 }}>
        Crear gasto fijo
      </button>
    </div>
  );

  return (
    <Section title="Gastos fijos" icon="🏠" onAdd={handleAdd} mobileMode={mobileMode}>
      {/* Aviso de gastos sin categoría */}
      {sinClasificar > 0 && (
        <div style={{
          padding: "8px 12px", marginBottom: 10,
          background: "var(--warning-bg)",
          borderRadius: "var(--radius-md)",
          fontSize: 11, color: "var(--warning-text)",
          fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
        }}>
          ⚠️ {sinClasificar} {sinClasificar === 1 ? "gasto sin clasificar" : "gastos sin clasificar"} · edítalos para asignar categoría
        </div>
      )}

      {expenses.some((f) => f.recurrente) && (
        <div style={{
          padding: "8px 12px", marginBottom: 10,
          background: "var(--category-recurring-bg)",
          borderRadius: "var(--radius-md)",
          fontSize: 11, color: "var(--category-recurring)",
          fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
        }}>
          🔄 {expenses.filter((f) => f.recurrente).length} gastos automáticos · {fmt(totalRecurrente)}/ciclo
        </div>
      )}

      {addingTo === "fixedExpenses" && AddForm}

      <div className="item-list">
        {expenses.map((f) => {
          const re = isRowEditing(f.id);
          const isRec = !!f.recurrente;
          const dayValid = !isNaN(parseInt(f.diaPago)) && parseInt(f.diaPago) >= 1 && parseInt(f.diaPago) <= 31;
          // Emoji de la categoría (primer caracter) si existe
          const catEmoji = f.categoria ? f.categoria.split(" ")[0] : null;
          const catText = f.categoria ? f.categoria.replace(/^[^\s]+\s/, "") : null;

          if (re) {
            return (
              <div key={f.id} style={{
                background: "var(--bg-subtle)", borderRadius: "var(--radius-md)",
                padding: 12, border: "1.5px solid var(--accent)",
                display: "flex", flexDirection: "column", gap: 6,
              }}>
                <input
                  className="sheet-input"
                  value={rowField("concepto")}
                  onChange={(e) => setRowField("concepto", e.target.value)}
                  maxLength={100}
                />
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    className="sheet-input"
                    placeholder="Día (1-31)"
                    value={rowField("diaPago")}
                    onChange={(e) => setRowField("diaPago", e.target.value)}
                    maxLength={10}
                    style={{ flex: 1 }}
                  />
                  <input
                    className="sheet-input"
                    type="number"
                    value={rowField("monto")}
                    onChange={(e) => setRowField("monto", parseFloat(e.target.value) || 0)}
                    style={{ flex: 1 }}
                  />
                </div>

                <CategorySelector
                  value={rowField("categoria")}
                  onChange={(v) => setRowField("categoria", v)}
                />

                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-secondary)" }}>
                  <button
                    type="button"
                    className={`toggle ${rowField("recurrente") ? "toggle--on" : ""}`}
                    onClick={() => setRowField("recurrente", !rowField("recurrente"))}
                  >
                    <div className="toggle__knob" />
                  </button>
                  <span style={{ fontWeight: 600 }}>Automático cada ciclo</span>
                </label>

                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn-primary btn-primary--accent" onClick={handleSaveRowEdit} style={{ flex: 1 }}>
                    Guardar
                  </button>
                  <button className="btn-secondary" onClick={cancelRowEdit}>
                    Cancelar
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div key={f.id} className="item">
              <div className={`item__icon ${isRec ? "item__icon--recurring" : ""}`}>
                {catEmoji || (isRec ? "🔄" : "🏠")}
              </div>
              <div className="item__body">
                <div className="item__title">{f.concepto}</div>
                <div className="item__subtitle">
                  Día {f.diaPago}
                  {catText && <span style={{ marginLeft: 6 }}>· {catText}</span>}
                  {!f.categoria && <span style={{ color: "var(--warning)", marginLeft: 6 }}>· Sin categoría</span>}
                  {isRec && !dayValid && <span style={{ color: "var(--danger)", marginLeft: 6 }}>⚠️ Ajusta día (1-31)</span>}
                  {isRec && dayValid && <span style={{ color: "var(--category-recurring)", marginLeft: 6 }}>· Auto</span>}
                </div>
              </div>
              <div className="item__right">
                <div className="item__amount">{fmt(f.monto)}</div>
                <div style={{ display: "flex", gap: 4, marginTop: 4, justifyContent: "flex-end", alignItems: "center" }}>
                  <button
                    type="button"
                    className={`toggle ${isRec ? "toggle--on" : ""}`}
                    onClick={() => toggleRecurrente(f.id)}
                    title={isRec ? "Desactivar auto" : "Activar auto"}
                    style={{ transform: "scale(0.8)", transformOrigin: "right" }}
                  >
                    <div className="toggle__knob" />
                  </button>
                  <ActionButtons
                    section="fixedExpenses" id={f.id} item={f}
                    isEditing={false}
                    onStartEdit={startRowEdit}
                    onSaveEdit={handleSaveRowEdit}
                    onCancelEdit={cancelRowEdit}
                    onDelete={() => deleteRow("fixedExpenses", f.id)}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {expenses.length === 0 && addingTo !== "fixedExpenses" && (
          <div className="empty">
            <div className="empty__emoji">🏠</div>
            <div className="empty__title">Sin gastos fijos</div>
            <div className="empty__subtitle">Añade luz, alquiler, seguros, etc.</div>
          </div>
        )}
      </div>

      {expenses.length > 0 && (
        <div style={{
          padding: "10px 14px", marginTop: 6,
          background: "var(--bg-subtle)", borderRadius: "var(--radius-md)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5 }}>Total mensual</span>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{fmt(total)}</div>
        </div>
      )}

      {/* Modal de gestión de categorías */}
      {showCategoryManager && canManageCategories && (
        <CategoryManager
          tipo="fixed"
          customCategories={data.customCategories}
          onAdd={addCategory}
          onUpdate={updateCategory}
          onDelete={deleteCategory}
          onClose={() => setShowCategoryManager(false)}
        />
      )}
    </Section>
  );
}
