// ══════════════════════════════════════════════
// 💰 Dashboard Principal
// - Móvil: tabs inferiores + FAB central
// - Escritorio: sidebar + grid denso
// + Métricas financieras en 3 filas × 3 cards (MetricsCards)
// + Panel de Metas de Ahorro
// + Categorías v2 (tabla unificada data.categories con ID estable)
// + Vista "Todas las categorías" con gasto del ciclo (CategoriesOverview)
// ══════════════════════════════════════════════
import { useState, useEffect } from "react";
import { auth, signOut } from "../firebase.js";
import useFinancialData from "../hooks/useFinancialData.js";
import useAutoLogout from "../hooks/useAutoLogout.js";
import useMediaQuery from "../hooks/useMediaQuery.js";
import { fmt, formatMonthLabel, MS } from "../utils/format.js";
import { todayMK, getCycleDates, dateToFinancialMonth, formatMonthLabelWithCycle, CYCLE_START_DAY } from "../utils/cycle.js";

// Shared
import ValidationToast from "./shared/ValidationToast.jsx";
import SyncIndicator from "./shared/SyncIndicator.jsx";
import UserMenu from "./shared/UserMenu.jsx";
import MonthSelector from "./shared/MonthSelector.jsx";

// Mobile
import TabBar from "./mobile/TabBar.jsx";
import MobileSummary from "./mobile/MobileSummary.jsx";
import MobileSection from "./mobile/MobileSection.jsx";
import QuickAddSheet from "./mobile/QuickAddSheet.jsx";

// Desktop panels
import DebtTable from "./DebtTable.jsx";
import FixedExpenses from "./FixedExpenses.jsx";
import IncomeTable from "./IncomeTable.jsx";
import VariableExpenses from "./VariableExpenses.jsx";
import PaymentCalendar from "./PaymentCalendar.jsx";
import ReportModal from "./ReportModal.jsx";
import MetricsCards from "./MetricsCards.jsx";
import SavingsGoals from "./SavingsGoals.jsx";
import CategoriesOverview from "./CategoriesOverview.jsx";

