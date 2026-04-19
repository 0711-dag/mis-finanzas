// ══════════════════════════════════════════════
// 📱 Pantalla de resumen móvil (home)
// Bloque superior: Balance + MetricsCards (Balance/Ratio/Deuda total)
// Fila inferior: Ingresos · Egresos Totales · Pendiente
// ══════════════════════════════════════════════
import { fmt, fmtDate } from "../../utils/format.js";
import MetricsCards from "../MetricsCards.jsx";
import InfoHint from "../shared/InfoHint.jsx";

export default function MobileSummary({
  totalIncomes,
  totalPayments,
  totalVarExpenses,
  totalPending,
  totalDebtPending,
  egresosTotales,
  reportBalance,
  filteredPayments,
  filteredVarExpenses,
  filteredIncomes,
  data,
  selectedMonth,
  onShowReport,
  save,
}) {
  // Fallback defensivo: si no llega egresosTotales (p. ej. renderizado antes del refactor
  // completo del padre) lo reconstruimos a partir de los totales clásicos.
  const egresos = typeof egresosTotales === "number"
    ? egresosTotales
    : (totalPayments + totalVarExpenses);

  // Combinar últimos movimientos (pagos + gastos variables) ordenados por fecha desc
  const recent = [
    ...filteredPayments.map((p) => ({
      id: p.id,
      type: "payment",
      data: p,
      date: p.dayPago,
      amount: p.monto,
      concepto: p.concepto,
      isRecurring: !!p.fixedExpenseId,
      isDebt: !!p.debtId && !p.fixedExpenseId,
      paid: p.estado === "PAGADO",
    })),
    ...filteredVarExpenses.map((v) => ({
      id: v.id,
      type: "variable",
      data: v,
      date: v.fecha,
      amount: v.monto,
      concepto: v.concepto,
      categoria: v.categoria,
    })),
    ...filteredIncomes.map((i) => ({
      id: i.id,
      type: "income",
      data: i,
      date: i.fecha,
      amount: i.amount,
      concepto: i.concepto,
    })),
  ]
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .slice(0, 6);

  const togglePaymentStatus = (payment) => {
    const newEstado = payment.estado === "PAGADO" ? "PENDIENTE" : "PAGADO";
    const linkedDebt = payment.debtId ? (data.debts || []).find((d) => d.id === payment.debtId) : null;
    const hasPlan = linkedDebt && linkedDebt.totalCuotas > 0;

    let nd = { ...data, payments: data.payments.map((r) => (r.id === payment.id ? { ...r, estado: newEstado } : r)) };

    if (payment.debtId && linkedDebt && hasPlan) {
      if (newEstado === "PAGADO") {
        nd = {
          ...nd,
          debts: nd.debts.map((r) =>
            r.id === payment.debtId
              ? { ...r, cuotaActual: (linkedDebt.cuotaActual || 0) + 1, saldoPendiente: Math.max(0, (linkedDebt.saldoPendiente || 0) - (linkedDebt.proxCuota || 0)) }
              : r
          ),
        };
      } else {
        nd = {
          ...nd,
          debts: nd.debts.map((r) =>
            r.id === payment.debtId
              ? { ...r, cuotaActual: Math.max(0, (linkedDebt.cuotaActual || 0) - 1), saldoPendiente: (linkedDebt.saldoPendiente || 0) + (linkedDebt.proxCuota || 0) }
              : r
          ),
        };
      }
    }
    save(nd);
  };

  // Tarjetas de la fila inferior (con ⓘ explicativo en cada una)
  const bottomCards = [
    {
      label: "Ingresos",
      value: totalIncomes,
      cls: "stat-card__value--success",
      info: {
        title: "Ingresos",
        description: "Suma de todo el dinero que entra este ciclo.",
        formula: "Σ ingresos del ciclo",
      },
    },
    {
      label: "Egresos Totales",
      value: egresos,
      cls: "stat-card__value--danger",
      info: {
        title: "Egresos Totales",
        description: "Todo lo que sale este ciclo: CF + CV + gasto discrecional.",
        formula: "CF + CV + Discrecional",
      },
    },
    {
      label: "Pendiente",
      value: totalPending,
      cls: "stat-card__value--warning",
      info: {
        title: "Pendiente del ciclo",
        description: "Pagos programados que aún no has marcado como pagados.",
        formula: "Σ pagos con estado = PENDIENTE",
      },
    },
  ];

  return (
    <>
      {/* Hero balance */}
      <div className="hero-balance">
        <div className="hero-balance__label">Balance del ciclo</div>
        <div className="hero-balance__value" style={{ color: reportBalance >= 0 ? "var(--text-primary)" : "var(--danger)" }}>
          {fmt(reportBalance)}
        </div>
        <div className={`hero-balance__badge ${reportBalance < 0 ? "hero-balance__badge--neg" : ""}`}>
          {reportBalance >= 0 ? "Todo bajo control" : "Gastas de más"}
        </div>
      </div>

      {/* 🆕 MÉTRICAS FINANCIERAS (bloque superior: Balance, Ratio, Deuda total) */}
      <MetricsCards data={data} selectedMonth={selectedMonth} compact />

      {/* Fila inferior: Ingresos · Egresos Totales · Pendiente */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 6,
          marginBottom: 12,
        }}
      >
        {bottomCards.map((c, i) => (
          <div key={i} className="stat-card" style={{ position: "relative", overflow: "visible", padding: "10px 10px" }}>
            <div style={{ position: "absolute", top: 4, right: 6 }}>
              <InfoHint {...c.info} align="right" />
            </div>
            <div className="stat-card__label" style={{ paddingRight: 22, fontSize: 10 }}>{c.label}</div>
            <div className={`stat-card__value ${c.cls}`} style={{ fontSize: 15 }}>{fmt(c.value)}</div>
          </div>
        ))}
      </div>

      {/* Últimos movimientos */}
      <div className="section-header">
        <div className="section-header__title">Movimientos recientes</div>
        <button className="section-header__action" onClick={onShowReport}>Ver informe →</button>
      </div>

      {recent.length === 0 ? (
        <div className="empty">
          <div className="empty__emoji">📭</div>
          <div className="empty__title">Nada este ciclo</div>
          <div className="empty__subtitle">Usa el botón + para añadir tu primer gasto</div>
        </div>
      ) : (
        <div className="item-list">
          {recent.map((r) => (
            <MovementItem
              key={`${r.type}-${r.id}`}
              movement={r}
              onTogglePaid={r.type === "payment" ? () => togglePaymentStatus(r.data) : null}
            />
          ))}
        </div>
      )}
    </>
  );
}

