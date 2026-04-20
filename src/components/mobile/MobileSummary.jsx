// ══════════════════════════════════════════════
// 📱 Pantalla de resumen móvil (home)
// Estructura:
//  - Hero balance
//  - 3 cards grandes: Balance, Ratio endeudamiento, Deuda total (MetricsCards)
//  - 3 cards pequeñas en una fila: Ingresos, Egresos totales, Pendiente
//  - Movimientos recientes
//
// 🆕 totalEgresos llega como prop desde Dashboard (calculado con el motor
//    contable único calcExpenseBreakdown) para que cuadre con el hero
//    y con las cards grandes. Ya no se calcula localmente.
// 🆕 Las 3 cards pequeñas tienen icono ⓘ con su explicación.
// ══════════════════════════════════════════════
import { fmt, fmtDate } from "../../utils/format.js";
import MetricsCards from "../MetricsCards.jsx";
import InfoHint from "../shared/InfoHint.jsx";

export default function MobileSummary({
  totalIncomes,
  totalPayments,
  totalVarExpenses,
  totalEgresos,
  totalPending,
  totalDebtPending,
  reportBalance,
  filteredPayments,
  filteredVarExpenses,
  filteredIncomes,
  data,
  selectedMonth,
  onShowReport,
  save,
}) {
  // Fallback por seguridad: si Dashboard no pasó totalEgresos, lo calculamos
  // de la forma antigua (pagos + variables). No debería ocurrir con esta
  // entrega, pero evita un NaN si algún render intermedio llega sin la prop.
  const egresos = typeof totalEgresos === "number"
    ? totalEgresos
    : (totalPayments || 0) + (totalVarExpenses || 0);

  // Combinar últimos movimientos (pagos + gastos variables + ingresos) por fecha desc
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

      {/* Métricas grandes: Balance, Ratio endeudamiento, Deuda total */}
      <MetricsCards data={data} selectedMonth={selectedMonth} compact />

      {/* 3 cards pequeñas: Ingresos, Egresos totales, Pendiente */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 6,
        marginBottom: 18,
      }}>
        {/* Ingresos */}
        <div className="stat-card" style={{ position: "relative", overflow: "visible" }}>
          <div style={{ position: "absolute", top: 4, right: 6 }}>
            <InfoHint
              title="Ingresos"
              description="Total de dinero que entra al hogar durante este ciclo (del día 27 al 26)."
              formula="Σ ingresos del ciclo"
              align="right"
            />
          </div>
          <div className="stat-card__label" style={{ paddingRight: 18 }}>Ingresos</div>
          <div className="stat-card__value stat-card__value--success">{fmt(totalIncomes)}</div>
        </div>

        {/* Egresos totales */}
        <div className="stat-card" style={{ position: "relative", overflow: "visible" }}>
          <div style={{ position: "absolute", top: 4, right: 6 }}>
            <InfoHint
              title="Egresos totales"
              description="Todo el dinero que sale del hogar en el ciclo: cuotas de deuda, gastos fijos, pagos manuales y gastos variables."
              formula="Costos Fijos + Costos Variables + Discrecional"
              align="right"
            />
          </div>
          <div className="stat-card__label" style={{ paddingRight: 18 }}>Egresos totales</div>
          <div className="stat-card__value stat-card__value--danger">{fmt(egresos)}</div>
        </div>

        {/* Pendiente */}
        <div className="stat-card" style={{ position: "relative", overflow: "visible" }}>
          <div style={{ position: "absolute", top: 4, right: 6 }}>
            <InfoHint
              title="Pendiente"
              description="Pagos del calendario de este ciclo que aún no has marcado como pagados."
              formula="Σ pagos con estado = PENDIENTE"
              align="left"
            />
          </div>
          <div className="stat-card__label" style={{ paddingRight: 18 }}>Pendiente</div>
          <div className="stat-card__value stat-card__value--warning">{fmt(totalPending)}</div>
        </div>
      </div>

      {/* Movimientos recientes */}
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
