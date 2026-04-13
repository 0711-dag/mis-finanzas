import { useState } from "react";
import Section from "./Section.jsx";
import CellInput from "./shared/CellInput.jsx";
import { fmt, fmtDate, todayISO, formatMonthLabel } from "../utils/format.js";
import { dateToFinancialMonth } from "../utils/cycle.js";

export default function PaymentCalendar({ data, filteredPayments, save, addRow, deleteRow, updField, selectedMonth, setAddingTo, addingTo }) {
  const [newRow, setNewRow] = useState({});
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [confirmDel, setConfirmDel] = useState(null);

  const totalPayments = filteredPayments.reduce((s, p) => s + (p.monto || 0), 0);
  const totalPaid = filteredPayments.filter((p) => p.estado === "PAGADO").reduce((s, p) => s + (p.monto || 0), 0);
  const totalPending = filteredPayments.filter((p) => p.estado === "PENDIENTE").reduce((s, p) => s + (p.monto || 0), 0);

  // Inline cell editing
  const startEdit = (id, field, currentVal) => {
    setEditingCell({ id, field });
    setEditValue(String(currentVal ?? ""));
  };
  const confirmEdit = () => {
    if (!editingCell) return;
    let val = editValue;
    if (["monto"].includes(editingCell.field)) val = parseFloat(val) || 0;
    updField("payments", editingCell.id, editingCell.field, val);
    setEditingCell(null);
  };
  const cancelEdit = () => setEditingCell(null);
  const isEditing = (id, f) => editingCell?.id === id && editingCell?.field === f;

  // Delete confirm
  const handleDel = (id) => {
    if (confirmDel === id) {
      deleteRow("payments", id);
      setConfirmDel(null);
    } else {
      setConfirmDel(id);
      setTimeout(() => setConfirmDel(null), 3000);
    }
  };

  // Toggle payment status
  const toggleStatus = (p) => {
    const newEstado = p.estado === "PAGADO" ? "PENDIENTE" : "PAGADO";
    const linkedDebt = p.debtId ? (data.debts || []).find((d) => d.id === p.debtId) : null;
    const hasPlan = linkedDebt && linkedDebt.totalCuotas > 0;

    let nd = { ...data, payments: data.payments.map((r) => (r.id === p.id ? { ...r, estado: newEstado } : r)) };

    if (p.debtId && linkedDebt && hasPlan) {
      if (newEstado === "PAGADO") {
        nd = {
          ...nd,
          debts: nd.debts.map((r) =>
            r.id === p.debtId
              ? { ...r, cuotaActual: (linkedDebt.cuotaActual || 0) + 1, saldoPendiente: Math.max(0, (linkedDebt.saldoPendiente || 0) - (linkedDebt.proxCuota || 0)) }
              : r
          ),
        };
      } else {
        nd = {
          ...nd,
          debts: nd.debts.map((r) =>
            r.id === p.debtId
              ? { ...r, cuotaActual: Math.max(0, (linkedDebt.cuotaActual || 0) - 1), saldoPendiente: (linkedDebt.saldoPendiente || 0) + (linkedDebt.proxCuota || 0) }
              : r
          ),
        };
      }
    }
    save(nd);
  };

  const handleAdd = () => {
    setAddingTo("payments");
    setNewRow({ concepto: "", monto: "", dayPago: todayISO(), estado: "PENDIENTE", debtId: "" });
  };

  const handleSaveNew = () => {
    const success = addRow("payments", {
      concepto: newRow.concepto,
      monto: parseFloat(newRow.monto) || 0,
      dayPago: newRow.dayPago,
      estado: newRow.estado || "PENDIENTE",
      month: dateToFinancialMonth(newRow.dayPago) || selectedMonth,
      debtId: newRow.debtId || "",
      cuotaNum: newRow.cuotaNum || null,
    });
    if (success) setAddingTo(null);
  };

  const activDebts = (data.debts || []).filter((d) => d.totalCuotas > 0 && (d.cuotaActual || 0) < d.totalCuotas);

  return (
    <Section title={`📅 Calendario de Pagos — ${formatMonthLabel(selectedMonth)}`} onAdd={handleAdd}>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr><th>Concepto</th><th>Monto (€)</th><th>Día de pago</th><th>Estado</th><th style={{ width: 50 }}></th></tr>
          </thead>
          <tbody>
            {filteredPayments.map((p) => {
              const linkedDebt = p.debtId ? (data.debts || []).find((d) => d.id === p.debtId) : null;
              const cuotaLabel = p.cuotaNum ? `Cuota ${p.cuotaNum} de ${linkedDebt?.totalCuotas || "?"}` : null;

              return (
                <tr key={p.id} style={{ background: p.estado === "PAGADO" ? "#f0fdf4" : "#fef2f2" }}>
                  <td className="editable-cell" onDoubleClick={() => !p.debtId && startEdit(p.id, "concepto", p.concepto)}>
                    {isEditing(p.id, "concepto") ? (
                      <CellInput value={editValue} onChange={setEditValue} onConfirm={confirmEdit} onCancel={cancelEdit} field="concepto" />
                    ) : (
                      <div>
                        <span>{p.concepto}</span>
                        {cuotaLabel && (
                          <div style={{ fontSize: 10, fontWeight: 600, marginTop: 1, color: p.estado === "PAGADO" ? "#16a34a" : "#6366f1" }}>
                            {p.estado === "PAGADO" ? `✅ ${cuotaLabel}` : `📌 ${cuotaLabel}`}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="editable-cell mono" onDoubleClick={() => startEdit(p.id, "monto", p.monto)} style={{ fontWeight: 600 }}>
                    {isEditing(p.id, "monto") ? <CellInput value={editValue} onChange={setEditValue} onConfirm={confirmEdit} onCancel={cancelEdit} field="monto" /> : fmt(p.monto)}
                  </td>
                  <td className="editable-cell" onDoubleClick={() => startEdit(p.id, "dayPago", p.dayPago)}>
                    {isEditing(p.id, "dayPago") ? <CellInput value={editValue} onChange={setEditValue} onConfirm={confirmEdit} onCancel={cancelEdit} field="dayPago" /> : fmtDate(p.dayPago)}
                  </td>
                  <td>
                    <button
                      className={`status-badge ${p.estado === "PAGADO" ? "status-badge--paid" : "status-badge--pending"}`}
                      onClick={() => toggleStatus(p)}
                    >
                      {p.estado}
                    </button>
                  </td>
                  <td>
                    <button
                      className={`btn-delete ${confirmDel === p.id ? "btn-delete--active" : ""}`}
                      onClick={() => handleDel(p.id)}
                      title={confirmDel === p.id ? "Pulsa otra vez para confirmar" : "Eliminar"}
                    >
                      {confirmDel === p.id ? "¿Seguro?" : "✕"}
                    </button>
                  </td>
                </tr>
              );
            })}

            {/* Formulario añadir */}
            {addingTo === "payments" && (
              <tr className="row-adding">
                <td>
                  <input className="row-input" placeholder="Concepto" value={newRow.concepto || ""} onChange={(e) => setNewRow({ ...newRow, concepto: e.target.value })} maxLength={100} />
                  {activDebts.length > 0 && (
                    <select className="row-input" style={{ marginTop: 3, fontSize: 11 }} value={newRow.debtId || ""} onChange={(e) => {
                      const did = e.target.value;
                      if (did) {
                        const debt = (data.debts || []).find((d) => d.id === did);
                        if (debt) setNewRow({ ...newRow, debtId: did, concepto: debt.entidad, monto: String(debt.proxCuota || ""), cuotaNum: (debt.cuotaActual || 0) + 1 });
                      } else {
                        setNewRow({ ...newRow, debtId: "", cuotaNum: null });
                      }
                    }}>
                      <option value="">— Vincular a deuda (opcional) —</option>
                      {activDebts.map((d) => <option key={d.id} value={d.id}>🔗 {d.entidad} (cuota {(d.cuotaActual || 0) + 1}/{d.totalCuotas})</option>)}
                    </select>
                  )}
                </td>
                <td><input className="row-input" type="number" placeholder="0" value={newRow.monto || ""} onChange={(e) => setNewRow({ ...newRow, monto: e.target.value })} min="0" max="99999999" /></td>
                <td><input className="row-input" type="date" value={newRow.dayPago || ""} onChange={(e) => setNewRow({ ...newRow, dayPago: e.target.value })} /></td>
                <td>
                  <select className="row-input" value={newRow.estado || "PENDIENTE"} onChange={(e) => setNewRow({ ...newRow, estado: e.target.value })}>
                    <option>PENDIENTE</option>
                    <option>PAGADO</option>
                  </select>
                </td>
                <td><button className="btn-ok" onClick={handleSaveNew}>✓</button></td>
              </tr>
            )}

            {filteredPayments.length === 0 && addingTo !== "payments" && (
              <tr><td colSpan={5} className="empty-row" style={{ padding: 20 }}>Sin pagos este ciclo</td></tr>
            )}
          </tbody>
          {filteredPayments.length > 0 && (
            <tfoot>
              <tr className="footer-total">
                <td style={{ textAlign: "right" }}>TOTALES</td>
                <td className="mono">{fmt(totalPayments)}</td>
                <td></td>
                <td style={{ fontSize: 10 }}>✅{fmt(totalPaid)} | ⏳{fmt(totalPending)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </Section>
  );
}
