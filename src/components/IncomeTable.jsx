import { useState } from "react";
import Section from "./Section.jsx";
import ActionButtons from "./shared/ActionButtons.jsx";
import { fmt, fmtDate, todayISO, formatMonthLabel } from "../utils/format.js";
import { dateToFinancialMonth } from "../utils/cycle.js";

export default function IncomeTable({ filteredIncomes, addRow, deleteRow, saveRowEdit, selectedMonth, setAddingTo, addingTo }) {
  const [newRow, setNewRow] = useState({});
  const [editingRow, setEditingRow] = useState(null);

  const total = filteredIncomes.reduce((s, i) => s + (i.amount || 0), 0);

  const startRowEdit = (_s, item) => setEditingRow({ id: item.id, fields: { ...item } });
  const cancelRowEdit = () => setEditingRow(null);
  const handleSaveRowEdit = () => {
    if (!editingRow) return;
    saveRowEdit("incomes", editingRow.id, editingRow.fields);
    setEditingRow(null);
  };
  const isRowEditing = (id) => editingRow?.id === id;
  const rowField = (field) => editingRow?.fields?.[field] ?? "";
  const setRowField = (field, val) =>
    setEditingRow((prev) => prev ? { ...prev, fields: { ...prev.fields, [field]: val } } : prev);

  const handleAdd = () => {
    setAddingTo("incomes");
    setNewRow({ concepto: "", amount: "", fecha: todayISO() });
  };

  const handleSaveNew = () => {
    const success = addRow("incomes", {
      concepto: newRow.concepto,
      amount: parseFloat(newRow.amount) || 0,
      fecha: newRow.fecha,
      month: dateToFinancialMonth(newRow.fecha) || selectedMonth,
    });
    if (success) setAddingTo(null);
  };

  return (
    <Section title={`💰 Ingresos — ${formatMonthLabel(selectedMonth)}`} onAdd={handleAdd}>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr><th>Concepto</th><th>Monto</th><th>Fecha</th><th style={{ width: 70 }}></th></tr>
          </thead>
          <tbody>
            {filteredIncomes.map((i) => {
              const re = isRowEditing(i.id);
              return (
                <tr key={i.id} className={re ? "row-editing" : ""}>
                  <td>{re ? <input className="row-input" value={rowField("concepto")} onChange={(e) => setRowField("concepto", e.target.value)} maxLength={100} /> : i.concepto}</td>
                  <td className="mono" style={{ fontWeight: 600, color: "#16a34a" }}>
                    {re ? <input className="row-input" type="number" value={rowField("amount")} onChange={(e) => setRowField("amount", parseFloat(e.target.value) || 0)} /> : fmt(i.amount)}
                  </td>
                  <td>{re ? <input className="row-input" type="date" value={rowField("fecha")} onChange={(e) => setRowField("fecha", e.target.value)} /> : fmtDate(i.fecha)}</td>
                  <td>
                    <ActionButtons
                      section="incomes" id={i.id} item={i}
                      isEditing={re}
                      onStartEdit={startRowEdit}
                      onSaveEdit={handleSaveRowEdit}
                      onCancelEdit={cancelRowEdit}
                      onDelete={() => deleteRow("incomes", i.id)}
                    />
                  </td>
                </tr>
              );
            })}
            {addingTo === "incomes" && (
              <tr className="row-adding">
                <td><input className="row-input" placeholder="Concepto" value={newRow.concepto || ""} onChange={(e) => setNewRow({ ...newRow, concepto: e.target.value })} maxLength={100} /></td>
                <td><input className="row-input" type="number" placeholder="0" value={newRow.amount || ""} onChange={(e) => setNewRow({ ...newRow, amount: e.target.value })} min="0" max="99999999" /></td>
                <td><input className="row-input" type="date" value={newRow.fecha || ""} onChange={(e) => setNewRow({ ...newRow, fecha: e.target.value })} /></td>
                <td><button className="btn-ok" onClick={handleSaveNew}>✓</button></td>
              </tr>
            )}
            {filteredIncomes.length === 0 && addingTo !== "incomes" && (
              <tr><td colSpan={4} className="empty-row">Sin ingresos este ciclo</td></tr>
            )}
          </tbody>
          {filteredIncomes.length > 0 && (
            <tfoot>
              <tr className="footer-total--income" style={{ fontWeight: 700 }}>
                <td style={{ textAlign: "right" }}>TOTAL</td>
                <td className="mono" style={{ color: "#16a34a" }}>{fmt(total)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </Section>
  );
}
