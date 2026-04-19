// ══════════════════════════════════════════════
// 📊 Hook principal de datos financieros
// Carga, guarda y gestiona todo el CRUD
// + Auto-generación de pagos recurrentes
// + Presupuesto, metas de ahorro, pagos extra a deudas
// + Categorías personalizadas (custom)
// ══════════════════════════════════════════════
import { useState, useEffect, useCallback, useRef } from "react";
import { db, ref, onValue } from "../firebase.js";
import useDebouncedSave from "./useDebouncedSave.js";
import {
  sanitizeText,
  sanitizeAmount,
  sanitizeInteger,
  canAddMore,
  migrateData,
  validateDebt,
  validateFixedExpense,
  validateIncome,
  validateVariableExpense,
  validatePayment,
  validateBudget,
  validateSavingsGoal,
  validateSavingsDeposit,
  validateDebtExtraPayment,
  validateCustomCategory,
  LIMITS,
} from "../validation.js";
import { genId, monthKey, addMonths } from "../utils/format.js";
import { dateToFinancialMonth, getRecurringPaymentDate } from "../utils/cycle.js";

const emptyData = () => ({
  debts: [],
  payments: [],
  fixedExpenses: [],
  incomes: [],
  variableExpenses: [],
  budgets: [],
  savingsGoals: [],
  savingsDeposits: [],
  debtPayments: [],
  customCategories: [], // 🆕 categorías personalizadas del usuario
});

/**
 * Genera pagos automáticos para gastos fijos recurrentes en un ciclo dado.
 */
function generateRecurringPayments(fixedExpenses, existingPayments, cycleMK) {
  const recurrentes = (fixedExpenses || []).filter((f) => f.recurrente);
  const newPayments = [];

  for (const expense of recurrentes) {
    const alreadyExists = existingPayments.some(
      (p) => p.fixedExpenseId === expense.id && p.month === cycleMK
    );
    if (alreadyExists) continue;

    const payDate = getRecurringPaymentDate(expense.diaPago, cycleMK);
    if (!payDate) continue;

    newPayments.push({
      id: genId() + "_r",
      concepto: `🔄 ${expense.concepto}`,
      monto: expense.monto || 0,
      dayPago: payDate,
      estado: "PENDIENTE",
      month: cycleMK,
      debtId: "",
      cuotaNum: null,
      fixedExpenseId: expense.id,
    });
  }

  return newPayments;
}

