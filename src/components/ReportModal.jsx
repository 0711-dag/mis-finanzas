// ══════════════════════════════════════════════
// 📋 Informe mensual del ciclo
// + Exportación a PDF (html2pdf.js, carga perezosa)
// ══════════════════════════════════════════════
import { useRef, useState } from "react";
import { fmt } from "../utils/format.js";
import { formatMonthLabelWithCycle } from "../utils/cycle.js";
import {
  calcBudgetUsage,
  calcMonthlyMetrics,
  calcDebtRatio,
  evalDebtRatio,
  calcGoalProgress,
} from "../utils/finance.js";

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

function BudgetReportSection({ usage }) {
  if (!usage.categorias.length && usage.totalPresupuestado === 0) return null;

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5 }}>
          📊 Presupuesto vs. Real
        </span>
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          {fmt(usage.totalGastado)} / {fmt(usage.totalPresupuestado)}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {usage.categorias.map((c, i) => {
          const color = c.estado === "excedido" ? "var(--danger)"
            : c.estado === "alerta" ? "var(--warning)"
            : c.estado === "sin_presupuesto" ? "var(--text-tertiary)"
            : "var(--success)";
          const pct = c.presupuestado > 0 ? Math.min(100, (c.gastado / c.presupuestado) * 100) : 0;
          return (
            <div key={c._key || c.categoria || i} style={{
              padding: "8px 10px",
              borderRadius: "var(--radius-sm)",
              background: "var(--bg-subtle)",
            }}>
              <div style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", marginBottom: 4, fontSize: 12,
              }}>
                <span style={{ color: "var(--text-primary)" }}>{c.categoria}</span>
                <span style={{ color, fontWeight: 600, fontFeatureSettings: "'tnum'" }}>
                  {c.presupuestado > 0
                    ? `${fmt(c.gastado)} / ${fmt(c.presupuestado)}`
                    : `${fmt(c.gastado)} (sin pres.)`}
                </span>
              </div>
              {c.presupuestado > 0 && (
                <div className="progress" style={{ height: 4 }}>
                  <div
                    className="progress__fill"
                    style={{ width: `${pct}%`, background: color }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SavingsReportSection({ goals, deposits, cycleMK }) {
  if (!goals || goals.length === 0) return null;

  const aportesCiclo = (deposits || []).filter((d) => d.month === cycleMK);
  const totalAportado = aportesCiclo.reduce((s, d) => s + (Number(d.monto) || 0), 0);

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5 }}>
          🎯 Metas de ahorro
        </span>
        {totalAportado > 0 && (
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--success)", fontFeatureSettings: "'tnum'" }}>
            +{fmt(totalAportado)} este ciclo
          </span>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {goals.map((g) => {
          const progress = calcGoalProgress(g, deposits);
          const aporteCiclo = aportesCiclo
            .filter((d) => d.goalId === g.id)
            .reduce((s, d) => s + (Number(d.monto) || 0), 0);
          const completada = progress.porcentaje >= 100;
          const icon = g.icono || (g.tipo === "emergencia" ? "🛡️" : "🎯");

          return (
            <div key={g.id} style={{
              padding: "8px 10px",
              borderRadius: "var(--radius-sm)",
              background: "var(--bg-subtle)",
            }}>
              <div style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", marginBottom: 4, fontSize: 12,
              }}>
                <span style={{ color: "var(--text-primary)" }}>
                  {icon} {g.nombre}
                  {completada && <span style={{ color: "var(--success)", marginLeft: 4 }}>✓</span>}
                </span>
                <span style={{
                  color: completada ? "var(--success)" : "var(--text-primary)",
                  fontWeight: 600, fontFeatureSettings: "'tnum'",
                }}>
                  {fmt(progress.acumulado)} / {fmt(g.objetivo)}
                </span>
              </div>
              <div className="progress" style={{ height: 4 }}>
                <div
                  className="progress__fill"
                  style={{
                    width: `${Math.min(100, progress.porcentaje)}%`,
                    background: completada ? "var(--success)" : "var(--accent)",
                  }}
                />
              </div>
              <div style={{
                marginTop: 4, fontSize: 10,
                color: "var(--text-tertiary)",
                display: "flex", justifyContent: "space-between",
              }}>
                <span>{progress.porcentaje.toFixed(0)}% completado</span>
                {aporteCiclo > 0 && (
                  <span style={{ color: "var(--success)" }}>+{fmt(aporteCiclo)} este ciclo</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HealthSection({ metrics, ratio, ratioEval }) {
  const ahorroColor =
    metrics.tasaAhorro >= 20 ? "var(--success)"
    : metrics.tasaAhorro >= 10 ? "var(--warning)"
    : metrics.tasaAhorro > 0 ? "var(--warning)"
    : "var(--danger)";

  const ratioColor = {
    success: "var(--success)",
    warning: "var(--warning)",
    danger: "var(--danger)",
  }[ratioEval.color] || "var(--success)";

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
        💹 Salud financiera
      </div>
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
      }}>
        <div style={{
          padding: 10, borderRadius: "var(--radius-sm)",
          background: "var(--bg-subtle)",
        }}>
          <div style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>
            Tasa de ahorro
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: ahorroColor, fontFeatureSettings: "'tnum'" }}>
            {metrics.tasaAhorro.toFixed(1)}%
          </div>
          <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
            {fmt(metrics.ahorroReal)} este ciclo
          </div>
        </div>
        <div style={{
          padding: 10, borderRadius: "var(--radius-sm)",
          background: "var(--bg-subtle)",
        }}>
          <div style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>
            Endeudamiento
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: ratioColor, fontFeatureSettings: "'tnum'" }}>
            {metrics.ingresos > 0 ? `${ratio.toFixed(1)}%` : "—"}
          </div>
          <div style={{ fontSize: 10, color: ratioColor }}>
            {ratioEval.label}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReportModal({ data, filteredPayments, filteredIncomes, filteredVarExpenses, selectedMonth, onClose }) {
  // Ref al contenedor que se va a convertir en PDF
  const reportRef = useRef(null);
  // Estado del botón de descarga: idle | loading
  const [downloading, setDownloading] = useState(false);

  const totalPayments = filteredPayments.reduce((s, p) => s + (p.monto || 0), 0);
  const totalIncomes = filteredIncomes.reduce((s, i) => s + (i.amount || 0), 0);
  const totalVarExpenses = filteredVarExpenses.reduce((s, v) => s + (v.monto || 0), 0);
  const reportBalance = totalIncomes - totalPayments - totalVarExpenses;

  const recurringPayments = filteredPayments.filter((p) => p.fixedExpenseId);
  const debtPayments = filteredPayments.filter((p) => p.debtId && !p.fixedExpenseId);
  const manualPayments = filteredPayments.filter((p) => !p.debtId && !p.fixedExpenseId);

  const totalRecurring = recurringPayments.reduce((s, p) => s + (p.monto || 0), 0);
  const totalDebtPayments = debtPayments.reduce((s, p) => s + (p.monto || 0), 0);
  const totalManual = manualPayments.reduce((s, p) => s + (p.monto || 0), 0);

  const metrics = calcMonthlyMetrics(data, selectedMonth);
  const ratio = calcDebtRatio(metrics.cuotasDeuda, metrics.ingresos);
  const ratioEval = evalDebtRatio(ratio);

  // 🆕 v2: pasamos data.categories como 4º argumento para que el informe
  // muestre los nombres frescos (si el usuario renombró alguna).
  const budgetUsage = calcBudgetUsage(
    data.budgets || [],
    data.variableExpenses || [],
    selectedMonth,
    data.categories || []
  );

  const savingsGoals = data.savingsGoals || [];
  const savingsDeposits = data.savingsDeposits || [];

  // ══════════════════════════════════════════════
  // Descargar el informe como PDF
  // - Carga html2pdf.js de forma perezosa para no inflar el bundle inicial
  // - Marca el contenedor con clase `report-printing` durante la captura
  //   para que el CSS de impresión expanda el contenido y oculte botones
  // ══════════════════════════════════════════════
  const handleDownloadPdf = async () => {
    if (!reportRef.current || downloading) return;

    setDownloading(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;

      // Nombre del archivo: informe-YYYY-MM.pdf usando el ciclo seleccionado
      const filename = `informe-${selectedMonth || "ciclo"}.pdf`;

      // Marcamos el contenedor para que el CSS de captura entre en juego
      reportRef.current.classList.add("report-printing");

      const opt = {
        margin: [10, 10, 10, 10], // mm
        filename,
        image: { type: "jpeg", quality: 0.95 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          // Ignorar elementos marcados con data-no-print (los botones del header)
          ignoreElements: (el) => el?.dataset?.noPrint === "true",
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
        },
        pagebreak: { mode: ["css", "legacy"] },
      };

      await html2pdf().set(opt).from(reportRef.current).save();
    } catch (err) {
      console.error("Error generando PDF:", err);
      alert("No se pudo generar el PDF. Inténtalo de nuevo.");
    } finally {
      // Quitamos siempre la clase, haya ido bien o mal
      if (reportRef.current) {
        reportRef.current.classList.remove("report-printing");
      }
      setDownloading(false);
    }
  };

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
          <div style={{ display: "flex", alignItems: "center", gap: 8 }} data-no-print="true">
            <button
              className="btn-secondary"
              onClick={handleDownloadPdf}
              disabled={downloading}
              style={{
                fontSize: 12,
                padding: "6px 12px",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                opacity: downloading ? 0.6 : 1,
                cursor: downloading ? "wait" : "pointer",
              }}
              title="Descargar informe como PDF"
            >
              {downloading ? (
                <>
                  <span className="spinner-dot" style={{ width: 12, height: 12 }} />
                  <span>Generando…</span>
                </>
              ) : (
                <>
                  <span>📄</span>
                  <span>Descargar PDF</span>
                </>
              )}
            </button>
            <button className="modal__close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Contenedor que se exporta a PDF */}
        <div className="modal__body" ref={reportRef}>
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

          <HealthSection metrics={metrics} ratio={ratio} ratioEval={ratioEval} />

          <ReportSection
            title="Ingresos"
            total={totalIncomes}
            color="var(--success)"
            items={filteredIncomes.map((i) => ({
              name: i.concepto + (i.titular && i.titular !== "yo" ? ` (${i.titular})` : ""),
              amount: i.amount,
            }))}
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

          <BudgetReportSection usage={budgetUsage} />

          <SavingsReportSection
            goals={savingsGoals}
            deposits={savingsDeposits}
            cycleMK={selectedMonth}
          />

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

          {/* Pie de página visible solo en el PDF */}
          <div className="report-pdf-footer" style={{
            display: "none",
            marginTop: 24,
            paddingTop: 12,
            borderTop: "1px solid var(--border-subtle)",
            fontSize: 10,
            color: "var(--text-tertiary)",
            textAlign: "center",
          }}>
            Generado el {new Date().toLocaleDateString("es-ES", {
              day: "2-digit", month: "long", year: "numeric",
            })} · Finanzas Familiares
          </div>
        </div>
      </div>

      {/* Estilos aplicados solo durante la captura para PDF.
          - Expande la altura del modal para que entre todo el contenido
          - Asegura fondo blanco y oculta scrollbars
          - Muestra el pie de página del PDF */}
      <style>{`
        .modal__body.report-printing {
          max-height: none !important;
          overflow: visible !important;
          background: #ffffff !important;
        }
        .modal__body.report-printing .report-pdf-footer {
          display: block !important;
        }
      `}</style>
    </div>
  );
}
