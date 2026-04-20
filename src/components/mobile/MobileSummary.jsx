// ══════════════════════════════════════════════
// 📱 Pantalla de resumen móvil (home)
//
// Estructura:
//  - MetricsCards (3×3): balance, egresos, pendiente / CF, CV, Discr. / ingresos, ratio, aportes
//  - Movimientos recientes
//
// Se elimina el hero grande y las 3 stat-cards pequeñas:
// toda la info del "resumen" vive ahora en MetricsCards, que es la fuente
// única y coherente (usa calcExpenseBreakdown).
// ══════════════════════════════════════════════
import { fmt, fmtDate } from "../../utils/format.js";
import MetricsCards from "../MetricsCards.jsx";

export default function MobileSummary({
  totalPending,
  filteredPayments,
  filteredVarExpenses,
  filteredIncomes,
  data,
  selectedMonth,
  onShowReport,
  save,
}) {
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
      {/* Métricas en 3 filas × 3 columnas (fuente única de egresos: calcExpenseBreakdown) */}
      <MetricsCards
        data={data}
        selectedMonth={selectedMonth}
        totalPending={totalPending}
        compact
      />

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
