// ══════════════════════════════════════════════
// 📊 Hook principal de datos financieros
// Carga, guarda y gestiona todo el CRUD
// + Auto-generación de pagos recurrentes
// ══════════════════════════════════════════════
import { useState, useEffect, useCallback, useRef } from "react";
import { db, ref, onValue } from "../firebase.js";
import useDebouncedSave from "./useDebouncedSave.js";
import {
  sanitizeText,
  sanitizeAmount,
  sanitizeInteger,
  canAddMore,
  validateDebt,
  validateFixedExpense,
  validateIncome,
  validateVariableExpense,
  validatePayment,
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
});

/**
 * Genera pagos automáticos para gastos fijos recurrentes en un ciclo dado.
 * Devuelve los nuevos pagos que faltan (no duplica los existentes).
 */
function generateRecurringPayments(fixedExpenses, existingPayments, cycleMK) {
  const recurrentes = (fixedExpenses || []).filter((f) => f.recurrente);
  const newPayments = [];

  for (const expense of recurrentes) {
    // Comprobar si ya existe un pago generado para este gasto fijo en este ciclo
    const alreadyExists = existingPayments.some(
      (p) => p.fixedExpenseId === expense.id && p.month === cycleMK
    );
    if (alreadyExists) continue;

    // Calcular la fecha de pago dentro del ciclo
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

  // Escuchar cambios en Firebase
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
          setData({
            debts: val.debts || [],
            payments: val.payments || [],
            fixedExpenses: val.fixedExpenses || [],
            incomes: val.incomes || [],
            variableExpenses: val.variableExpenses || [],
          });
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
          if (local) setData(JSON.parse(local));
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
  // Se ejecuta cuando cambian los datos o al cargar
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

      // Verificar que no superamos el límite de pagos
      const totalPayments = (currentData.payments || []).length + newPayments.length;
      if (totalPayments > LIMITS.MAX_PAYMENTS) return currentData;

      const updatedData = {
        ...currentData,
        payments: [...(currentData.payments || []), ...newPayments],
      };

      // Guardar automáticamente
      save(updatedData);
      return updatedData;
    },
    [save]
  );

  // ── CRUD helpers ──

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
      if (["saldoPendiente", "proxCuota", "monto", "amount", "totalCuotas", "cuotaActual"].includes(field)) {
        cleanVal = field === "totalCuotas" || field === "cuotaActual"
          ? sanitizeInteger(val)
          : sanitizeAmount(val);
      } else if (typeof val === "string" && !["dayPago", "fecha", "fechaInicio", "month", "estado"].includes(field)) {
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
      // Si se borra una deuda, eliminar sus pagos vinculados
      if (section === "debts") {
        newData = { ...newData, payments: (newData.payments || []).filter((p) => p.debtId !== id) };
      }
      // Si se borra un gasto fijo, eliminar sus pagos recurrentes vinculados
      if (section === "fixedExpenses") {
        newData = { ...newData, payments: (newData.payments || []).filter((p) => p.fixedExpenseId !== id) };
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

      // Si editamos un gasto fijo recurrente, actualizar sus pagos PENDIENTES vinculados
      if (section === "fixedExpenses") {
        const updatedExpense = updatedData.fixedExpenses.find((f) => f.id === id);
        if (updatedExpense) {
          updatedData = {
            ...updatedData,
            payments: (updatedData.payments || []).map((p) => {
              if (p.fixedExpenseId !== id || p.estado === "PAGADO") return p;
              // Actualizar concepto y monto del pago pendiente
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

          // Si se desactivó recurrente, eliminar pagos pendientes vinculados
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

      if (cleanDebt.totalCuotas > 0 && cleanDebt.fechaInicio) {
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

  // ── Toggle recurrente de un gasto fijo ──
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

      // Si se desactiva, eliminar pagos pendientes de este gasto fijo
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

  const resetAll = useCallback(() => {
    save(emptyData());
  }, [save]);

  return {
    data,
    loading,
    syncing,
    online,
    lastSyncTime,
    validationError,
    setValidationError,
    isEditingRef,
    save,
    addRow,
    updField,
    deleteRow,
    saveRowEdit,
    addDebtWithPlan,
    resetAll,
    toggleRecurrente,
    ensureRecurringPayments,
  };
}