function getPrevCycle(cycleMK) {
  if (!cycleMK || !/^\d{4}-\d{2}$/.test(cycleMK)) return null;
  const [y, m] = cycleMK.split("-").map(Number);
  const prevMonth = m === 1 ? 12 : m - 1;
  const prevYear = m === 1 ? y - 1 : y;
  return `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
}

export default function Dashboard({ user, theme, toggleTheme }) {
  const {
    data, loading, syncing, online, lastSyncTime, validationError,
    save, addRow, updField, deleteRow, saveRowEdit, addDebtWithPlan, resetAll,
    isEditingRef, toggleRecurrente, ensureRecurringPayments,
    addOrUpdateBudget, removeBudget, copyBudgetsFromPrevCycle,
    addGoal, updateGoal, deleteGoal, addDeposit, deleteDeposit,
    addCategory, updateCategory, deleteCategory,
  } = useFinancialData(user);

  useAutoLogout(user);
  const isDesktop = useMediaQuery("(min-width: 900px)");

  const [selectedMonth, setSelectedMonth] = useState(todayMK);
  const [showReport, setShowReport] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [addingTo, setAddingTo] = useState(null);
  const [mobileTab, setMobileTab] = useState("home");
  const [showCategories, setShowCategories] = useState(false);

  // 🆕 Toast de éxito (verde). Distinto del toast de error (validationError),
  // que es gestionado por useFinancialData. Se muestra cuando un componente
  // hijo nos avisa de que ha guardado algo correctamente.
  const [successMsg, setSuccessMsg] = useState("");
  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(""), 2800);
    return () => clearTimeout(t);
  }, [successMsg]);

  // Helper que pasamos a los componentes hijos (DebtTable por ahora) para
  // notificar éxito. Diseñado para que más componentes lo puedan usar
  // en el futuro sin cambiar la firma.
  const notifySuccess = (msg) => setSuccessMsg(msg);

  useEffect(() => { isEditingRef.current = !!addingTo; }, [addingTo, isEditingRef]);

  useEffect(() => {
    if (!data || loading) return;
    ensureRecurringPayments(data, selectedMonth);
  }, [selectedMonth, loading, data?.fixedExpenses?.length]);

  const handleLogout = async () => {
    try { await signOut(auth); } catch (e) { console.error(e); }
  };

  if (loading || !data) {
    return (
      <div className="spinner-page">
        <div className="spinner-dot" />
        <p className="spinner-text">Conectando…</p>
      </div>
    );
  }

  // ══════════════════════════════════════════════
  // Filtrado por ciclo financiero
  // ══════════════════════════════════════════════
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

  const totalPending = filteredPayments
    .filter((p) => p.estado === "PENDIENTE")
    .reduce((s, p) => s + (p.monto || 0), 0);

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

  const fixedExpensesProps = {
    data,
    addRow, deleteRow, saveRowEdit, toggleRecurrente,
    setAddingTo, addingTo,
    addCategory, updateCategory, deleteCategory,
  };

  const variableExpensesProps = {
    filteredVarExpenses,
    addRow, deleteRow, saveRowEdit,
    selectedMonth, setAddingTo, addingTo,
    data,
    addOrUpdateBudget, removeBudget,
    copyBudgetsFromPrevCycle, getPrevCycle,
    addCategory, updateCategory, deleteCategory,
  };

  const savingsGoalsProps = {
    data,
    addGoal, updateGoal, deleteGoal, addDeposit, deleteDeposit,
    setAddingTo, addingTo,
  };

  // 🆕 Si el usuario tiene un mensaje de error activo, NO mostramos el de
  // éxito a la vez (la prioridad es el error porque suele requerir acción).
  // Si no, mostramos el de éxito si existe.
  const toastMessage = validationError || successMsg;
  const toastKind = validationError ? "error" : (successMsg ? "success" : "error");

  // ══════════════════════════════════════════════
  // RENDER MÓVIL
  // ══════════════════════════════════════════════
  if (!isDesktop) {
    return (
      <div className="app-shell">
        <ValidationToast message={toastMessage} kind={toastKind} />

        <div className="app-mobile">
          <div className="m-header">
            <div>
              <div className="m-header__title">
                {mobileTab === "home" && "Resumen"}
                {mobileTab === "payments" && "Pagos"}
                {mobileTab === "debts" && "Deudas"}
                {mobileTab === "more" && "Ajustes"}
              </div>
              <div className="m-header__subtitle">{formatMonthLabelWithCycle(selectedMonth)}</div>
            </div>
            {/* 🆕 Indicador compacto de sincronización — antes solo aparecía
                en la sidebar de escritorio. En móvil ahora se ve junto al avatar. */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <SyncIndicator
                syncing={syncing}
                online={online}
                lastSyncTime={lastSyncTime}
                compact
              />
              <UserMenu
                user={user} theme={theme} toggleTheme={toggleTheme}
                onLogout={handleLogout} onReset={() => setShowResetModal(true)}
              />
            </div>
          </div>

          <MonthSelector
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            allMonths={allMonths}
          />

          {mobileTab === "home" && (
            <MobileSummary
              totalPending={totalPending}
              filteredPayments={filteredPayments}
              filteredVarExpenses={filteredVarExpenses}
              filteredIncomes={filteredIncomes}
              data={data}
              selectedMonth={selectedMonth}
              onShowReport={() => setShowReport(true)}
              save={save}
            />
          )}

          {mobileTab === "payments" && (
            <MobileSection title="Calendario de pagos">
              <PaymentCalendar
                data={data}
                filteredPayments={filteredPayments}
                save={save}
                addRow={addRow} deleteRow={deleteRow} updField={updField}
                selectedMonth={selectedMonth}
                setAddingTo={setAddingTo} addingTo={addingTo}
                mobileMode
              />
            </MobileSection>
          )}

          {mobileTab === "debts" && (
            <>
              <MobileSection title="Mis deudas">
                <DebtTable
                  data={data}
                  addDebtWithPlan={addDebtWithPlan}
                  deleteRow={deleteRow} saveRowEdit={saveRowEdit}
                  selectedMonth={selectedMonth}
                  setAddingTo={setAddingTo} addingTo={addingTo}
                  mobileMode
                  onSuccessNotify={notifySuccess}
                />
              </MobileSection>
              <MobileSection title="Gastos fijos">
                <FixedExpenses {...fixedExpensesProps} mobileMode />
              </MobileSection>
            </>
          )}

          {mobileTab === "more" && (
            <>
              <MobileSection title="Ingresos del ciclo">
                <IncomeTable
                  filteredIncomes={filteredIncomes}
                  addRow={addRow} deleteRow={deleteRow} saveRowEdit={saveRowEdit}
                  selectedMonth={selectedMonth}
                  setAddingTo={setAddingTo} addingTo={addingTo}
                  mobileMode
                />
              </MobileSection>
              <MobileSection title="Gastos variables">
                <VariableExpenses {...variableExpensesProps} mobileMode />
              </MobileSection>
              <MobileSection title="Metas de ahorro">
                <SavingsGoals {...savingsGoalsProps} mobileMode />
              </MobileSection>

              <button
                className="btn-secondary"
                style={{ width: "100%", marginTop: 8 }}
                onClick={() => setShowCategories(true)}
              >
                🏷️ Categorías del ciclo
              </button>

              <button
                className="btn-secondary"
                style={{ width: "100%", marginTop: 8 }}
                onClick={() => setShowReport(true)}
              >
                📊 Ver informe completo
              </button>
            </>
          )}
        </div>

        <TabBar
          active={mobileTab}
          onChange={setMobileTab}
          onAddClick={() => setShowQuickAdd(true)}
        />

        {showQuickAdd && (
          <QuickAddSheet
            addRow={addRow}
            selectedMonth={selectedMonth}
            onClose={() => setShowQuickAdd(false)}
            data={data}
          />
        )}

        {addingTo && (
          <button
            className="btn-secondary"
            style={{ position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)", zIndex: 80 }}
            onClick={() => setAddingTo(null)}
          >
            ✕ Cancelar
          </button>
        )}

        {showResetModal && (
          <ResetModal onCancel={() => setShowResetModal(false)} onConfirm={() => { resetAll(); setShowResetModal(false); }} />
        )}

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

        {showCategories && (
          <CategoriesOverview
            data={data}
            selectedMonth={selectedMonth}
            onClose={() => setShowCategories(false)}
          />
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════
  // RENDER ESCRITORIO
  // ══════════════════════════════════════════════
  return (
    <div className="app-shell">
      <ValidationToast message={toastMessage} kind={toastKind} />

      <div className="app-desktop">
        <aside className="sidebar">
          <div className="sidebar__logo">
            <div className="sidebar__logo-icon">€</div>
            <div className="sidebar__logo-text">Finanzas</div>
          </div>

          <nav className="sidebar__nav">
            <button className="nav-item nav-item--active">
              <span className="nav-item__icon">📊</span>
              <span>Resumen</span>
            </button>
            <button className="nav-item" onClick={() => setShowCategories(true)}>
              <span className="nav-item__icon">🏷️</span>
              <span>Categorías</span>
            </button>
            <button className="nav-item" onClick={() => setShowReport(true)}>
              <span className="nav-item__icon">📋</span>
              <span>Informe mensual</span>
            </button>
          </nav>

          <div className="sidebar__footer">
            <SyncIndicator syncing={syncing} online={online} lastSyncTime={lastSyncTime} />

            <button className="btn-ghost" onClick={toggleTheme} style={{ justifyContent: "flex-start", display: "flex", alignItems: "center", gap: 8 }}>
              <span>{theme === "light" ? "🌙" : "☀️"}</span>
              <span>{theme === "light" ? "Modo oscuro" : "Modo claro"}</span>
            </button>

            <UserMenu
              user={user} theme={theme} toggleTheme={toggleTheme}
              onLogout={handleLogout} onReset={() => setShowResetModal(true)}
              inline
            />
          </div>
        </aside>

        <main className="app-desktop__main">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
                Resumen del ciclo
              </h1>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2, fontWeight: 500 }}>
                {formatMonthLabelWithCycle(selectedMonth)}
              </p>
            </div>

            <MonthSelector
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              allMonths={allMonths}
            />
          </div>

          <MetricsCards
            data={data}
            selectedMonth={selectedMonth}
            totalPending={totalPending}
          />

          <div className="desktop-grid">
            <div className="desktop-col">
              <DebtTable
                data={data}
                addDebtWithPlan={addDebtWithPlan}
                deleteRow={deleteRow} saveRowEdit={saveRowEdit}
                selectedMonth={selectedMonth}
                setAddingTo={setAddingTo} addingTo={addingTo}
                onSuccessNotify={notifySuccess}
              />
              <FixedExpenses {...fixedExpensesProps} />
              <IncomeTable
                filteredIncomes={filteredIncomes}
                addRow={addRow} deleteRow={deleteRow} saveRowEdit={saveRowEdit}
                selectedMonth={selectedMonth}
                setAddingTo={setAddingTo} addingTo={addingTo}
              />
              <VariableExpenses {...variableExpensesProps} />
            </div>

            <div className="desktop-col">
              <PaymentCalendar
                data={data}
                filteredPayments={filteredPayments}
                save={save}
                addRow={addRow} deleteRow={deleteRow} updField={updField}
                selectedMonth={selectedMonth}
                setAddingTo={setAddingTo} addingTo={addingTo}
              />
              <SavingsGoals {...savingsGoalsProps} />
            </div>
          </div>

          {addingTo && (
            <button
              className="btn-secondary"
              style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 80 }}
              onClick={() => setAddingTo(null)}
            >
              ✕ Cancelar adición
            </button>
          )}
        </main>
      </div>

      {showResetModal && (
        <ResetModal onCancel={() => setShowResetModal(false)} onConfirm={() => { resetAll(); setShowResetModal(false); }} />
      )}

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

      {showCategories && (
        <CategoriesOverview
          data={data}
          selectedMonth={selectedMonth}
          onClose={() => setShowCategories(false)}
        />
      )}
    </div>
  );
}

function ResetModal({ onCancel, onConfirm }) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal modal--small" onClick={(e) => e.stopPropagation()}>
        <div className="modal__body" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>⚠️</div>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
            ¿Restablecer cuenta?
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6, lineHeight: 1.5 }}>
            Se eliminarán todas tus deudas, pagos, ingresos y gastos.
          </p>
          <p style={{ fontSize: 13, color: "var(--danger)", fontWeight: 700, marginBottom: 22 }}>
            Esta acción no se puede deshacer.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onCancel} className="btn-secondary" style={{ flex: 1 }}>Cancelar</button>
            <button onClick={onConfirm} className="btn-danger" style={{ flex: 1 }}>Sí, restablecer</button>
          </div>
        </div>
      </div>
    </div>
  );
}
