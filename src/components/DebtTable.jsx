import { useState } from "react";
import Section from "./Section.jsx";
import ActionButtons from "./shared/ActionButtons.jsx";
import { fmt, fmtDate, fmtMonthShort, todayISO, monthKey, addMonths } from "../utils/format.js";
import { isDateInCycle } from "../utils/cycle.js";

export default function DebtTable({ data, addDebtWithPlan, deleteRow, saveRowEdit, selectedMonth, setAddingTo, addingTo, mobileMode }) {
  const [newRow, setNewRow] = useState({});
  const [editingRow, setEditingRow] = useState(null);

  const debts = data.debts || [];
  const totalDebtPending = debts.reduce((s, d) => s + (d.saldoPendiente || 0), 0);
  const totalCuota = debts.reduce((s, d) => s + (d.proxCuota || 0), 0);

  const startRowEdit = (_s, item) => setEditingRow({ id: item.id, fields: { ...item } });
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

  // ── Formulario añadir (compartido) ──
  const AddForm = (
    <div style={{
      background: "var(--bg-subtle)",
      borderRadius: "var(--radius-md)",
      padding: 14,
      marginBottom: 10,
      border: "1.5px solid var(--accent)",
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10 }}>
        Nueva deuda
      </div>
      <input className="sheet-input" placeholder="Entidad / Acreedor" value={newRow.entidad || ""} onChange={(e) => setNewRow({ ...newRow, entidad: e.target.value })} maxLength={100} />
      <div style={{ display: "flex", gap: 6 }}>
        <input className="sheet-input" type="number" placeholder="Saldo total €" value={newRow.saldoPendiente || ""} onChange={(e) => setNewRow({ ...newRow, saldoPendiente: e.target.value })} style={{ flex: 1 }} />
        <input className="sheet-input" type="number" placeholder="Cuota €" value={newRow.proxCuota || ""} onChange={(e) => setNewRow({ ...newRow, proxCuota: e.target.value })} style={{ flex: 1 }} />
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input className="sheet-input" type="number" placeholder="Nº cuotas" value={newRow.totalCuotas || ""} onChange={(e) => setNewRow({ ...newRow, totalCuotas: e.target.value })} style={{ flex: 1 }} />
        <input className="sheet-input" type="date" value={newRow.fechaInicio || ""} onChange={(e) => setNewRow({ ...newRow, fechaInicio: e.target.value })} style={{ flex: 1, colorScheme: "light dark" }} />
      </div>
      {newRow.totalCuotas && newRow.fechaInicio && newRow.proxCuota && (
        <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4, marginBottom: 10, lineHeight: 1.4 }}>
          Se crearán {parseInt(newRow.totalCuotas) || 0} pagos de {fmt(parseFloat(newRow.proxCuota) || 0)} desde {fmtDate(newRow.fechaInicio)}. Los pagos se asignan automáticamente al ciclo 27→26.
        </div>
      )}
      <button className="btn-primary btn-primary--accent" onClick={handleSaveNew} style={{ marginTop: 4 }}>
        Crear deuda
      </button>
    </div>
  );

  return (
    <Section title="Mis deudas" icon="💳" onAdd={handleAdd} mobileMode={mobileMode}>
      {addingTo === "debts" && AddForm}

      {/* Lista unificada */}
      <div className="item-list">
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

          if (re) {
            // Modo edición en el mismo item
            return (
              <div key={d.id} style={{
                background: "var(--bg-subtle)",
                borderRadius: "var(--radius-md)",
                padding: 12, border: "1.5px solid var(--accent)",
                display: "flex", flexDirection: "column", gap: 6,
              }}>
                <input className="sheet-input" value={rowField("entidad")} onChange={(e) => setRowField("entidad", e.target.value)} maxLength={100} />
                <div style={{ display: "flex", gap: 6 }}>
                  <input className="sheet-input" type="number" value={rowField("saldoPendiente")} onChange={(e) => setRowField("saldoPendiente", parseFloat(e.target.value) || 0)} style={{ flex: 1 }} />
                  <input className="sheet-input" type="number" value={rowField("proxCuota")} onChange={(e) => setRowField("proxCuota", parseFloat(e.target.value) || 0)} style={{ flex: 1 }} />
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn-primary btn-primary--accent" onClick={handleSaveRowEdit} style={{ flex: 1 }}>Guardar</button>
                  <button className="btn-secondary" onClick={cancelRowEdit}>Cancelar</button>
                </div>
              </div>
            );
          }

          return (
            <div key={d.id} className="item" style={terminada ? { opacity: 0.6 } : {}}>
              <div className="item__icon item__icon--debt">💳</div>
              <div className="item__body">
                <div className="item__title" style={terminada ? { textDecoration: "line-through" } : {}}>
                  {d.entidad}
                </div>
                <div className="item__subtitle">
                  {hasPlan ? (
                    <>
                      {terminada ? "✅ Completada" : cuotaThisMonth
                        ? `Cuota ${cuotaThisMonth} de ${totalC} este ciclo`
                        : `${cuotaAct} de ${totalC} pagadas`}
                      {hasPlan && !terminada && (
                        <div className="progress" style={{ marginTop: 4, width: 100 }}>
                          <div className={`progress__fill ${terminada ? "progress__fill--done" : ""}`} style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </>
                  ) : "Sin plan de cuotas"}
                </div>
              </div>
              <div className="item__right">
                <div className="item__amount item__amount--neg">{fmt(d.saldoPendiente)}</div>
                <div className="item__amount-sub">Cuota {fmt(d.proxCuota)}</div>
                <div style={{ display: "flex", gap: 2, marginTop: 4, justifyContent: "flex-end" }}>
                  <ActionButtons
                    section="debts" id={d.id} item={d}
                    isEditing={false}
                    onStartEdit={(_s, item) => startRowEdit("debts", item)}
                    onSaveEdit={handleSaveRowEdit}
                    onCancelEdit={cancelRowEdit}
                    onDelete={() => deleteRow("debts", d.id)}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {debts.length === 0 && addingTo !== "debts" && (
          <div className="empty">
            <div className="empty__emoji">💳</div>
            <div className="empty__title">Sin deudas</div>
            <div className="empty__subtitle">¡Genial! O añade tu primera con el botón +</div>
          </div>
        )}
      </div>

      {debts.length > 0 && (
        <div style={{
          padding: "10px 14px", marginTop: 6,
          background: "var(--bg-subtle)", borderRadius: "var(--radius-md)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5 }}>Total</span>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--danger)" }}>{fmt(totalDebtPending)}</div>
            <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>Cuotas mensuales: {fmt(totalCuota)}</div>
          </div>
        </div>
      )}
    </Section>
  );
}
