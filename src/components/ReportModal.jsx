import { fmt } from "../utils/format.js";
import { formatMonthLabelWithCycle } from "../utils/cycle.js";

function ReportSection({ title, total, color, items, showStatus }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>{title}</span>
        <span className="mono" style={{ fontSize: 14, fontWeight: 700, color }}>{fmt(total)}</span>
      </div>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 8px", borderRadius: 4, background: i % 2 === 0 ? "#f9fafb" : "transparent" }}>
          <span style={{ fontSize: 12, color: "#4b5563", flex: 1 }}>
            {showStatus && it.paid !== undefined && (it.paid ? "✅ " : "⏳ ")}{it.name}
          </span>
          <span className="mono" style={{ fontSize: 12, fontWeight: 500, color }}>{fmt(it.amount)}</span>
        </div>
      ))}
    </div>
  );
}

export default function ReportModal({ data, filteredPayments, filteredIncomes, filteredVarExpenses, selectedMonth, onClose }) {
  const totalPayments = filteredPayments.reduce((s, p) => s + (p.monto || 0), 0);
  const totalIncomes = filteredIncomes.reduce((s, i) => s + (i.amount || 0), 0);
  const totalVarExpenses = filteredVarExpenses.reduce((s, v) => s + (v.monto || 0), 0);
  const totalDebtPending = (data.debts || []).reduce((s, d) => s + (d.saldoPendiente || 0), 0);
  const reportBalance = totalIncomes - totalPayments - totalVarExpenses;

  // Separar pagos: recurrentes (gasto fijo), cuotas de deuda, manuales
  const recurringPayments = filteredPayments.filter((p) => p.fixedExpenseId);
  const debtPayments = filteredPayments.filter((p) => p.debtId && !p.fixedExpenseId);
  const manualPayments = filteredPayments.filter((p) => !p.debtId && !p.fixedExpenseId);

  const totalRecurring = recurringPayments.reduce((s, p) => s + (p.monto || 0), 0);
  const totalDebtPayments = debtPayments.reduce((s, p) => s + (p.monto || 0), 0);
  const totalManual = manualPayments.reduce((s, p) => s + (p.monto || 0), 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="report-header">
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>📊 Informe — {formatMonthLabelWithCycle(selectedMonth)}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, color: "#9ca3af", cursor: "pointer" }}>✕</button>
        </div>

        <div className="report-body">
          {/* Balance principal */}
          <div style={{ textAlign: "center", padding: "16px 0 20px", borderBottom: "1px solid #e5e7eb", marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>Balance del ciclo</div>
            <div className="mono" style={{ fontSize: 32, fontWeight: 700, color: reportBalance >= 0 ? "#16a34a" : "#dc2626", marginTop: 4 }}>{fmt(reportBalance)}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
              {reportBalance >= 0 ? "Te sobra dinero este ciclo 👍" : "Gastas más de lo que ingresas ⚠️"}
            </div>
          </div>

          {/* Secciones detalladas */}
          <ReportSection
            title="💰 Ingresos"
            total={totalIncomes}
            color="#16a34a"
            items={filteredIncomes.map((i) => ({ name: i.concepto, amount: i.amount }))}
          />

          {/* Gastos fijos recurrentes */}
          <ReportSection
            title="🔄 Gastos Fijos Recurrentes"
            total={totalRecurring}
            color="#7c3aed"
            items={recurringPayments.map((p) => ({
              name: p.concepto.replace("🔄 ", ""),
              amount: p.monto,
              paid: p.estado === "PAGADO",
            }))}
            showStatus
          />

          {/* Cuotas de deuda */}
          <ReportSection
            title="📅 Cuotas de Deudas"
            total={totalDebtPayments}
            color="#dc2626"
            items={debtPayments.map((p) => ({
              name: p.concepto + (p.cuotaNum ? ` (${p.cuotaNum}/${(data.debts || []).find((d) => d.id === p.debtId)?.totalCuotas || "?"})` : ""),
              amount: p.monto,
              paid: p.estado === "PAGADO",
            }))}
            showStatus
          />

          {/* Pagos manuales */}
          {manualPayments.length > 0 && (
            <ReportSection
              title="📝 Otros Pagos"
              total={totalManual}
              color="#dc2626"
              items={manualPayments.map((p) => ({
                name: p.concepto,
                amount: p.monto,
                paid: p.estado === "PAGADO",
              }))}
              showStatus
            />
          )}

          <ReportSection
            title="🛒 Gastos Variables"
            total={totalVarExpenses}
            color="#ea580c"
            items={filteredVarExpenses.map((v) => ({
              name: (v.categoria ? v.categoria + " " : "") + v.concepto,
              amount: v.monto,
            }))}
          />

          {/* Tabla resumen */}
          <div style={{ background: "#f8fafc", borderRadius: 8, padding: 14, marginTop: 16 }}>
            <table style={{ width: "100%", border: "none" }}>
              <tbody>
                {[
                  { label: "Total Ingresos", val: totalIncomes, color: "#16a34a" },
                  { label: "Gastos Fijos (recurrentes)", val: -totalRecurring, color: "#7c3aed" },
                  { label: "Cuotas de Deudas", val: -totalDebtPayments, color: "#dc2626" },
                  ...(totalManual > 0 ? [{ label: "Otros Pagos", val: -totalManual, color: "#dc2626" }] : []),
                  { label: "Total Gastos Variables", val: -totalVarExpenses, color: "#ea580c" },
                ].map((r, i) => (
                  <tr key={i}>
                    <td style={{ border: "none", padding: "3px 0", fontSize: 13, color: "#4b5563" }}>{r.label}</td>
                    <td className="mono" style={{ border: "none", padding: "3px 0", textAlign: "right", fontSize: 13, fontWeight: 500, color: r.color }}>{fmt(r.val)}</td>
                  </tr>
                ))}
                <tr><td colSpan={2} style={{ border: "none", borderTop: "2px solid #d1d5db", padding: 0 }}></td></tr>
                <tr>
                  <td style={{ border: "none", padding: "6px 0 0", fontSize: 14, fontWeight: 700 }}>= Balance</td>
                  <td className="mono" style={{ border: "none", padding: "6px 0 0", textAlign: "right", fontSize: 16, fontWeight: 700, color: reportBalance >= 0 ? "#16a34a" : "#dc2626" }}>{fmt(reportBalance)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Deuda total */}
          <div style={{ marginTop: 16, padding: 12, background: "#faf5ff", borderRadius: 8, border: "1px solid #e9d5ff" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#7c3aed", textTransform: "uppercase", letterSpacing: 0.4 }}>Deuda total pendiente</div>
            <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: "#7c3aed", marginTop: 2 }}>{fmt(totalDebtPending)}</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
              {(data.debts || []).filter((d) => (d.cuotaActual || 0) >= (d.totalCuotas || 1)).length} de {(data.debts || []).length} deudas completadas
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
