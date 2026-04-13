import { useState } from "react";
import Section from "./Section.jsx";
import ActionButtons from "./shared/ActionButtons.jsx";
import { fmt } from "../utils/format.js";

export default function FixedExpenses({ data, addRow, deleteRow, saveRowEdit, setAddingTo, addingTo }) {
  const [newRow, setNewRow] = useState({});
  const [editingRow, setEditingRow] = useState(null);

  const expenses = data.fixedExpenses || [];
  const total = expenses.reduce((s, f) => s + (f.monto || 0), 0);

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
    setNewRow({ concepto: "", diaPago: "", monto: "" });
  };

  const handleSaveNew = () => {
    const success = addRow("fixedExpenses", {
      concepto: newRow.concepto,
      diaPago: newRow.diaPago,
      monto: parseFloat(newRow.monto) || 0,
    });
    if (success) setAddingTo(null);
  };

  return (
    <Section title="🏠 Gastos Fijos" onAdd={handleAdd}>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr><th>Concepto</th><th>Día de pago</th><th>Monto aprox.</th><th style={{ width: 70 }}></th></tr>
          </thead>
          <tbody>
            {expenses.map((f) => {
              const re = isRowEditing(f.id);
              return (
                <tr key={f.id} className={re ? "row-editing" : ""}>
                  <td>{re ? <input className="row-input" value={rowField("concepto")} onChange={(e) => setRowField("concepto", e.target.value)} maxLength={100} /> : f.concepto}</td>
                  <td>{re ? <input className="row-input" value={rowField("diaPago")} onChange={(e) => setRowField("diaPago", e.target.value)} maxLength={10} /> : f.diaPago}</td>
                  <td className="mono">{re ? <input className="row-input" type="number" value={rowField("monto")} onChange={(e) => setRowField("monto", parseFloat(e.target.value) || 0)} /> : fmt(f.monto)}</td>
                  <td>
                    <ActionButtons
                      section="fixedExpenses" id={f.id} item={f}
                      isEditing={re}
                      onStartEdit={startRowEdit}
                      onSaveEdit={handleSaveRowEdit}
                      onCancelEdit={cancelRowEdit}
                      onDelete={() => deleteRow("fixedExpenses", f.id)}
                    />
                  </td>
                </tr>
              );
            })}
            {addingTo === "fixedExpenses" && (
              <tr className="row-adding">
                <td><input className="row-input" placeholder="Concepto" value={newRow.concepto || ""} onChange={(e) => setNewRow({ ...newRow, concepto: e.target.value })} maxLength={100} /></td>
                <td><input className="row-input" placeholder="Ej: 1, 15..." value={newRow.diaPago || ""} onChange={(e) => setNewRow({ ...newRow, diaPago: e.target.value })} maxLength={10} /></td>
                <td><input className="row-input" type="number" placeholder="0" value={newRow.monto || ""} onChange={(e) => setNewRow({ ...newRow, monto: e.target.value })} min="0" max="99999999" /></td>
                <td><button className="btn-ok" onClick={handleSaveNew}>✓</button></td>
              </tr>
            )}
            {expenses.length === 0 && addingTo !== "fixedExpenses" && (
              <tr><td colSpan={4} className="empty-row">Sin gastos fijos</td></tr>
            )}
          </tbody>
          {expenses.length > 0 && (
            <tfoot>
              <tr className="footer-total">
                <td style={{ textAlign: "right" }}>TOTAL</td>
                <td></td>
                <td className="mono">{fmt(total)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </Section>
  );
}
