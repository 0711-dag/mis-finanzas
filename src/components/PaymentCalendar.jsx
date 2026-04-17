import { useState } from "react";
import Section from "./Section.jsx";
import ActionButtons from "./shared/ActionButtons.jsx";
import { fmt, fmtDate, todayISO, formatMonthLabel } from "../utils/format.js";
import { dateToFinancialMonth } from "../utils/cycle.js";

export default function PaymentCalendar({ data, filteredPayments, save, addRow, deleteRow, updField, selectedMonth, setAddingTo, addingTo, mobileMode }) {
  const [newRow, setNewRow] = useState({});
  const [editingRow, setEditingRow] = useState(null);

  const totalPayments = filteredPayments.reduce((s, p) => s + (p.monto || 0), 0);
  const totalPaid = filteredPayments.filter((p) => p.estado === "PAGADO").reduce((s, p) => s + (p.monto || 0), 0);
  const totalPending = filteredPayments.filter((p) => p.estado === "PENDIENTE").reduce((s, p) => s + (p.monto || 0), 0);

  const startRowEdit = (item) => setEditingRow({ id: item.id, fields: { ...item } });
  const cancelRowEdit = () => setEditingRow(null);
  const rowField = (field) => editingRow?.fields?.[field] ?? "";
  const setRowField = (field, val) =>
    setEditingRow((prev) => prev ? { ...prev, fields: { ...prev.fields, [field]: val } } : prev);
  const isRowEditing = (id) => editingRow?.id === id;

  const handleSaveRowEdit = () => {
    if (!editingRow) return;
    // Mover al mes correcto si cambia dayPago
    let extra = {};
    if (editingRow.fields.dayPago && /^\d{4}-\d{2}-\d{2}$/.test(editingRow.fields.dayPago)) {
      extra.month = dateToFinancialMonth(editingRow.fields.dayPago);
    }
    const newData = {
      ...data,
      payments: data.payments.map((p) => p.id === editingRow.id ? { ...p, ...editingRow.fields, ...extra } : p),
    };
    save(newData);
    setEditingRow(null);
  };

  // Toggle payment status (ajusta cuota de la deuda vinculada si aplica)
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
    setNewRow({ concepto: "", monto: "", dayPago: todayISO(), estado: "PENDIENTE", debtId: "", fixedExpenseId: "" });
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
      fixedExpenseId: newRow.fixedExpenseId || "",
    });
    if (success) setAddingTo(null);
  };

  const activDebts = (data.debts || []).filter((d) => d.totalCuotas > 0 && (d.cuotaActual || 0) < d.totalCuotas);

  const getPaymentOrigin = (p) => {
    if (p.fixedExpenseId) return { icon: "🔄", cls: "item__icon--recurring" };
    if (p.debtId) return { icon: "💳", cls: "item__icon--debt" };
    return { icon: "📝", cls: "" };
  };

  const AddForm = (
    <div style={{
      background: "var(--bg-subtle)",
      borderRadius: "var(--radius-md)",
      padding: 14, marginBottom: 10,
      border: "1.5px solid var(--accent)",
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10 }}>
        Nuevo pago
      </div>
      <input className="sheet-input" placeholder="Concepto" value={newRow.concepto || ""} onChange={(e) => setNewRow({ ...newRow, concepto: e.target.value })} maxLength={100} />

      {activDebts.length > 0 && (
        <select
          className="sheet-input"
          value={newRow.debtId || ""}
          onChange={(e) => {
            const did = e.target.value;
            if (did) {
              const debt = (data.debts || []).find((d) => d.id === did);
              if (debt) setNewRow({ ...newRow, debtId: did, concepto: debt.entidad, monto: String(debt.proxCuota || ""), cuotaNum: (debt.cuotaActual || 0) + 1 });
            } else {
              setNewRow({ ...newRow, debtId: "", cuotaNum: null });
            }
          }}
        >
          <option value="">— Vincular a deuda (opcional) —</option>
          {activDebts.map((d) => <option key={d.id} value={d.id}>🔗 {d.entidad} (cuota {(d.cuotaActual || 0) + 1}/{d.totalCuotas})</option>)}
        </select>
      )}

      <div style={{ display: "flex", gap: 6 }}>
        <input className="sheet-input" type="number" placeholder="Monto €" value={newRow.monto || ""} onChange={(e) => setNewRow({ ...newRow, monto: e.target.value })} style={{ flex: 1 }} />
        <input className="sheet-input" type="date" value={newRow.dayPago || ""} onChange={(e) => setNewRow({ ...newRow, dayPago: e.target.value })} style={{ flex: 1, colorScheme: "light dark" }} />
      </div>

      <select className="sheet-input" value={newRow.estado || "PENDIENTE"} onChange={(e) => setNewRow({ ...newRow, estado: e.target.value })}>
        <option value="PENDIENTE">Pendiente</option>
        <option value="PAGADO">Pagado</option>
      </select>

      <button className="btn-primary btn-primary--accent" onClick={handleSaveNew} style={{ marginTop: 4 }}>
        Añadir pago
      </button>
    </div>
  );

  return (
    <Section title={`Calendario · ${formatMonthLabel(selectedMonth)}`} icon="📅" onAdd={handleAdd} mobileMode={mobileMode}>
      {/* Mini resumen origen */}
      {filteredPayments.length > 0 && (
        <div style={{
          display: "flex", gap: 10, marginBottom: 10,
          padding: "8px 12px",
          background: "var(--bg-subtle)",
          borderRadius: "var(--radius-md)",
          fontSize: 11, flexWrap: "wrap",
        }}>
          {filteredPayments.some((p) => p.fixedExpenseId) && (
            <span style={{ color: "var(--category-recurring)", fontWeight: 700 }}>
              🔄 {filteredPayments.filter((p) => p.fixedExpenseId).length} auto
            </span>
          )}
          {filteredPayments.some((p) => p.debtId && !p.fixedExpenseId) && (
            <span style={{ color: "var(--category-debt)", fontWeight: 700 }}>
              💳 {filteredPayments.filter((p) => p.debtId && !p.fixedExpenseId).length} cuotas
            </span>
          )}
          {filteredPayments.some((p) => !p.fixedExpenseId && !p.debtId) && (
            <span style={{ color: "var(--text-secondary)", fontWeight: 700 }}>
              📝 {filteredPayments.filter((p) => !p.fixedExpenseId && !p.debtId).length} manuales
            </span>
          )}
        </div>
      )}

      {addingTo === "payments" && AddForm}

      <div className="item-list">
        {filteredPayments.map((p) => {
          const re = isRowEditing(p.id);
          const linkedDebt = p.debtId ? (data.debts || []).find((d) => d.id === p.debtId) : null;
          const cuotaLabel = p.cuotaNum ? `Cuota ${p.cuotaNum}/${linkedDebt?.totalCuotas || "?"}` : null;
          const origin = getPaymentOrigin(p);
          const isPaid = p.estado === "PAGADO";

          if (re) {
            return (
              <div key={p.id} style={{
                background: "var(--bg-subtle)", borderRadius: "var(--radius-md)",
                padding: 12, border: "1.5px solid var(--accent)",
                display: "flex", flexDirection: "column", gap: 6,
              }}>
                <input className="sheet-input" value={rowField("concepto")} onChange={(e) => setRowField("concepto", e.target.value)} maxLength={100} disabled={!!p.debtId || !!p.fixedExpenseId} />
                <div style={{ display: "flex", gap: 6 }}>
                  <input className="sheet-input" type="number" value={rowField("monto")} onChange={(e) => setRowField("monto", parseFloat(e.target.value) || 0)} style={{ flex: 1 }} disabled={!!p.fixedExpenseId} />
                  <input className="sheet-input" type="date" value={rowField("dayPago")} onChange={(e) => setRowField("dayPago", e.target.value)} style={{ flex: 1, colorScheme: "light dark" }} />
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn-primary btn-primary--accent" onClick={handleSaveRowEdit} style={{ flex: 1 }}>Guardar</button>
                  <button className="btn-secondary" onClick={cancelRowEdit}>Cancelar</button>
                </div>
              </div>
            );
          }

          return (
            <div key={p.id} className={`item ${isPaid ? "item--paid" : ""}`}>
              <div className={`item__icon ${origin.cls}`}>{origin.icon}</div>
              <div className="item__body">
                <div className="item__title">{p.concepto.replace("🔄 ", "")}</div>
                <div className="item__subtitle">
                  {fmtDate(p.dayPago)}
                  {cuotaLabel && <span> · {cuotaLabel}</span>}
                  {p.fixedExpenseId && <span> · Recurrente</span>}
                </div>
              </div>
              <div className="item__right">
                <div className="item__amount">{fmt(p.monto)}</div>
                <div style={{ display: "flex", gap: 4, marginTop: 4, justifyContent: "flex-end", alignItems: "center" }}>
                  <button
                    className={`badge ${isPaid ? "badge--paid" : "badge--pending"}`}
                    onClick={() => toggleStatus(p)}
                  >
                    {isPaid ? "✓ Pagado" : "Pendiente"}
                  </button>
                </div>
                <div style={{ display: "flex", gap: 2, marginTop: 4, justifyContent: "flex-end" }}>
                  <ActionButtons
                    section="payments" id={p.id} item={p}
                    isEditing={false}
                    onStartEdit={(_s, item) => startRowEdit(item)}
                    onSaveEdit={handleSaveRowEdit}
                    onCancelEdit={cancelRowEdit}
                    onDelete={() => deleteRow("payments", p.id)}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {filteredPayments.length === 0 && addingTo !== "payments" && (
          <div className="empty">
            <div className="empty__emoji">📅</div>
            <div className="empty__title">Sin pagos este ciclo</div>
            <div className="empty__subtitle">Los gastos fijos recurrentes se añadirán automáticamente</div>
          </div>
        )}
      </div>

      {filteredPayments.length > 0 && (
        <div style={{
          padding: "10px 14px", marginTop: 6,
          background: "var(--bg-subtle)", borderRadius: "var(--radius-md)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: 8,
        }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5 }}>Total</span>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{fmt(totalPayments)}</div>
          </div>
          <div style={{ fontSize: 10, color: "var(--text-secondary)", textAlign: "right" }}>
            <div>✓ Pagado: <strong style={{ color: "var(--success)" }}>{fmt(totalPaid)}</strong></div>
            <div style={{ marginTop: 2 }}>⏳ Pendiente: <strong style={{ color: "var(--warning)" }}>{fmt(totalPending)}</strong></div>
          </div>
        </div>
      )}
    </Section>
  );
}
