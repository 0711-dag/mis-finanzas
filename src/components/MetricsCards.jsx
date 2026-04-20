// ══════════════════════════════════════════════
// 📈 Tarjetas de métricas financieras (bloque superior)
//
// Estructura en 3 filas de 3 cards:
//   Fila 1: Balance del ciclo · Egresos totales · Pendiente
//   Fila 2: CF · CV · Discrecional
//   Fila 3: Ingresos · Ratio endeudamiento · Aportes a metas
//
// Fuente única de egresos: calcExpenseBreakdown (finance.js).
// Se elimina la redundancia histórica de `totalPayments + totalVarExpenses`.
// Usado tanto en Dashboard desktop como en MobileSummary.
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

export default function MetricsCards({ data, selectedMonth, totalPending = 0, compact }) {
  if (!data) return null;

  const metrics = calcMonthlyMetrics(data, selectedMonth);
  const breakdown = calcExpenseBreakdown(data, selectedMonth);
  const ratio = calcDebtRatio(metrics.cuotasDeuda, metrics.ingresos);
  const ratioEval = evalDebtRatio(ratio);
  const debtTotals = calcDebtTotals(data.debts || []);

  // Balance real del ciclo: ingresos − egresos totales (clasificados)
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
    danger:  { fg: "var(--danger)",  bg: "var(--danger-bg)",  text: "var(--danger-text)" },
    neutral: { fg: "var(--text-primary)", bg: "var(--bg-subtle)", text: "var(--text-secondary)" },
  };

  // ── Colores por tipo de gasto (reutilizan paleta existente) ──
  // CF: rojo (no renunciable) · CV: naranja (necesario pero modulable) · Discrecional: violeta (opcional)
  const cfColor = { fg: "var(--danger)",  bg: "var(--danger-bg)",  text: "var(--danger-text)" };
  const cvColor = { fg: "var(--warning)", bg: "var(--warning-bg)", text: "var(--warning-text)" };
  const discColor = {
    fg: "var(--category-debt, var(--accent))",
    bg: "var(--category-debt-bg, var(--bg-subtle))",
    text: "var(--category-debt, var(--accent))",
  };

  const ingresosOk = metrics.ingresos > 0;

  // ── Definición de las 9 cards (en orden de render) ──
  const cards = [
    // ══ FILA 1: Balance · Egresos totales · Pendiente ══
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
        formula: "Ingresos − Egresos totales",
      },
    },
    {
      label: "Egresos totales",
      icon: "📤",
      value: fmt(breakdown.egresosTotales),
      sub: `CF + CV + Discrecional`,
      tag: null,
      color: colorMap.danger,
      info: {
        title: "Egresos totales",
        description:
          "Todo lo que sale en el ciclo, sumando gastos fijos, cuotas de deuda, gastos variables y discrecionales.",
        formula: "CF + CV + Discrecional",
      },
    },
    {
      label: "Pendiente",
      icon: "⏳",
      value: fmt(totalPending),
      sub: totalPending > 0 ? "Pagos sin marcar" : "Todo al día",
      tag: null,
      color: totalPending > 0 ? colorMap.warning : colorMap.success,
      info: {
        title: "Pendiente de pago",
        description:
          "Suma de pagos programados del ciclo que todavía no están marcados como PAGADO.",
        formula: "Σ pagos con estado = PENDIENTE",
      },
    },

    // ══ FILA 2: CF · CV · Discrecional ══
    {
      label: "CF · Costo fijo",
      icon: "🏠",
      value: fmt(breakdown.cf),
      sub: "Vivienda, seguros, cuotas…",
      tag: null,
      color: cfColor,
      info: {
        title: "Costo Fijo (CF)",
        description:
          "Gastos que no cambian aunque no uses nada: alquiler/hipoteca, seguros, educación y cuotas de deuda. Son los más difíciles de reducir.",
        formula: "Σ gastos fijos CF + cuotas de deuda",
      },
    },
    {
      label: "CV · Costo variable",
      icon: "🛒",
      value: fmt(breakdown.cv),
      sub: "Luz, agua, súper, transporte…",
      tag: null,
      color: cvColor,
      info: {
        title: "Costo Variable (CV)",
        description:
          "Necesarios pero dependen del uso: suministros, supermercado, transporte, salud. Se pueden optimizar con hábitos.",
        formula: "Σ gastos clasificados como CV",
      },
    },
    {
      label: "Discrecional",
      icon: "🎭",
      value: fmt(breakdown.discrecional),
      sub: "Ocio, ropa, suscripciones…",
      tag: null,
      color: discColor,
      info: {
        title: "Gasto discrecional",
        description:
          "Opcional, no esencial. Es la primera palanca cuando hay que recortar: ocio, restaurantes, ropa, suscripciones.",
        formula: "Σ gastos clasificados como Discrecional",
      },
    },

    // ══ FILA 3: Ingresos · Ratio endeudamiento · Aportes a metas ══
    {
      label: "Ingresos",
      icon: "💰",
      value: fmt(metrics.ingresos),
      sub: ingresosOk ? "Entran este ciclo" : "Sin ingresos registrados",
      tag: null,
      color: colorMap.success,
      info: {
        title: "Ingresos del ciclo",
        description:
          "Suma de todos los ingresos registrados dentro del ciclo financiero seleccionado.",
        formula: "Σ ingresos del ciclo",
      },
    },
    {
      label: "Ratio endeudamiento",
      icon: "💳",
      value: ingresosOk ? `${ratio.toFixed(1)}%` : "—",
      sub: ingresosOk ? `${fmt(metrics.cuotasDeuda)} en cuotas` : "Sin ingresos",
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
      label: "Aportes a metas",
      icon: "🎯",
      value: fmt(metrics.aportesMetas),
      sub: metrics.aportesMetas > 0 ? "Depositado este ciclo" : "Sin aportes este ciclo",
      tag: null,
      color: metrics.aportesMetas > 0 ? colorMap.success : colorMap.neutral,
      info: {
        title: "Aportes a metas de ahorro",
        description:
          "Dinero que has depositado en tus metas de ahorro durante este ciclo. Es ahorro efectivo, ya apartado.",
        formula: "Σ depósitos a metas del ciclo",
      },
    },
  ];

  // ── Render: grid fijo de 3 columnas en ambos modos ──
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
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

          {/* Cabecera: icono + label */}
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

          {/* Valor principal */}
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

          {/* Subtexto */}
          <div style={{
            fontSize: compact ? 10 : 11,
            color: "var(--text-tertiary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {c.sub}
          </div>

          {/* Etiqueta opcional (superávit/déficit, ratio saludable, etc.) */}
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