export default function useFinancialData(user) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [online, setOnline] = useState(true);
  const [validationError, setValidationError] = useState("");
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const isEditingRef = useRef(false);

  const dbPath = user ? `users/${user.uid}/family-finance` : null;
  const { debouncedSave, isSavingRef } = useDebouncedSave(dbPath, user, setSyncing, setLastSyncTime);

  // Auto-clear validation errors
  useEffect(() => {
    if (!validationError) return;
    const t = setTimeout(() => setValidationError(""), 4000);
    return () => clearTimeout(t);
  }, [validationError]);

  // Escuchar cambios en Firebase (con migración automática)
  useEffect(() => {
    if (!dbPath) return;
    setLoading(true);
    const dataRef = ref(db, dbPath);
    const unsubscribe = onValue(
      dataRef,
      (snapshot) => {
        if (isEditingRef.current || isSavingRef.current) return;
        const val = snapshot.val();
        if (val) {
          setData(migrateData(val));
        } else {
          setData(emptyData());
        }
        setLoading(false);
        setOnline(true);
        setLastSyncTime(new Date());
      },
      (error) => {
        console.error("Firebase error:", error);
        setOnline(false);
        try {
          const local = localStorage.getItem(`finance-${user.uid}`);
          if (local) setData(migrateData(JSON.parse(local)));
          else setData(emptyData());
        } catch {
          setData(emptyData());
        }
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [dbPath]);

  // Guardar (local + Firebase)
  const save = useCallback(
    (d) => {
      setData(d);
      debouncedSave(d);
    },
    [debouncedSave]
  );

  // ══════════════════════════════════════════════
  // 🔄 AUTO-GENERAR PAGOS RECURRENTES
  // ══════════════════════════════════════════════
  const ensureRecurringPayments = useCallback(
    (currentData, cycleMK) => {
      if (!currentData) return currentData;

      const newPayments = generateRecurringPayments(
        currentData.fixedExpenses,
        currentData.payments || [],
        cycleMK
      );

      if (newPayments.length === 0) return currentData;

      const totalPayments = (currentData.payments || []).length + newPayments.length;
      if (totalPayments > LIMITS.MAX_PAYMENTS) return currentData;

      const updatedData = {
        ...currentData,
        payments: [...(currentData.payments || []), ...newPayments],
      };

      save(updatedData);
      return updatedData;
    },
    [save]
  );

  // ══════════════════════════════════════════════
  // CRUD GENÉRICO
  // ══════════════════════════════════════════════

  const addRow = useCallback(
    (section, row) => {
      if (!data) return;
      if (!canAddMore(section, data)) {
        setValidationError("Has alcanzado el límite de registros en esta sección");
        return;
      }
      let validation;
      switch (section) {
        case "fixedExpenses": validation = validateFixedExpense(row); break;
        case "incomes": validation = validateIncome(row); break;
        case "variableExpenses": validation = validateVariableExpense(row); break;
        case "payments": validation = validatePayment(row); break;
        default: validation = { valid: true, data: row };
      }
      if (!validation.valid) {
        setValidationError(validation.errors.join(". "));
        return false;
      }
      const sectionData = data[section] || [];
      save({ ...data, [section]: [...sectionData, { ...validation.data, id: genId() }] });
      setValidationError("");
      return true;
    },
    [data, save]
  );

  const updField = useCallback(
    (section, id, field, val) => {
      if (!data) return;
      let cleanVal = val;
      if (["saldoPendiente", "proxCuota", "monto", "amount", "totalCuotas", "cuotaActual", "limiteCredito", "pagoMinimo", "tasaInteres"].includes(field)) {
        cleanVal = (field === "totalCuotas" || field === "cuotaActual")
          ? sanitizeInteger(val)
          : sanitizeAmount(val);
      } else if (typeof val === "string" && !["dayPago", "fecha", "fechaInicio", "month", "estado", "tipo", "titular"].includes(field)) {
        cleanVal = sanitizeText(val);
      }

      let extraUpdates = {};
      if (["fecha", "dayPago"].includes(field) && typeof cleanVal === "string" && /^\d{4}-\d{2}-\d{2}$/.test(cleanVal)) {
        extraUpdates.month = dateToFinancialMonth(cleanVal);
      }

      save({
        ...data,
        [section]: (data[section] || []).map((r) =>
          r.id === id ? { ...r, [field]: cleanVal, ...extraUpdates } : r
        ),
      });
    },
    [data, save]
  );

  const deleteRow = useCallback(
    (section, id) => {
      if (!data) return;
      let newData = { ...data, [section]: (data[section] || []).filter((r) => r.id !== id) };
      // Cascada al borrar
      if (section === "debts") {
        newData = {
          ...newData,
          payments: (newData.payments || []).filter((p) => p.debtId !== id),
          debtPayments: (newData.debtPayments || []).filter((p) => p.debtId !== id),
        };
      }
      if (section === "fixedExpenses") {
        newData = {
          ...newData,
          payments: (newData.payments || []).filter((p) => p.fixedExpenseId !== id),
        };
      }
      if (section === "savingsGoals") {
        newData = {
          ...newData,
          savingsDeposits: (newData.savingsDeposits || []).filter((d) => d.goalId !== id),
        };
      }
      save(newData);
    },
    [data, save]
  );

  const saveRowEdit = useCallback(
    (section, id, fields) => {
      if (!data) return;
      let extraUpdates = {};
      const dateField = section === "payments" ? "dayPago" : "fecha";
      if (fields[dateField] && /^\d{4}-\d{2}-\d{2}$/.test(fields[dateField])) {
        extraUpdates.month = dateToFinancialMonth(fields[dateField]);
      }

      let updatedData = {
        ...data,
        [section]: (data[section] || []).map((r) =>
          r.id === id ? { ...r, ...fields, ...extraUpdates } : r
        ),
      };

      // Sync: gasto fijo recurrente → pagos pendientes
      if (section === "fixedExpenses") {
        const updatedExpense = updatedData.fixedExpenses.find((f) => f.id === id);
        if (updatedExpense) {
          updatedData = {
            ...updatedData,
            payments: (updatedData.payments || []).map((p) => {
              if (p.fixedExpenseId !== id || p.estado === "PAGADO") return p;
              const newPayDate = updatedExpense.recurrente
                ? getRecurringPaymentDate(updatedExpense.diaPago, p.month)
                : p.dayPago;
              return {
                ...p,
                concepto: `🔄 ${updatedExpense.concepto}`,
                monto: updatedExpense.monto || 0,
                dayPago: newPayDate || p.dayPago,
              };
            }),
          };

          if (!updatedExpense.recurrente) {
            updatedData = {
              ...updatedData,
              payments: (updatedData.payments || []).filter(
                (p) => !(p.fixedExpenseId === id && p.estado === "PENDIENTE")
              ),
            };
          }
        }
      }

      save(updatedData);
    },
    [data, save]
  );

  // ══════════════════════════════════════════════
  // DEUDAS (con plan de pagos)
  // ══════════════════════════════════════════════

  const addDebtWithPlan = useCallback(
    (debt) => {
      if (!data) return false;
      if (!canAddMore("debts", data)) {
        setValidationError(`Máximo ${LIMITS.MAX_DEBTS} deudas permitidas`);
        return false;
      }
      const validation = validateDebt(debt);
      if (!validation.valid) {
        setValidationError(validation.errors.join(". "));
        return false;
      }
      const cleanDebt = validation.data;
      const debtId = genId();
      const newDebt = { ...cleanDebt, id: debtId };
      let newPayments = [...(data.payments || [])];

      const generaPlan =
        (cleanDebt.tipo === "cuotas" || cleanDebt.tipo === "prestamo") &&
        cleanDebt.totalCuotas > 0 &&
        cleanDebt.fechaInicio;

      if (generaPlan) {
        if (newPayments.length + cleanDebt.totalCuotas > LIMITS.MAX_PAYMENTS) {
          setValidationError(`Las cuotas generarían más de ${LIMITS.MAX_PAYMENTS} pagos en total`);
          return false;
        }
        const startMK = monthKey(cleanDebt.fechaInicio);
        const day = cleanDebt.fechaInicio.split("-")[2] || "01";
        for (let i = 0; i < cleanDebt.totalCuotas; i++) {
          const payMonthRaw = addMonths(startMK, i);
          const [py, pm] = payMonthRaw.split("-");
          const payDate = `${py}-${pm}-${day}`;
          const financialMonth = dateToFinancialMonth(payDate);
          newPayments.push({
            id: genId() + i,
            concepto: `${cleanDebt.entidad}`,
            monto: cleanDebt.proxCuota || 0,
            dayPago: payDate,
            estado: "PENDIENTE",
            month: financialMonth,
            debtId: debtId,
            cuotaNum: i + 1,
            fixedExpenseId: "",
          });
        }
      }
      save({ ...data, debts: [...(data.debts || []), newDebt], payments: newPayments });
      setValidationError("");
      return true;
    },
    [data, save]
  );

  // ══════════════════════════════════════════════
  // GASTOS FIJOS — Toggle recurrente
  // ══════════════════════════════════════════════

  const toggleRecurrente = useCallback(
    (fixedExpenseId) => {
      if (!data) return;
      const expense = (data.fixedExpenses || []).find((f) => f.id === fixedExpenseId);
      if (!expense) return;

      const newRecurrente = !expense.recurrente;
      let updatedData = {
        ...data,
        fixedExpenses: data.fixedExpenses.map((f) =>
          f.id === fixedExpenseId ? { ...f, recurrente: newRecurrente } : f
        ),
      };

      if (!newRecurrente) {
        updatedData = {
          ...updatedData,
          payments: (updatedData.payments || []).filter(
            (p) => !(p.fixedExpenseId === fixedExpenseId && p.estado === "PENDIENTE")
          ),
        };
      }

      save(updatedData);
    },
    [data, save]
  );

  // ══════════════════════════════════════════════
  // PRESUPUESTO POR CATEGORÍA
  // ══════════════════════════════════════════════

  const addOrUpdateBudget = useCallback(
    (cycleMK, categoria, monto) => {
      if (!data) return false;
      const validation = validateBudget({ cycleMK, categoria, monto });
      if (!validation.valid) {
        setValidationError(validation.errors.join(". "));
        return false;
      }
      const clean = validation.data;
      const existing = (data.budgets || []).find(
        (b) => b.cycleMK === clean.cycleMK && b.categoria === clean.categoria
      );

      let budgets;
      if (existing) {
        budgets = data.budgets.map((b) =>
          b.id === existing.id ? { ...b, monto: clean.monto } : b
        );
      } else {
        if (!canAddMore("budgets", data)) {
          setValidationError(`Máximo ${LIMITS.MAX_BUDGETS} presupuestos`);
          return false;
        }
        budgets = [...(data.budgets || []), { ...clean, id: genId() }];
      }

      save({ ...data, budgets });
      setValidationError("");
      return true;
    },
    [data, save]
  );

  const removeBudget = useCallback(
    (cycleMK, categoria) => {
      if (!data) return;
      save({
        ...data,
        budgets: (data.budgets || []).filter(
          (b) => !(b.cycleMK === cycleMK && b.categoria === categoria)
        ),
      });
    },
    [data, save]
  );

  const copyBudgetsFromPrevCycle = useCallback(
    (targetCycleMK, sourceCycleMK) => {
      if (!data) return;
      const source = (data.budgets || []).filter((b) => b.cycleMK === sourceCycleMK);
      if (source.length === 0) return;

      const existingInTarget = new Set(
        (data.budgets || [])
          .filter((b) => b.cycleMK === targetCycleMK)
          .map((b) => b.categoria)
      );

      const copied = source
        .filter((b) => !existingInTarget.has(b.categoria))
        .map((b) => ({
          id: genId(),
          cycleMK: targetCycleMK,
          categoria: b.categoria,
          monto: b.monto,
        }));

      if (copied.length === 0) return;
      save({ ...data, budgets: [...(data.budgets || []), ...copied] });
    },
    [data, save]
  );

  // ══════════════════════════════════════════════
  // METAS DE AHORRO
  // ══════════════════════════════════════════════

  const addGoal = useCallback(
    (goal) => {
      if (!data) return false;
      if (!canAddMore("savingsGoals", data)) {
        setValidationError(`Máximo ${LIMITS.MAX_SAVINGS_GOALS} metas`);
        return false;
      }
      const validation = validateSavingsGoal(goal);
      if (!validation.valid) {
        setValidationError(validation.errors.join(". "));
        return false;
      }
      if (validation.data.tipo === "emergencia") {
        const yaHay = (data.savingsGoals || []).some((g) => g.tipo === "emergencia");
        if (yaHay) {
          setValidationError("Ya existe un fondo de emergencia. Edítalo en lugar de crear otro.");
          return false;
        }
      }
      save({
        ...data,
        savingsGoals: [...(data.savingsGoals || []), { ...validation.data, id: genId() }],
      });
      setValidationError("");
      return true;
    },
    [data, save]
  );

  const updateGoal = useCallback(
    (id, fields) => {
      if (!data) return;
      const existing = (data.savingsGoals || []).find((g) => g.id === id);
      if (!existing) return;
      const merged = { ...existing, ...fields };
      const validation = validateSavingsGoal(merged);
      if (!validation.valid) {
        setValidationError(validation.errors.join(". "));
        return;
      }
      save({
        ...data,
        savingsGoals: data.savingsGoals.map((g) =>
          g.id === id ? { ...g, ...validation.data } : g
        ),
      });
      setValidationError("");
    },
    [data, save]
  );

  const deleteGoal = useCallback(
    (id) => {
      if (!data) return;
      save({
        ...data,
        savingsGoals: (data.savingsGoals || []).filter((g) => g.id !== id),
        savingsDeposits: (data.savingsDeposits || []).filter((d) => d.goalId !== id),
      });
    },
    [data, save]
  );

  const addDeposit = useCallback(
    (goalId, monto, fecha, nota = "") => {
      if (!data) return false;
      if (!canAddMore("savingsDeposits", data)) {
        setValidationError(`Máximo ${LIMITS.MAX_SAVINGS_DEPOSITS} aportes`);
        return false;
      }
      const goal = (data.savingsGoals || []).find((g) => g.id === goalId);
      if (!goal) {
        setValidationError("Meta no encontrada");
        return false;
      }
      const month = /^\d{4}-\d{2}-\d{2}$/.test(fecha)
        ? dateToFinancialMonth(fecha)
        : "";
      const validation = validateSavingsDeposit({ goalId, monto, fecha, month, nota });
      if (!validation.valid) {
        setValidationError(validation.errors.join(". "));
        return false;
      }
      save({
        ...data,
        savingsDeposits: [
          ...(data.savingsDeposits || []),
          { ...validation.data, id: genId() },
        ],
      });
      setValidationError("");
      return true;
    },
    [data, save]
  );

  const deleteDeposit = useCallback(
    (depositId) => {
      if (!data) return;
      save({
        ...data,
        savingsDeposits: (data.savingsDeposits || []).filter((d) => d.id !== depositId),
      });
    },
    [data, save]
  );

  // ══════════════════════════════════════════════
  // PAGOS EXTRA A DEUDAS (fuera del plan)
  // ══════════════════════════════════════════════

  const addDebtExtraPayment = useCallback(
    (debtId, monto, fecha, nota = "") => {
      if (!data) return false;
      if (!canAddMore("debtPayments", data)) {
        setValidationError(`Máximo ${LIMITS.MAX_DEBT_PAYMENTS} pagos extra`);
        return false;
      }
      const debt = (data.debts || []).find((d) => d.id === debtId);
      if (!debt) {
        setValidationError("Deuda no encontrada");
        return false;
      }
      const month = /^\d{4}-\d{2}-\d{2}$/.test(fecha)
        ? dateToFinancialMonth(fecha)
        : "";
      const validation = validateDebtExtraPayment({ debtId, monto, fecha, month, nota });
      if (!validation.valid) {
        setValidationError(validation.errors.join(". "));
        return false;
      }
      const clean = validation.data;

      const nuevoSaldo = Math.max(0, (Number(debt.saldoPendiente) || 0) - clean.monto);

      save({
        ...data,
        debtPayments: [...(data.debtPayments || []), { ...clean, id: genId() }],
        debts: data.debts.map((d) =>
          d.id === debtId ? { ...d, saldoPendiente: nuevoSaldo } : d
        ),
      });
      setValidationError("");
      return true;
    },
    [data, save]
  );

  const deleteDebtExtraPayment = useCallback(
    (paymentId) => {
      if (!data) return;
      const payment = (data.debtPayments || []).find((p) => p.id === paymentId);
      if (!payment) return;

      const debt = (data.debts || []).find((d) => d.id === payment.debtId);
      const nuevosDebts = debt
        ? data.debts.map((d) =>
            d.id === payment.debtId
              ? { ...d, saldoPendiente: (Number(d.saldoPendiente) || 0) + (Number(payment.monto) || 0) }
              : d
          )
        : data.debts;

      save({
        ...data,
        debts: nuevosDebts,
        debtPayments: (data.debtPayments || []).filter((p) => p.id !== paymentId),
      });
    },
    [data, save]
  );

  // ══════════════════════════════════════════════
  // 🆕 CATEGORÍAS PERSONALIZADAS (custom)
  // ══════════════════════════════════════════════

  /**
   * Añade una categoría custom.
   * Si ya existe una con el mismo label (emoji + nombre) para ese tipo,
   * devuelve false con aviso — no duplicamos.
   */
  const addCategory = useCallback(
    (cat) => {
      if (!data) return false;
      if (!canAddMore("customCategories", data)) {
        setValidationError(`Máximo ${LIMITS.MAX_CUSTOM_CATEGORIES} categorías personalizadas`);
        return false;
      }
      const validation = validateCustomCategory(cat);
      if (!validation.valid) {
        setValidationError(validation.errors.join(". "));
        return false;
      }
      const clean = validation.data;
      const emoji = clean.emoji || "📦";
      const newLabel = `${emoji} ${clean.nombre}`;

      // Evitar duplicados por label dentro del mismo tipo
      const duplicado = (data.customCategories || []).some(
        (c) => c.tipo === clean.tipo && `${c.emoji || "📦"} ${c.nombre}` === newLabel
      );
      if (duplicado) {
        setValidationError("Ya existe una categoría con ese nombre");
        return false;
      }

      save({
        ...data,
        customCategories: [
          ...(data.customCategories || []),
          {
            id: genId(),
            tipo: clean.tipo,
            nombre: clean.nombre,
            emoji,
            createdAt: Date.now(),
          },
        ],
      });
      setValidationError("");
      return true;
    },
    [data, save]
  );

  /**
   * Edita una categoría custom existente (nombre y/o emoji).
   */
  const updateCategory = useCallback(
    (id, fields) => {
      if (!data) return false;
      const existing = (data.customCategories || []).find((c) => c.id === id);
      if (!existing) return false;

      const merged = {
        tipo: existing.tipo,
        nombre: fields.nombre !== undefined ? fields.nombre : existing.nombre,
        emoji: fields.emoji !== undefined ? fields.emoji : existing.emoji,
      };
      const validation = validateCustomCategory(merged);
      if (!validation.valid) {
        setValidationError(validation.errors.join(". "));
        return false;
      }
      const clean = validation.data;

      save({
        ...data,
        customCategories: data.customCategories.map((c) =>
          c.id === id
            ? { ...c, nombre: clean.nombre, emoji: clean.emoji || "📦" }
            : c
        ),
      });
      setValidationError("");
      return true;
    },
    [data, save]
  );

  /**
   * Elimina una categoría custom. No toca los gastos que la tuvieran
   * asignada (seguirán mostrando el string de categoría tal cual).
   */
  const deleteCategory = useCallback(
    (id) => {
      if (!data) return;
      save({
        ...data,
        customCategories: (data.customCategories || []).filter((c) => c.id !== id),
      });
    },
    [data, save]
  );

  // ══════════════════════════════════════════════
  // RESET
  // ══════════════════════════════════════════════
  const resetAll = useCallback(() => {
    save(emptyData());
  }, [save]);

  return {
    // Estado
    data,
    loading,
    syncing,
    online,
    lastSyncTime,
    validationError,
    setValidationError,
    isEditingRef,
    // Generales
    save,
    addRow,
    updField,
    deleteRow,
    saveRowEdit,
    resetAll,
    // Gastos fijos
    toggleRecurrente,
    ensureRecurringPayments,
    // Deudas
    addDebtWithPlan,
    addDebtExtraPayment,
    deleteDebtExtraPayment,
    // Presupuesto
    addOrUpdateBudget,
    removeBudget,
    copyBudgetsFromPrevCycle,
    // Metas de ahorro
    addGoal,
    updateGoal,
    deleteGoal,
    addDeposit,
    deleteDeposit,
    // 🆕 Categorías personalizadas
    addCategory,
    updateCategory,
    deleteCategory,
  };
}
