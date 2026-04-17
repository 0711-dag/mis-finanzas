import { fmt } from "../utils/format.js";
import { formatMonthLabelWithCycle } from "../utils/cycle.js";

function ReportSection({ title, total, color, items, showStatus }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5 }}>{title}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color, fontFeatureSettings: "'tnum'" }}>{fmt(total)}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map((it, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "6px 10px", borderRadius: "var(--radius-sm)",
            background: i % 2 === 0 ? "var(--bg-subtle)" : "transparent",
            fontSize: 12,
          }}>
            <span style={{ color: "var(--text-primary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {showStatus && it.paid !== undefined && (it.paid ? "✓ " : "⏳ ")}{it.name}
            </span>
            <span style={{ fontWeight: 600, color, fontFeatureSettings: "'tnum'" }}>{fmt(it.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReportModal({ data, filteredPayments, filteredIncomes, filteredVarExpenses, selectedMonth, onClose }) {
  const totalPayments = filteredPayments.reduce((s, p) => s + (p.monto || 0), 0);
  const totalIncomes = filteredIncomes.reduce((s, i) => s + (i.amount || 0), 0);
  const totalVarExpenses = filteredVarExpenses.reduce((s, v) => s + (v.monto || 0), 0);
  const totalDebtPending = (data.debts || []).reduce((s, d) => s + (d.saldoPendiente || 0), 0);
  const reportBalance = totalIncomes - totalPayments - totalVarExpenses;

  const recurringPayments = filteredPayments.filter((p) => p.fixedExpenseId);
  const debtPayments = filteredPayments.filter((p) => p.debtId && !p.fixedExpenseId);
  const manualPayments = filteredPayments.filter((p) => !p.debtId && !p.fixedExpenseId);

  const totalRecurring = recurringPayments.reduce((s, p) => s + (p.monto || 0), 0);
  const totalDebtPayments = debtPayments.reduce((s, p) => s + (p.monto || 0), 0);
  const totalManual = manualPayments.reduce((s, p) => s + (p.monto || 0), 0);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div>
            <h2 className="modal__title">Informe del ciclo</h2>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500, marginTop: 2 }}>
              {formatMonthLabelWithCycle(selectedMonth)}
            </div>
          </div>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="modal__body">
          {/* Hero balance */}
          <div style={{
            textAlign: "center", padding: "10px 0 22px",
            borderBottom: "1px solid var(--border-subtle)",
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Balance del ciclo
            </div>
            <div style={{
              fontSize: 40, fontWeight: 800, letterSpacing: "-0.04em",
              color: reportBalance >= 0 ? "var(--success)" : "var(--danger)",
              marginTop: 6, lineHeight: 1,
              fontFeatureSettings: "'tnum'",
            }}>
              {fmt(reportBalance)}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 8 }}>
              {reportBalance >= 0 ? "Te sobra dinero este ciclo 👍" : "Gastas más de lo que ingresas ⚠️"}
            </div>
          </div>

          <ReportSection
            title="Ingresos"
            total={totalIncomes}
            color="var(--success)"
            items={filteredIncomes.map((i) => ({ name: i.concepto, amount: i.amount }))}
          />

          <ReportSection
            title="🔄 Gastos fijos recurrentes"
            total={totalRecurring}
            color="var(--category-recurring)"
            items={recurringPayments.map((p) => ({
              name: p.concepto.replace("🔄 ", ""),
              amount: p.monto,
              paid: p.estado === "PAGADO",
            }))}
            showStatus
          />

          <ReportSection
            title="💳 Cuotas de deudas"
            total={totalDebtPayments}
            color="var(--category-debt)"
            items={debtPayments.map((p) => ({
              name: p.concepto + (p.cuotaNum ? ` (${p.cuotaNum}/${(data.debts || []).find((d) => d.id === p.debtId)?.totalCuotas || "?"})` : ""),
              amount: p.monto,
              paid: p.estado === "PAGADO",
            }))}
            showStatus
          />

          {manualPayments.length > 0 && (
            <ReportSection
              title="Otros pagos"
              total={totalManual}
              color="var(--danger)"
              items={manualPayments.map((p) => ({
                name: p.concepto,
                amount: p.monto,
                paid: p.estado === "PAGADO",
              }))}
              showStatus
            />
          )}

          <ReportSection
            title="🛒 Gastos variables"
            total={totalVarExpenses}
            color="var(--category-expense)"
            items={filteredVarExpenses.map((v) => ({
              name: (v.categoria ? v.categoria + " " : "") + v.concepto,
              amount: v.monto,
            }))}
          />

          {/* Resumen final */}
          <div style={{
            background: "var(--bg-subtle)", borderRadius: "var(--radius-md)",
            padding: 14, marginTop: 18,
          }}>
            {[
              { label: "Total ingresos", val: totalIncomes, color: "var(--success)", sign: "+" },
              { label: "Recurrentes", val: totalRecurring, color: "var(--category-recurring)", sign: "−" },
              { label: "Cuotas deudas", val: totalDebtPayments, color: "var(--category-debt)", sign: "−" },
              ...(totalManual > 0 ? [{ label: "Otros pagos", val: totalManual, color: "var(--danger)", sign: "−" }] : []),
              { label: "Gastos variables", val: totalVarExpenses, color: "var(--category-expense)", sign: "−" },
            ].map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}>
                <span style={{ color: "var(--text-secondary)" }}>{r.label}</span>
                <span style={{ fontWeight: 600, color: r.color, fontFeatureSettings: "'tnum'" }}>
                  {r.sign}{fmt(r.val).replace("−", "").replace("-", "")}
                </span>
              </div>
            ))}
            <div style={{ borderTop: "2px solid var(--border-strong)", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, fontWeight: 800 }}>Balance</span>
              <span style={{
                fontSize: 16, fontWeight: 800,
                color: reportBalance >= 0 ? "var(--success)" : "var(--danger)",
                fontFeatureSettings: "'tnum'",
              }}>
                {fmt(reportBalance)}
              </span>
            </div>
          </div>

          {/* Deuda total */}
          <div style={{
            marginTop: 16, padding: 14,
            background: "var(--category-debt-bg)",
            borderRadius: "var(--radius-md)",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--category-debt)", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Deuda total pendiente
            </div>
            <div style={{
              fontSize: 24, fontWeight: 800, color: "var(--category-debt)",
              marginTop: 4, letterSpacing: "-0.02em",
              fontFeatureSettings: "'tnum'",
            }}>
              {fmt(totalDebtPending)}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 6 }}>
              {(data.debts || []).filter((d) => (d.cuotaActual || 0) >= (d.totalCuotas || 1)).length} de {(data.debts || []).length} deudas completadas
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
