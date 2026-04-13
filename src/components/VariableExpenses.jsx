import { useState } from "react";
import Section from "./Section.jsx";
import ActionButtons from "./shared/ActionButtons.jsx";
import { fmt, fmtDate, todayISO, formatMonthLabel } from "../utils/format.js";
import { dateToFinancialMonth } from "../utils/cycle.js";

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

export default function VariableExpenses({ filteredVarExpenses, addRow, deleteRow, saveRowEdit, selectedMonth, setAddingTo, addingTo }) {
  const [newRow, setNewRow] = useState({});
  const [editingRow, setEditingRow] = useState(null);

  const total = filteredVarExpenses.reduce((s, v) => s + (v.monto || 0), 0);

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

  const CategorySelect = ({ value, onChange }) => (
    <select className="row-input" value={value} onChange={onChange}>
      <option value="">— Categoría —</option>
      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
    </select>
  );

  return (
    <Section title={`🛒 Gastos Variables — ${formatMonthLabel(selectedMonth)}`} onAdd={handleAdd}>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr><th>Concepto</th><th>Monto</th><th>Categoría</th><th>Fecha</th><th style={{ width: 70 }}></th></tr>
          </thead>
          <tbody>
            {filteredVarExpenses.map((v) => {
              const re = isRowEditing(v.id);
              return (
                <tr key={v.id} className={re ? "row-editing" : ""}>
                  <td>{re ? <input className="row-input" value={rowField("concepto")} onChange={(e) => setRowField("concepto", e.target.value)} maxLength={100} /> : v.concepto}</td>
                  <td className="mono" style={{ fontWeight: 600, color: "#ea580c" }}>
                    {re ? <input className="row-input" type="number" value={rowField("monto")} onChange={(e) => setRowField("monto", parseFloat(e.target.value) || 0)} /> : fmt(v.monto)}
                  </td>
                  <td>{re ? <CategorySelect value={rowField("categoria")} onChange={(e) => setRowField("categoria", e.target.value)} /> : (v.categoria || "—")}</td>
                  <td>{re ? <input className="row-input" type="date" value={rowField("fecha")} onChange={(e) => setRowField("fecha", e.target.value)} /> : fmtDate(v.fecha)}</td>
                  <td>
                    <ActionButtons
                      section="variableExpenses" id={v.id} item={v}
                      isEditing={re}
                      onStartEdit={startRowEdit}
                      onSaveEdit={handleSaveRowEdit}
                      onCancelEdit={cancelRowEdit}
                      onDelete={() => deleteRow("variableExpenses", v.id)}
                    />
                  </td>
                </tr>
              );
            })}
            {addingTo === "variableExpenses" && (
              <tr className="row-adding">
                <td><input className="row-input" placeholder="Concepto" value={newRow.concepto || ""} onChange={(e) => setNewRow({ ...newRow, concepto: e.target.value })} maxLength={100} /></td>
                <td><input className="row-input" type="number" placeholder="0" value={newRow.monto || ""} onChange={(e) => setNewRow({ ...newRow, monto: e.target.value })} min="0" max="99999999" /></td>
                <td><CategorySelect value={newRow.categoria || ""} onChange={(e) => setNewRow({ ...newRow, categoria: e.target.value })} /></td>
                <td><input className="row-input" type="date" value={newRow.fecha || ""} onChange={(e) => setNewRow({ ...newRow, fecha: e.target.value })} /></td>
                <td><button className="btn-ok" onClick={handleSaveNew}>✓</button></td>
              </tr>
            )}
            {filteredVarExpenses.length === 0 && addingTo !== "variableExpenses" && (
              <tr><td colSpan={5} className="empty-row">Sin gastos variables este ciclo</td></tr>
            )}
          </tbody>
          {filteredVarExpenses.length > 0 && (
            <tfoot>
              <tr className="footer-total--expense" style={{ fontWeight: 700 }}>
                <td style={{ textAlign: "right" }}>TOTAL</td>
                <td className="mono" style={{ color: "#ea580c" }}>{fmt(total)}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </Section>
  );
}
