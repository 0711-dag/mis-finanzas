// ══════════════════════════════════════════════
// 📊 Hook principal de datos financieros
// Carga, guarda y gestiona todo el CRUD
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
import { dateToFinancialMonth } from "../utils/cycle.js";

const emptyData = () => ({
  debts: [],
  payments: [],
  fixedExpenses: [],
  incomes: [],
  variableExpenses: [],
});

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
      save({
        ...data,
        [section]: (data[section] || []).map((r) =>
          r.id === id ? { ...r, ...fields, ...extraUpdates } : r
        ),
      });
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
          });
        }
      }
      save({ ...data, debts: [...(data.debts || []), newDebt], payments: newPayments });
      setValidationError("");
      return true;
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
  };
}
