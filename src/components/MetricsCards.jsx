// ══════════════════════════════════════════════
// 📈 Tarjetas de métricas financieras (bloque superior)
// Muestra: Balance del ciclo, Ratio de endeudamiento, Deuda total
// Usado tanto en Dashboard desktop como en MobileSummary
// ══════════════════════════════════════════════
import { fmt } from "../utils/format.js";
import {
  calcMonthlyMetrics,
  calcDebtRatio,
  evalDebtRatio,
  calcDebtTotals,
  calcExpenseBreakdown,
} from "../utils/finance.js";
import InfoHint from "./shared/InfoHint.jsx";

export default function MetricsCards({ data, selectedMonth, compact }) {
  if (!data) return null;

  const metrics = calcMonthlyMetrics(data, selectedMonth);
  const breakdown = calcExpenseBreakdown(data, selectedMonth);
  const ratio = calcDebtRatio(metrics.cuotasDeuda, metrics.ingresos);
  const ratioEval = evalDebtRatio(ratio);
  const debtTotals = calcDebtTotals(data.debts || []);

  // Balance real del ciclo: ingresos − egresos totales
  const balanceCiclo = metrics.ingresos - breakdown.egresosTotales;

  // Estado del balance (etiqueta + color)
  const balanceLabel =
    balanceCiclo > 0 ? "Superávit"
    : balanceCiclo === 0 ? "Equilibrio"
    : "Déficit";

  const balanceColorKey =
    balanceCiclo > 0 ? "success"
    : balanceCiclo === 0 ? "warning"
    : "danger";

  const colorMap = {
    success: { fg: "var(--success)", bg: "var(--success-bg)", text: "var(--success-text)" },
    warning: { fg: "var(--warning)", bg: "var(--warning-bg)", text: "var(--warning-text)" },
    danger: { fg: "var(--danger)", bg: "var(--danger-bg)", text: "var(--danger-text)" },
  };

  const cards = [
    {
      label: "Balance del ciclo",
      icon: "⚖️",
      value: fmt(balanceCiclo),
      sub: `${fmt(metrics.ingresos)} entran · ${fmt(breakdown.egresosTotales)} salen`,
      tag: balanceLabel,
      color: colorMap[balanceColorKey],
      info: {
        title: "Balance del ciclo",
        description:
          "Es lo que queda tras cubrir todos tus egresos. Positivo = ahorras. Negativo = gastas más de lo que ingresas.",
        formula: "Ingresos − Egresos Totales",
      },
    },
    {
      label: "Ratio endeudamiento",
      icon: "💳",
      value: metrics.ingresos > 0 ? `${ratio.toFixed(1)}%` : "—",
      sub: metrics.ingresos > 0 ? `${fmt(metrics.cuotasDeuda)} en cuotas` : "Sin ingresos",
      tag: ratioEval.label,
      color: colorMap[ratioEval.color] || colorMap.success,
      info: {
        title: "Ratio de endeudamiento",
        description:
          "Qué porcentaje de tus ingresos se va en cuotas de deuda. Saludable < 20%, aceptable < 35%, crítico > 50%.",
        formula: "(Cuotas de deuda ÷ Ingresos) × 100",
      },
    },
    {
      label: "Deuda total",
      icon: "🏦",
      value: fmt(debtTotals.total),
      sub: debtTotals.activeCount > 0
        ? `${debtTotals.activeCount} ${debtTotals.activeCount === 1 ? "deuda activa" : "deudas activas"}`
        : "Sin deudas",
      tag: null,
      color: debtTotals.total > 0
        ? { fg: "var(--category-debt)", bg: "var(--category-debt-bg)", text: "var(--category-debt)" }
        : colorMap.success,
      info: {
        title: "Deuda total",
        description:
          "Suma del saldo pendiente de todas tus deudas activas (tarjetas, préstamos, cuotas). No incluye pagos futuros planificados, solo lo que aún debes.",
        formula: "Σ saldos pendientes de deudas activas",
      },
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
            padding: compact ? "10px 10px" : "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: compact ? 2 : 4,
            position: "relative",
            minWidth: 0,
            overflow: "visible", // necesario para que el popover/tooltip no quede recortado
          }}
        >
          {/* Icono de información en la esquina superior derecha */}
          {c.info && (
            <div style={{ position: "absolute", top: 6, right: 8 }}>
              <InfoHint {...c.info} align="right" />
            </div>
          )}

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: compact ? 10 : 11,
            color: "var(--text-secondary)",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.4,
            paddingRight: 22, // deja hueco para el icono ⓘ
            minWidth: 0,
          }}>
            <span>{c.icon}</span>
            <span style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
            }}>
              {c.label}
            </span>
          </div>

          <div style={{
            fontSize: compact ? 18 : 22,
            fontWeight: 700,
            color: c.color.fg,
            letterSpacing: "-0.02em",
            fontFeatureSettings: "'tnum'",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {c.value}
          </div>

          <div style={{
            fontSize: compact ? 10 : 11,
            color: "var(--text-tertiary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {c.sub}
          </div>

          {c.tag && (
            <div style={{
              alignSelf: "flex-start",
              marginTop: 4,
              padding: "2px 8px",
              borderRadius: "var(--radius-pill)",
              background: c.color.bg,
              color: c.color.text,
              fontSize: 10,
              fontWeight: 700,
            }}>
              {c.tag}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
