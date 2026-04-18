// ══════════════════════════════════════════════
// 📈 Tarjetas de métricas financieras
// Muestra: tasa de ahorro, ratio de endeudamiento, deuda total
// Usado tanto en Dashboard desktop como en MobileSummary
// ══════════════════════════════════════════════
import { fmt } from "../utils/format.js";
import {
  calcMonthlyMetrics,
  calcDebtRatio,
  evalDebtRatio,
  calcDebtTotals,
} from "../utils/finance.js";

export default function MetricsCards({ data, selectedMonth, compact }) {
  if (!data) return null;

  const metrics = calcMonthlyMetrics(data, selectedMonth);
  const ratio = calcDebtRatio(metrics.cuotasDeuda, metrics.ingresos);
  const ratioEval = evalDebtRatio(ratio);
  const debtTotals = calcDebtTotals(data.debts || []);

  // Color de la tasa de ahorro
  const ahorroColor =
    metrics.tasaAhorro >= 20 ? "success"
    : metrics.tasaAhorro >= 10 ? "warning"
    : metrics.tasaAhorro > 0 ? "warning"
    : "danger";

  const colorMap = {
    success: { fg: "var(--success)", bg: "var(--success-bg)", text: "var(--success-text)" },
    warning: { fg: "var(--warning)", bg: "var(--warning-bg)", text: "var(--warning-text)" },
    danger: { fg: "var(--danger)", bg: "var(--danger-bg)", text: "var(--danger-text)" },
  };

  // Etiqueta descriptiva de la tasa de ahorro
  const ahorroLabel =
    metrics.tasaAhorro >= 20 ? "Excelente"
    : metrics.tasaAhorro >= 10 ? "Aceptable"
    : metrics.tasaAhorro > 0 ? "Bajo"
    : "Sin ahorro";

  const cards = [
    {
      label: "Tasa de ahorro",
      icon: "💰",
      value: `${metrics.tasaAhorro.toFixed(1)}%`,
      sub: `${fmt(metrics.ahorroReal)} este ciclo`,
      tag: ahorroLabel,
      color: colorMap[ahorroColor],
    },
    {
      label: "Ratio endeudamiento",
      icon: "⚖️",
      value: metrics.ingresos > 0 ? `${ratio.toFixed(1)}%` : "—",
      sub: metrics.ingresos > 0 ? `${fmt(metrics.cuotasDeuda)} en cuotas` : "Sin ingresos",
      tag: ratioEval.label,
      color: colorMap[ratioEval.color] || colorMap.success,
    },
    {
      label: "Deuda total",
      icon: "💳",
      value: fmt(debtTotals.total),
      sub: debtTotals.activeCount > 0
        ? `${debtTotals.activeCount} ${debtTotals.activeCount === 1 ? "deuda activa" : "deudas activas"}`
        : "Sin deudas",
      tag: null,
      color: debtTotals.total > 0
        ? { fg: "var(--category-debt)", bg: "var(--category-debt-bg)", text: "var(--category-debt)" }
        : colorMap.success,
    },
  ];

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: compact ? "repeat(3, 1fr)" : "repeat(auto-fit, minmax(180px, 1fr))",
      gap: compact ? 6 : 10,
      marginBottom: compact ? 12 : 18,
    }}>
      {cards.map((c, i) => (
        <div
          key={i}
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: compact ? 10 : 14,
            display: "flex",
            flexDirection: "column",
            gap: compact ? 4 : 6,
            minWidth: 0,
          }}
        >
          {/* Cabecera: icono + label */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            fontSize: compact ? 10 : 11,
            color: "var(--text-secondary)",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 0.4,
          }}>
            <span style={{ fontSize: compact ? 12 : 14 }}>{c.icon}</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {c.label}
            </span>
          </div>

          {/* Valor principal */}
          <div style={{
            fontSize: compact ? 18 : 22,
            fontWeight: 800,
            color: c.color.fg,
            fontFeatureSettings: "'tnum'",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
          }}>
            {c.value}
          </div>

          {/* Sub-texto */}
          <div style={{
            fontSize: compact ? 10 : 11,
            color: "var(--text-tertiary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {c.sub}
          </div>

          {/* Tag/badge opcional */}
          {c.tag && (
            <div style={{
              display: "inline-flex",
              alignSelf: "flex-start",
              padding: "2px 8px",
              borderRadius: "var(--radius-pill)",
              background: c.color.bg,
              color: c.color.text,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.2,
              marginTop: 2,
            }}>
              {c.tag}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