function MovementItem({ movement, onTogglePaid }) {
  const { type, concepto, amount, date, paid, isRecurring, isDebt, categoria } = movement;

  let iconEl, iconClass = "";
  let amountClass = "item__amount--neg";
  let subtitleText = fmtDate(date);

  if (type === "income") {
    iconEl = "💰";
    iconClass = "item__icon--income";
    amountClass = "item__amount--pos";
  } else if (isRecurring) {
    iconEl = "🔄";
    iconClass = "item__icon--recurring";
    subtitleText = `${fmtDate(date)} · Recurrente`;
  } else if (isDebt) {
    iconEl = "💳";
    iconClass = "item__icon--debt";
    subtitleText = `${fmtDate(date)} · Cuota`;
  } else if (categoria) {
    iconEl = categoria.split(" ")[0] || "📦";
    subtitleText = `${fmtDate(date)} · ${categoria.replace(/^[^\s]+\s/, "")}`;
  } else {
    iconEl = "📝";
  }

  return (
    <div className={`item ${paid ? "item--paid" : ""}`}>
      <div className={`item__icon ${iconClass}`}>{iconEl}</div>
      <div className="item__body">
        <div className="item__title">{concepto}</div>
        <div className="item__subtitle">{subtitleText}</div>
      </div>
      <div className="item__right">
        <div className={`item__amount ${amountClass}`}>
          {type === "income" ? "+" : "−"}{fmt(amount).replace("−", "").replace("-", "")}
        </div>
        {type === "payment" && onTogglePaid && (
          <button
            className={`badge ${paid ? "badge--paid" : "badge--pending"}`}
            onClick={onTogglePaid}
            style={{ marginTop: 4 }}
          >
            {paid ? "Pagado" : "Pendiente"}
          </button>
        )}
      </div>
    </div>
  );
}
