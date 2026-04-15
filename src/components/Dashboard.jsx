import { useState, useEffect } from "react";
import { auth, signOut } from "../firebase.js";
import useFinancialData from "../hooks/useFinancialData.js";
import useAutoLogout from "../hooks/useAutoLogout.js";
import { fmt, formatMonthLabel, MS } from "../utils/format.js";
import { todayMK, getCycleDates, dateToFinancialMonth, formatMonthLabelWithCycle, CYCLE_START_DAY } from "../utils/cycle.js";
import ValidationToast from "./shared/ValidationToast.jsx";
import SyncIndicator from "./shared/SyncIndicator.jsx";
import DebtTable from "./DebtTable.jsx";
import FixedExpenses from "./FixedExpenses.jsx";
import IncomeTable from "./IncomeTable.jsx";
import VariableExpenses from "./VariableExpenses.jsx";
import PaymentCalendar from "./PaymentCalendar.jsx";
import ReportModal from "./ReportModal.jsx";
import QuickAddFAB from "./QuickAddFAB.jsx";

export default function Dashboard({ user }) {
  const {
    data, loading, syncing, online, lastSyncTime, validationError,
    save, addRow, updField, deleteRow, saveRowEdit, addDebtWithPlan, resetAll,
    isEditingRef, toggleRecurrente, ensureRecurringPayments,
  } = useFinancialData(user);

  useAutoLogout(user);

  const [selectedMonth, setSelectedMonth] = useState(todayMK);
  const [showReport, setShowReport] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [addingTo, setAddingTo] = useState(null);

  // Track editing state for Firebase listener
  useEffect(() => { isEditingRef.current = !!addingTo; }, [addingTo, isEditingRef]);

  // ══════════════════════════════════════════════
  // 🔄 AUTO-GENERAR PAGOS RECURRENTES
  // Se ejecuta cuando:
  //   - Se cargan los datos por primera vez
  //   - Se cambia el mes seleccionado
  // ══════════════════════════════════════════════
  useEffect(() => {
    if (!data || loading) return;
    ensureRecurringPayments(data, selectedMonth);
  }, [selectedMonth, loading, data?.fixedExpenses?.length]);

  // Close user menu on outside click
  useEffect(() => {
    if (!showUserMenu) return;
    const close = () => setShowUserMenu(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [showUserMenu]);

  const handleLogout = async () => {
    try { await signOut(auth); } catch (e) { console.error("Logout error:", e); }
  };

  /* ── Loading state ── */
  if (loading || !data) {
    return (
      <div className="spinner-page">
        <div className="spinner-dot" />
        <p className="spinner-text">Conectando con Firebase...</p>
      </div>
    );
  }

  /* ── Filter data by financial cycle ── */
  const { start: cycleStart, end: cycleEnd } = getCycleDates(selectedMonth);

  const filteredPayments = (data.payments || [])
    .filter((p) => {
      if (p.dayPago && /^\d{4}-\d{2}-\d{2}$/.test(p.dayPago)) {
        return p.dayPago >= cycleStart && p.dayPago <= cycleEnd;
      }
      return p.month === selectedMonth;
    })
    .sort((a, b) => (a.dayPago || "").localeCompare(b.dayPago || ""));

  const filteredIncomes = (data.incomes || []).filter((i) => {
    if (i.fecha && /^\d{4}-\d{2}-\d{2}$/.test(i.fecha)) {
      return i.fecha >= cycleStart && i.fecha <= cycleEnd;
    }
    return i.month === selectedMonth;
  });

  const filteredVarExpenses = (data.variableExpenses || []).filter((v) => {
    if (v.fecha && /^\d{4}-\d{2}-\d{2}$/.test(v.fecha)) {
      return v.fecha >= cycleStart && v.fecha <= cycleEnd;
    }
    return v.month === selectedMonth;
  });

  /* ── Totals ── */
  const totalPayments = filteredPayments.reduce((s, p) => s + (p.monto || 0), 0);
  const totalPending = filteredPayments.filter((p) => p.estado === "PENDIENTE").reduce((s, p) => s + (p.monto || 0), 0);
  const totalIncomes = filteredIncomes.reduce((s, i) => s + (i.amount || 0), 0);
  const totalVarExpenses = filteredVarExpenses.reduce((s, v) => s + (v.monto || 0), 0);
  const totalDebtPending = (data.debts || []).reduce((s, d) => s + (d.saldoPendiente || 0), 0);
  const reportBalance = totalIncomes - totalPayments - totalVarExpenses;

  /* ── Collect all available months ── */
  const getAllFinancialMonths = () => {
    const months = new Set([selectedMonth]);
    (data.payments || []).forEach((p) => {
      if (p.dayPago && /^\d{4}-\d{2}-\d{2}$/.test(p.dayPago)) months.add(dateToFinancialMonth(p.dayPago));
      else if (p.month) months.add(p.month);
    });
    (data.incomes || []).forEach((i) => {
      if (i.fecha && /^\d{4}-\d{2}-\d{2}$/.test(i.fecha)) months.add(dateToFinancialMonth(i.fecha));
      else if (i.month) months.add(i.month);
    });
    (data.variableExpenses || []).forEach((v) => {
      if (v.fecha && /^\d{4}-\d{2}-\d{2}$/.test(v.fecha)) months.add(dateToFinancialMonth(v.fecha));
      else if (v.month) months.add(v.month);
    });
    return [...months].filter(Boolean).sort().reverse();
  };
  const allMonths = getAllFinancialMonths();

  /* ── User info ── */
  const userInitial = (user.displayName?.[0] || user.email?.[0] || "?").toUpperCase();
  const userName = user.displayName || user.email?.split("@")[0] || "Usuario";

  /* ── Summary cards config ── */
  const summaryCards = [
    { label: "Ingresos", val: totalIncomes, color: "#16a34a", border: "#22c55e" },
    { label: "Total Pagos", val: totalPayments, color: "#dc2626", border: "#ef4444" },
    { label: "Gastos Variables", val: totalVarExpenses, color: "#ea580c", border: "#f97316" },
    { label: "Pendiente mes", val: totalPending, color: "#d97706", border: "#f59e0b" },
    { label: "Deuda total", val: totalDebtPending, color: "#7c3aed", border: "#8b5cf6" },
    { label: "Balance", val: reportBalance, color: reportBalance >= 0 ? "#16a34a" : "#dc2626", border: reportBalance >= 0 ? "#22c55e" : "#ef4444" },
  ];

  return (
    <div className="app-container">
      <ValidationToast message={validationError} />

      {/* ─── HEADER ─── */}
      <header className="header">
        <div className="header-left">
          <h1 className="header-title">💰 Control Financiero Familiar</h1>
          <SyncIndicator syncing={syncing} online={online} lastSyncTime={lastSyncTime} />
        </div>
        <div className="header-right">
          <button className="btn-report" onClick={() => setShowReport(true)}>📊 Informe</button>
          <select className="month-select" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
            {allMonths.map((m) => {
              const { start, end } = getCycleDates(m);
              const [, sm, sd] = start.split("-");
              const [, em, ed] = end.split("-");
              return (
                <option key={m} value={m}>
                  {formatMonthLabel(m)} ({parseInt(sd)} {MS[parseInt(sm) - 1]} → {parseInt(ed)} {MS[parseInt(em) - 1]})
                </option>
              );
            })}
          </select>
          <button className="btn-reset" onClick={() => setShowResetModal(true)} title="Borrar todo">🗑️</button>

          {/* User Avatar */}
          <div style={{ position: "relative" }}>
            <button className="user-avatar" onClick={(e) => { e.stopPropagation(); setShowUserMenu(!showUserMenu); }} style={user.photoURL ? { background: "transparent" } : {}} title={userName}>
              {user.photoURL ? <img src={user.photoURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} referrerPolicy="no-referrer" /> : userInitial}
            </button>
            {showUserMenu && (
              <div className="user-menu" onClick={(e) => e.stopPropagation()}>
                <div className="user-menu__info">
                  <div className="user-menu__name">{userName}</div>
                  <div className="user-menu__email">{user.email}</div>
                  <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>🔒 Sesión se cierra tras 30 min inactivo</div>
                  <div style={{ fontSize: 10, color: "#6366f1", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>📅 Ciclo financiero: día {CYCLE_START_DAY} → día {CYCLE_START_DAY - 1}</div>
                </div>
                <button className="user-menu__logout" onClick={handleLogout}>🚪 Cerrar sesión</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ─── CYCLE INDICATOR ─── */}
      <div className="cycle-indicator">
        <span>📅</span>
        <span>Ciclo actual: <strong>{formatMonthLabelWithCycle(selectedMonth)}</strong></span>
      </div>

      {/* ─── SUMMARY CARDS ─── */}
      <div className="summary-row">
        {summaryCards.map((c, i) => (
          <div key={i} className="summary-card" style={{ borderLeft: `4px solid ${c.border}` }}>
            <span className="summary-card__label">{c.label}</span>
            <span className="summary-card__value" style={{ color: c.color }}>{fmt(c.val)}</span>
          </div>
        ))}
      </div>

      {/* ─── MAIN GRID ─── */}
      <div className="main-grid">
        <div className="main-col">
          <DebtTable
            data={data}
            addDebtWithPlan={addDebtWithPlan}
            deleteRow={deleteRow}
            saveRowEdit={saveRowEdit}
            selectedMonth={selectedMonth}
            setAddingTo={setAddingTo}
            addingTo={addingTo}
          />
          <FixedExpenses
            data={data}
            addRow={addRow}
            deleteRow={deleteRow}
            saveRowEdit={saveRowEdit}
            toggleRecurrente={toggleRecurrente}
            setAddingTo={setAddingTo}
            addingTo={addingTo}
          />
          <IncomeTable
            filteredIncomes={filteredIncomes}
            addRow={addRow}
            deleteRow={deleteRow}
            saveRowEdit={saveRowEdit}
            selectedMonth={selectedMonth}
            setAddingTo={setAddingTo}
            addingTo={addingTo}
          />
          <VariableExpenses
            filteredVarExpenses={filteredVarExpenses}
            addRow={addRow}
            deleteRow={deleteRow}
            saveRowEdit={saveRowEdit}
            selectedMonth={selectedMonth}
            setAddingTo={setAddingTo}
            addingTo={addingTo}
          />
        </div>
        <div>
          <PaymentCalendar
            data={data}
            filteredPayments={filteredPayments}
            save={save}
            addRow={addRow}
            deleteRow={deleteRow}
            updField={updField}
            selectedMonth={selectedMonth}
            setAddingTo={setAddingTo}
            addingTo={addingTo}
          />
        </div>
      </div>

      {/* Cancel button */}
      {addingTo && (
        <button className="btn-cancel-float" onClick={() => setAddingTo(null)}>✕ Cancelar</button>
      )}

      {/* ─── FAB: Gasto rápido ─── */}
      <QuickAddFAB addRow={addRow} selectedMonth={selectedMonth} />

      {/* Reset modal */}
      {showResetModal && (
        <div className="modal-overlay modal-overlay--dark" onClick={() => setShowResetModal(false)}>
          <div className="modal-card--small" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1f2937", marginBottom: 8 }}>¿Borrar TODOS los datos?</h3>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 6, lineHeight: 1.5 }}>Se eliminarán todas tus deudas, pagos, ingresos y gastos.</p>
            <p style={{ fontSize: 13, color: "#dc2626", fontWeight: 700, marginBottom: 22 }}>Esta acción NO se puede deshacer.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowResetModal(false)} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", fontSize: 13, fontWeight: 600, color: "#374151" }}>Cancelar</button>
              <button onClick={() => { resetAll(); setShowResetModal(false); }} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "none", background: "#dc2626", fontSize: 13, fontWeight: 700, color: "#fff" }}>🗑️ Sí, borrar todo</button>
            </div>
          </div>
        </div>
      )}

      {/* Report modal */}
      {showReport && (
        <ReportModal
          data={data}
          filteredPayments={filteredPayments}
          filteredIncomes={filteredIncomes}
          filteredVarExpenses={filteredVarExpenses}
          selectedMonth={selectedMonth}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}
