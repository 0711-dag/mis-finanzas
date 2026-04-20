// ══════════════════════════════════════════════
// 📈 Tarjetas de métricas financieras (bloque superior)
//
// Estructura nueva:
//  1. Fila de 3: Costos Fijos · Costos Variables · Discrecional
//     → cada una muestra total del ciclo + lo ya ejecutado
//  2. Fila de 1: Progreso del calendario
//     → desglose Fijos / Cuotas / Manuales (pagado / total) + barra global
//  3. Fila de 2: Deuda total · Ratio endeudamiento
//
// Usado tanto en Dashboard desktop como en MobileSummary (prop `compact`).
// ══════════════════════════════════════════════
import { fmt } from "../utils/format.js";
import {
  calcMonthlyMetrics,
  calcDebtRatio,
  evalDebtRatio,
  calcDebtTotals,
  calcExpenseBreakdownDetailed,
} from "../utils/finance.js";
import InfoHint from "./shared/InfoHint.jsx";

// ──────────────────────────────────────────────
// Paleta por tipo de gasto
// Reutilizamos variables del tema para no introducir colores nuevos.
// ──────────────────────────────────────────────
const TIPO_COLORS = {
  cf: {
    fg: "var(--category-debt)",            // morado-azulado (estable, estructural)
    bg: "var(--category-debt-bg)",
  },
  cv: {
    fg: "var(--category-expense)",         // rojo/naranja del gasto variable
    bg: "var(--category-expense-bg, var(--danger-bg))",
  },
  disc: {
    fg: "var(--warning)",                  // ámbar — opcional, reducible
    bg: "var(--warning-bg)",
  },
};

// Colores para cada origen en la tarjeta de progreso del calendario
const ORIGEN_COLORS = {
  fijos:    "var(--category-recurring)",
  cuotas:   "var(--category-debt)",
  manuales: "var(--text-secondary)",
};

