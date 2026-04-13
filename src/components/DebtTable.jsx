import { useState } from "react";
import Section from "./Section.jsx";
import ActionButtons from "./shared/ActionButtons.jsx";
import { fmt, fmtDate, fmtMonthShort, todayISO, monthKey, addMonths } from "../utils/format.js";
import { isDateInCycle } from "../utils/cycle.js";

export default function DebtTable({ data, addDebtWithPlan, deleteRow, saveRowEdit, selectedMonth, setAddingTo, addingTo }) {
  const [newRow, setNewRow] = useState({});
  const [editingRow, setEditingRow] = useState(null);

  const debts = data.debts || [];
  const totalDebtPending = debts.reduce((s, d) => s + (d.saldoPendiente || 0), 0);
  const totalCuota = debts.reduce((s, d) => s + (d.proxCuota || 0), 0);

  const startRowEdit = (section, item) => setEditingRow({ id: item.id, fields: { ...item } });
  const cancelRowEdit = () => setEditingRow(null);
  const handleSaveRowEdit = () => {
    if (!editingRow) return;
    saveRowEdit("debts", editingRow.id, editingRow.fields);
    setEditingRow(null);
  };
  const isRowEditing = (id) => editingRow?.id === id;
  const rowField = (field) => editingRow?.fields?.[field] ?? "";
  const setRowField = (field, val) =>
    setEditingRow((prev) => prev ? { ...prev, fields: { ...prev.fields, [field]: val } } : prev);

  const handleAdd = () => {
    setAddingTo("debts");
    setNewRow({ entidad: "", fechaInicio: todayISO(), saldoPendiente: "", proxCuota: "", totalCuotas: "" });
  };

  const handleSaveNew = () => {
    const success = addDebtWithPlan({
      entidad: newRow.entidad,
      fechaInicio: newRow.fechaInicio,
      saldoPendiente: parseFloat(newRow.saldoPendiente) || 0,
      proxCuota: parseFloat(newRow.proxCuota) || 0,
      totalCuotas: parseInt(newRow.totalCuotas) || 0,
      cuotaActual: 0,
    });
    if (success) setAddingTo(null);
  };

  return (
    <Section title="📋 Mis Deudas" onAdd={handleAdd}>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Entidad</th>
              <th>Saldo pend.</th>
              <th>Cuota (€)</th>
              <th>Plan de pagos</th>
              <th style={{ width: 70 }}></th>
            </tr>
          </thead>
          <tbody>
            {debts.map((d) => {
              const hasPlan = d.totalCuotas && d.totalCuotas > 0;
              const cuotaAct = d.cuotaActual || 0;
              const totalC = d.totalCuotas || 0;
              const pct = hasPlan ? (cuotaAct / totalC) * 100 : 0;
              const terminada = hasPlan && cuotaAct >= totalC;
              const startMK = d.fechaInicio ? monthKey(d.fechaInicio) : null;
              const endMK = hasPlan && startMK ? addMonths(startMK, totalC - 1) : null;
              let cuotaThisMonth = null;
              if (hasPlan && d.fechaInicio) {
                const debtPayments = (data.payments || []).filter(
                  (p) => p.debtId === d.id && isDateInCycle(p.dayPago, selectedMonth)
                );
                if (debtPayments.length > 0) cuotaThisMonth = debtPayments[0].cuotaNum;
              }
              const re = isRowEditing(d.id);

              return (
                <tr key={d.id} className={re ? "row-editing" : ""} style={!re && terminada ? { background: "#f0fdf4" } : {}}>
                  <td>
                    {re ? (
                      <input className="row-input" value={rowField("entidad")} onChange={(e) => setRowField("entidad", e.target.value)} maxLength={100} />
                    ) : (
                      <span style={terminada ? { textDecoration: "line-through", opacity: 0.6 } : {}}>{d.entidad}</span>
                    )}
                  </td>
                  <td className="mono" style={{ fontWeight: 600, color: terminada ? "#16a34a" : "#dc2626" }}>
                    {re ? (
                      <input className="row-input" type="number" value={rowField("saldoPendiente")} onChange={(e) => setRowField("saldoPendiente", parseFloat(e.target.value) || 0)} />
                    ) : fmt(d.saldoPendiente)}
                  </td>
                  <td className="mono">
                    {re ? (
                      <input className="row-input" type="number" value={rowField("proxCuota")} onChange={(e) => setRowField("proxCuota", parseFloat(e.target.value) || 0)} />
                    ) : fmt(d.proxCuota)}
                  </td>
                  <td style={{ minWidth: 155 }}>
                    {hasPlan ? (
                      <div>
                        <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>{fmtMonthShort(startMK)} → {fmtMonthShort(endMK)}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: terminada ? "#16a34a" : cuotaThisMonth ? "#4338ca" : "#4b5563", marginBottom: 3 }}>
                          {terminada ? "✅ Completada" : cuotaThisMonth ? `📌 Cuota ${cuotaThisMonth} de ${totalC} (este ciclo)` : `Cuota ${cuotaAct} de ${totalC} pagadas`}
                        </div>
                        <div className="progress-bar">
                          <div className="progress-bar__fill" style={{ width: `${pct}%`, background: terminada ? "#22c55e" : "#3b82f6" }} />
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: "#9ca3af", fontStyle: "italic" }}>Sin plan</span>
                    )}
                  </td>
                  <td>
                    <ActionButtons
                      section="debts"
                      id={d.id}
                      item={d}
                      isEditing={re}
                      onStartEdit={(_s, item) => startRowEdit("debts", item)}
                      onSaveEdit={handleSaveRowEdit}
                      onCancelEdit={cancelRowEdit}
                      onDelete={() => deleteRow("debts", d.id)}
                    />
                  </td>
                </tr>
              );
            })}

            {/* Formulario añadir */}
            {addingTo === "debts" && (
              <>
                <tr className="row-adding">
                  <td><input className="row-input" placeholder="Entidad / Acreedor" value={newRow.entidad || ""} onChange={(e) => setNewRow({ ...newRow, entidad: e.target.value })} maxLength={100} /></td>
                  <td><input className="row-input" type="number" placeholder="Saldo total" value={newRow.saldoPendiente || ""} onChange={(e) => setNewRow({ ...newRow, saldoPendiente: e.target.value })} min="0" max="99999999" /></td>
                  <td><input className="row-input" type="number" placeholder="Cuota €" value={newRow.proxCuota || ""} onChange={(e) => setNewRow({ ...newRow, proxCuota: e.target.value })} min="0" max="99999999" /></td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <input className="row-input" type="number" placeholder="Nº cuotas" value={newRow.totalCuotas || ""} onChange={(e) => setNewRow({ ...newRow, totalCuotas: e.target.value })} min="0" max="360" />
                      <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                        <span style={{ fontSize: 10, color: "#6b7280", whiteSpace: "nowrap" }}>Inicio:</span>
                        <input className="row-input" style={{ flex: 1 }} type="date" value={newRow.fechaInicio || ""} onChange={(e) => setNewRow({ ...newRow, fechaInicio: e.target.value })} />
                      </div>
                    </div>
                  </td>
                  <td><button className="btn-ok" onClick={handleSaveNew}>✓</button></td>
                </tr>
                {newRow.totalCuotas && newRow.fechaInicio && newRow.proxCuota && (
                  <tr className="row-adding">
                    <td colSpan={5} style={{ fontSize: 11, color: "#4338ca", padding: "3px 8px" }}>
                      ℹ️ Se crearán {parseInt(newRow.totalCuotas) || 0} pagos automáticos de {fmt(parseFloat(newRow.proxCuota) || 0)} desde {fmtDate(newRow.fechaInicio)}
                      <br />
                      <span style={{ color: "#6366f1" }}>📅 Cada pago se asignará automáticamente al ciclo financiero correcto (27→26)</span>
                    </td>
                  </tr>
                )}
              </>
            )}

            {debts.length === 0 && addingTo !== "debts" && (
              <tr><td colSpan={5} className="empty-row">Sin deudas</td></tr>
            )}
          </tbody>
          {debts.length > 0 && (
            <tfoot>
              <tr className="footer-total">
                <td style={{ textAlign: "right" }}>TOTAL</td>
                <td className="mono" style={{ color: "#dc2626" }}>{fmt(totalDebtPending)}</td>
                <td className="mono">{fmt(totalCuota)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </Section>
  );
}
