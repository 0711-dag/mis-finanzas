import { useState } from "react";
import Section from "./Section.jsx";
import ActionButtons from "./shared/ActionButtons.jsx";
import { fmt } from "../utils/format.js";

export default function FixedExpenses({ data, addRow, deleteRow, saveRowEdit, toggleRecurrente, setAddingTo, addingTo }) {
  const [newRow, setNewRow] = useState({});
  const [editingRow, setEditingRow] = useState(null);

  const expenses = data.fixedExpenses || [];
  const total = expenses.reduce((s, f) => s + (f.monto || 0), 0);
  const totalRecurrente = expenses.filter((f) => f.recurrente).reduce((s, f) => s + (f.monto || 0), 0);

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
    setNewRow({ concepto: "", diaPago: "", monto: "", recurrente: true });
  };

  const handleSaveNew = () => {
    const success = addRow("fixedExpenses", {
      concepto: newRow.concepto,
      diaPago: newRow.diaPago,
      monto: parseFloat(newRow.monto) || 0,
      recurrente: !!newRow.recurrente,
    });
    if (success) setAddingTo(null);
  };

  return (
    <Section title="🏠 Gastos Fijos" onAdd={handleAdd}>
      {/* Indicador de recurrentes */}
      {expenses.some((f) => f.recurrente) && (
        <div style={{
          padding: "6px 12px",
          background: "#eef2ff",
          borderBottom: "1px solid #c7d2fe",
          fontSize: 11,
          color: "#4338ca",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}>
          <span>🔄</span>
          <span>
            <strong>{expenses.filter((f) => f.recurrente).length}</strong> gasto(s) se añaden automáticamente al calendario cada ciclo
            {totalRecurrente > 0 && <span style={{ marginLeft: 4 }}>({fmt(totalRecurrente)}/mes)</span>}
          </span>
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Concepto</th>
              <th>Día pago</th>
              <th>Monto aprox.</th>
              <th style={{ width: 60, textAlign: "center" }}>Auto</th>
              <th style={{ width: 70 }}></th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((f) => {
              const re = isRowEditing(f.id);
              const isRecurrente = !!f.recurrente;
              const dayValid = !isNaN(parseInt(f.diaPago)) && parseInt(f.diaPago) >= 1 && parseInt(f.diaPago) <= 31;

              return (
                <tr key={f.id} className={re ? "row-editing" : ""} style={!re && isRecurrente ? { background: "#faf5ff" } : {}}>
                  <td>
                    {re ? (
                      <input className="row-input" value={rowField("concepto")} onChange={(e) => setRowField("concepto", e.target.value)} maxLength={100} />
                    ) : (
                      <div>
                        <span>{f.concepto}</span>
                        {isRecurrente && (
                          <div style={{ fontSize: 10, color: "#7c3aed", fontWeight: 600, marginTop: 1 }}>
                            🔄 Se genera cada ciclo
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td>
                    {re ? (
                      <input
                        className="row-input"
                        value={rowField("diaPago")}
                        onChange={(e) => setRowField("diaPago", e.target.value)}
                        maxLength={10}
                        placeholder={rowField("recurrente") ? "1-31" : "Ej: 1, 15..."}
                      />
                    ) : (
                      <span>
                        {f.diaPago}
                        {isRecurrente && !dayValid && (
                          <span style={{ fontSize: 10, color: "#dc2626", display: "block" }}>⚠️ Pon un día (1-31)</span>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="mono">
                    {re ? (
                      <input className="row-input" type="number" value={rowField("monto")} onChange={(e) => setRowField("monto", parseFloat(e.target.value) || 0)} />
                    ) : (
                      fmt(f.monto)
                    )}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {re ? (
                      <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={!!rowField("recurrente")}
                          onChange={(e) => setRowField("recurrente", e.target.checked)}
                          style={{ width: 16, height: 16, accentColor: "#7c3aed", cursor: "pointer" }}
                        />
                      </label>
                    ) : (
                      <button
                        onClick={() => toggleRecurrente(f.id)}
                        title={isRecurrente ? "Desactivar pago automático" : "Activar pago automático cada ciclo"}
                        style={{
                          background: isRecurrente ? "#7c3aed" : "#e5e7eb",
                          border: "none",
                          borderRadius: 12,
                          width: 38,
                          height: 20,
                          position: "relative",
                          cursor: "pointer",
                          transition: "background .2s",
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            top: 2,
                            left: isRecurrente ? 20 : 2,
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            background: "#fff",
                            transition: "left .2s",
                            boxShadow: "0 1px 3px rgba(0,0,0,.2)",
                          }}
                        />
                      </button>
                    )}
                  </td>
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
                <td>
                  <input className="row-input" placeholder="Concepto" value={newRow.concepto || ""} onChange={(e) => setNewRow({ ...newRow, concepto: e.target.value })} maxLength={100} />
                </td>
                <td>
                  <input
                    className="row-input"
                    placeholder={newRow.recurrente ? "Día (1-31)" : "Ej: 1, 15..."}
                    value={newRow.diaPago || ""}
                    onChange={(e) => setNewRow({ ...newRow, diaPago: e.target.value })}
                    maxLength={10}
                  />
                </td>
                <td>
                  <input className="row-input" type="number" placeholder="0" value={newRow.monto || ""} onChange={(e) => setNewRow({ ...newRow, monto: e.target.value })} min="0" max="99999999" />
                </td>
                <td style={{ textAlign: "center" }}>
                  <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, cursor: "pointer", fontSize: 10, color: "#6b7280" }}>
                    <input
                      type="checkbox"
                      checked={!!newRow.recurrente}
                      onChange={(e) => setNewRow({ ...newRow, recurrente: e.target.checked })}
                      style={{ width: 16, height: 16, accentColor: "#7c3aed", cursor: "pointer" }}
                    />
                    🔄
                  </label>
                </td>
                <td><button className="btn-ok" onClick={handleSaveNew}>✓</button></td>
              </tr>
            )}
            {expenses.length === 0 && addingTo !== "fixedExpenses" && (
              <tr><td colSpan={5} className="empty-row">Sin gastos fijos</td></tr>
            )}
          </tbody>
          {expenses.length > 0 && (
            <tfoot>
              <tr className="footer-total">
                <td style={{ textAlign: "right" }}>TOTAL</td>
                <td></td>
                <td className="mono">{fmt(total)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </Section>
  );
}