// ──────────────────────────────────────────────
// Tarjeta de tipo de gasto (CF / CV / Discrecional)
// Muestra total + ejecutado + % del total de egresos
// ──────────────────────────────────────────────
function TipoCard({ label, icon, value, ejecutado, pct, color, info, compact }) {
  const pctLabel = pct > 0 ? `${pct.toFixed(1)}%` : "—";

  return (
    <div
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
        overflow: "visible",
      }}
    >
      {info && (
        <div style={{ position: "absolute", top: 6, right: 8 }}>
          <InfoHint {...info} align="right" />
        </div>
      )}

      {/* Etiqueta */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: compact ? 10 : 11,
        color: "var(--text-secondary)",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: 0.4,
        paddingRight: 22,
        minWidth: 0,
      }}>
        <span>{icon}</span>
        <span style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          minWidth: 0,
        }}>
          {label}
        </span>
      </div>

      {/* Valor principal (total del ciclo) */}
      <div style={{
        fontSize: compact ? 18 : 22,
        fontWeight: 700,
        color: color.fg,
        letterSpacing: "-0.02em",
        fontFeatureSettings: "'tnum'",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>
        {fmt(value)}
      </div>

      {/* Subtítulo: ya ejecutado */}
      <div style={{
        fontSize: compact ? 10 : 11,
        color: "var(--text-tertiary)",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>
        {fmt(ejecutado)} ya ejecutado
      </div>

      {/* Barra proporcional al % sobre egresos totales */}
      <div style={{
        marginTop: 6,
        height: 4,
        background: "var(--bg-subtle)",
        borderRadius: 999,
        overflow: "hidden",
      }}>
        <div style={{
          width: `${Math.min(100, Math.max(0, pct))}%`,
          height: "100%",
          background: color.fg,
          transition: "width 0.3s ease",
        }} />
      </div>

      {/* Tag con % del total */}
      <div style={{
        alignSelf: "flex-start",
        marginTop: 4,
        padding: "2px 8px",
        borderRadius: "var(--radius-pill)",
        background: color.bg,
        color: color.fg,
        fontSize: 10,
        fontWeight: 700,
      }}>
        {pctLabel} del total
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Tarjeta de Progreso del calendario (Opción C)
// Barra global + desglose por origen (fijos / cuotas / manuales)
// ──────────────────────────────────────────────
function ProgresoCalendarioCard({ calendario, compact }) {
  const { fijos, cuotas, manuales, total } = calendario;
  const pctGlobal = total.total > 0 ? (total.pagado / total.total) * 100 : 0;
  const pendiente = Math.max(0, total.total - total.pagado);

  // Sólo mostramos filas de orígenes que tengan algún importe (total > 0)
  const rows = [
    { key: "fijos",    label: "🔄 Fijos",    data: fijos,    color: ORIGEN_COLORS.fijos },
    { key: "cuotas",   label: "💳 Cuotas",   data: cuotas,   color: ORIGEN_COLORS.cuotas },
    { key: "manuales", label: "📝 Manuales", data: manuales, color: ORIGEN_COLORS.manuales },
  ].filter((r) => r.data.total > 0);

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        padding: compact ? "12px 12px" : "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        position: "relative",
        minWidth: 0,
        overflow: "visible",
        gridColumn: "1 / -1", // ocupa toda la fila dentro del grid
      }}
    >
      {/* Botón de info */}
      <div style={{ position: "absolute", top: 6, right: 8 }}>
        <InfoHint
          title="Progreso del calendario"
          description="Cuánto has pagado del total programado este ciclo, desglosado por origen: gastos fijos recurrentes, cuotas de deudas y pagos manuales."
          formula="Pagado ÷ Total programado × 100"
          align="right"
        />
      </div>

      {/* Cabecera: título + % global */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        paddingRight: 22,
      }}>
        <div style={{
          fontSize: compact ? 10 : 11,
          color: "var(--text-secondary)",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.4,
        }}>
          📅 Progreso del calendario
        </div>
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          color: "var(--text-primary)",
          fontFeatureSettings: "'tnum'",
        }}>
          {total.total > 0 ? `${pctGlobal.toFixed(0)}%` : "—"}
        </div>
      </div>

      {/* Barra de progreso global */}
      <div style={{
        height: 8,
        background: "var(--bg-subtle)",
        borderRadius: 999,
        overflow: "hidden",
      }}>
        <div style={{
          width: `${Math.min(100, Math.max(0, pctGlobal))}%`,
          height: "100%",
          background: "var(--success)",
          transition: "width 0.3s ease",
        }} />
      </div>

      {/* Desglose por origen */}
      {rows.length === 0 ? (
        <div style={{
          fontSize: 12,
          color: "var(--text-tertiary)",
          textAlign: "center",
          padding: "6px 0",
        }}>
          Sin pagos programados este ciclo
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: compact ? "1fr" : "1fr 1fr",
          gap: "6px 16px",
          fontSize: 12,
        }}>
          {rows.map((r) => (
            <div
              key={r.key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
                minWidth: 0,
              }}
            >
              <span style={{
                color: r.color,
                fontWeight: 600,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
              }}>
                {r.label}
              </span>
              <span style={{
                fontFeatureSettings: "'tnum'",
                whiteSpace: "nowrap",
              }}>
                <span style={{ color: "var(--success)", fontWeight: 600 }}>
                  {fmt(r.data.pagado)}
                </span>
                {" / "}
                <span style={{ color: "var(--text-tertiary)" }}>
                  {fmt(r.data.total)}
                </span>
              </span>
            </div>
          ))}

          {/* Fila total destacada */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            minWidth: 0,
            gridColumn: compact ? "1 / -1" : "1 / -1",
            marginTop: 4,
            paddingTop: 6,
            borderTop: "1px dashed var(--border-subtle)",
          }}>
            <span style={{
              color: "var(--text-secondary)",
              fontWeight: 700,
              textTransform: "uppercase",
              fontSize: 10,
              letterSpacing: 0.4,
            }}>
              Total · Pendiente {fmt(pendiente)}
            </span>
            <span style={{
              fontFeatureSettings: "'tnum'",
              whiteSpace: "nowrap",
              fontWeight: 700,
            }}>
              <span style={{ color: "var(--success)" }}>
                {fmt(total.pagado)}
              </span>
              {" / "}
              <span style={{ color: "var(--text-secondary)" }}>
                {fmt(total.total)}
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Tarjeta genérica (usada para Deuda total y Ratio endeudamiento)
// ──────────────────────────────────────────────
function GenericCard({ label, icon, value, sub, tag, color, info, compact }) {
  return (
    <div
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
        overflow: "visible",
      }}
    >
      {info && (
        <div style={{ position: "absolute", top: 6, right: 8 }}>
          <InfoHint {...info} align="right" />
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
        paddingRight: 22,
        minWidth: 0,
      }}>
        <span>{icon}</span>
        <span style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          minWidth: 0,
        }}>
          {label}
        </span>
      </div>

      <div style={{
        fontSize: compact ? 18 : 22,
        fontWeight: 700,
        color: color.fg,
        letterSpacing: "-0.02em",
        fontFeatureSettings: "'tnum'",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>
        {value}
      </div>

      <div style={{
        fontSize: compact ? 10 : 11,
        color: "var(--text-tertiary)",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>
        {sub}
      </div>

      {tag && (
        <div style={{
          alignSelf: "flex-start",
          marginTop: 4,
          padding: "2px 8px",
          borderRadius: "var(--radius-pill)",
          background: color.bg,
          color: color.text,
          fontSize: 10,
          fontWeight: 700,
        }}>
          {tag}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// Componente principal
// ══════════════════════════════════════════════
export default function MetricsCards({ data, selectedMonth, compact }) {
  if (!data) return null;

  const metrics = calcMonthlyMetrics(data, selectedMonth);
  const detail = calcExpenseBreakdownDetailed(data, selectedMonth);
  const ratio = calcDebtRatio(metrics.cuotasDeuda, metrics.ingresos);
  const ratioEval = evalDebtRatio(ratio);
  const debtTotals = calcDebtTotals(data.debts || []);

  // % de cada tipo sobre el total de egresos
  const totalEgresos = detail.egresosTotales.total;
  const pctCf   = totalEgresos > 0 ? (detail.cf.total / totalEgresos) * 100 : 0;
  const pctCv   = totalEgresos > 0 ? (detail.cv.total / totalEgresos) * 100 : 0;
  const pctDisc = totalEgresos > 0 ? (detail.discrecional.total / totalEgresos) * 100 : 0;

  const colorMap = {
    success: { fg: "var(--success)", bg: "var(--success-bg)", text: "var(--success-text)" },
    warning: { fg: "var(--warning)", bg: "var(--warning-bg)", text: "var(--warning-text)" },
    danger:  { fg: "var(--danger)",  bg: "var(--danger-bg)",  text: "var(--danger-text)"  },
  };

  // Configuración de las 3 tarjetas de tipo de gasto
  const tipoCards = [
    {
      key: "cf",
      label: "Costos fijos",
      icon: "🏛️",
      value: detail.cf.total,
      ejecutado: detail.cf.ejecutado,
      pct: pctCf,
      color: TIPO_COLORS.cf,
      info: {
        title: "Costos fijos (CF)",
        description:
          "Gastos estables del hogar: vivienda, seguros, educación y cuotas de deuda. No cambian aunque no uses nada. Son la base que tienes que cubrir sí o sí.",
        formula: "Fijos CF + Cuotas de deuda",
      },
    },
    {
      key: "cv",
      label: "Costos variables",
      icon: "🛒",
      value: detail.cv.total,
      ejecutado: detail.cv.ejecutado,
      pct: pctCv,
      color: TIPO_COLORS.cv,
      info: {
        title: "Costos variables (CV)",
        description:
          "Gastos necesarios pero que varían con el uso: luz, transporte, supermercado, salud, hogar. Se pueden optimizar.",
        formula: "Variables CV + Fijos CV (luz, agua…)",
      },
    },
    {
      key: "disc",
      label: "Discrecional",
      icon: "🎉",
      value: detail.discrecional.total,
      ejecutado: detail.discrecional.ejecutado,
      pct: pctDisc,
      color: TIPO_COLORS.disc,
      info: {
        title: "Gastos discrecionales",
        description:
          "Gastos opcionales: ocio, restaurantes, ropa, suscripciones. Son los primeros que se recortan si hace falta ajustar el presupuesto.",
        formula: "Todo lo etiquetado como Discrecional",
      },
    },
  ];

  // Tarjetas inferiores: Deuda total + Ratio endeudamiento
  const bottomCards = [
    {
      key: "deuda",
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
    {
      key: "ratio",
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
  ];

  // Estilos comunes para las filas de tarjetas
  const gap = compact ? 6 : 10;
  const mb = compact ? 10 : 14;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: mb, marginBottom: compact ? 12 : 18 }}>
      {/* Fila 1: CF · CV · Discrecional */}
      <div style={{
        display: "grid",
        gridTemplateColumns: compact
          ? "repeat(3, 1fr)"
          : "repeat(auto-fit, minmax(170px, 1fr))",
        gap,
      }}>
        {tipoCards.map((c) => (
          <TipoCard key={c.key} {...c} compact={compact} />
        ))}
      </div>

      {/* Fila 2: Progreso del calendario (ancho completo) */}
      <ProgresoCalendarioCard calendario={detail.calendario} compact={compact} />

      {/* Fila 3: Deuda total · Ratio endeudamiento */}
      <div style={{
        display: "grid",
        gridTemplateColumns: compact
          ? "repeat(2, 1fr)"
          : "repeat(auto-fit, minmax(200px, 1fr))",
        gap,
      }}>
        {bottomCards.map((c) => (
          <GenericCard key={c.key} {...c} compact={compact} />
        ))}
      </div>
    </div>
  );
}
