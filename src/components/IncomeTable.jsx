import { useState } from "react";
import Section from "./Section.jsx";
import ActionButtons from "./shared/ActionButtons.jsx";
import { fmt, fmtDate, todayISO, formatMonthLabel } from "../utils/format.js";
import { dateToFinancialMonth } from "../utils/cycle.js";

// Titulares sugeridos (el usuario puede escribir otros)
const TITULARES_SUGERIDOS = ["yo", "pareja"];

export default function IncomeTable({ filteredIncomes, addRow, deleteRow, saveRowEdit, selectedMonth, setAddingTo, addingTo, mobileMode }) {
  const [newRow, setNewRow] = useState({});
  const [editingRow, setEditingRow] = useState(null);

  const total = filteredIncomes.reduce((s, i) => s + (i.amount || 0), 0);

  // Totales por titular para mostrar desglose
  const porTitular = filteredIncomes.reduce((acc, i) => {
    const t = i.titular || "yo";
    acc[t] = (acc[t] || 0) + (i.amount || 0);
    return acc;
  }, {});

  const startRowEdit = (_s, item) => setEditingRow({ id: item.id, fields: { ...item } });
  const cancelRowEdit = () => setEditingRow(null);
  const handleSaveRowEdit = () => {
    if (!editingRow) return;
    saveRowEdit("incomes", editingRow.id, editingRow.fields);
    setEditingRow(null);
  };
  const isRowEditing = (id) => editingRow?.id === id;
  const rowField = (field) => editingRow?.fields?.[field] ?? "";
  const setRowField = (field, val) =>
    setEditingRow((prev) => prev ? { ...prev, fields: { ...prev.fields, [field]: val } } : prev);

  const handleAdd = () => {
    setAddingTo("incomes");
    setNewRow({ concepto: "", amount: "", fecha: todayISO(), titular: "yo", tipo: "fijo" });
  };

  const handleSaveNew = () => {
    const success = addRow("incomes", {
      concepto: newRow.concepto,
      amount: parseFloat(newRow.amount) || 0,
      fecha: newRow.fecha,
      month: dateToFinancialMonth(newRow.fecha) || selectedMonth,
      titular: newRow.titular || "yo",
      tipo: newRow.tipo || "fijo",
    });
    if (success) setAddingTo(null);
  };

  // Emoji para el tipo de ingreso
  const tipoIcon = (tipo) => tipo === "variable" ? "📊" : "💰";

  const AddForm = (
    <div style={{
      background: "var(--bg-subtle)",
      borderRadius: "var(--radius-md)",
      padding: 14, marginBottom: 10,
      border: "1.5px solid var(--accent)",
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10 }}>
        Nuevo ingreso
      </div>
      <input className="sheet-input" placeholder="Concepto (ej: Nómina)" value={newRow.concepto || ""} onChange={(e) => setNewRow({ ...newRow, concepto: e.target.value })} maxLength={100} />
      <div style={{ display: "flex", gap: 6 }}>
        <input className="sheet-input" type="number" placeholder="Monto €" value={newRow.amount || ""} onChange={(e) => setNewRow({ ...newRow, amount: e.target.value })} style={{ flex: 1 }} />
        <input className="sheet-input" type="date" value={newRow.fecha || ""} onChange={(e) => setNewRow({ ...newRow, fecha: e.target.value })} style={{ flex: 1, colorScheme: "light dark" }} />
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          className="sheet-input"
          placeholder="Titular (yo, pareja...)"
          value={newRow.titular || ""}
          onChange={(e) => setNewRow({ ...newRow, titular: e.target.value })}
          maxLength={30}
          list="titulares-sugeridos"
          style={{ flex: 1 }}
        />
        <select className="sheet-input" value={newRow.tipo || "fijo"} onChange={(e) => setNewRow({ ...newRow, tipo: e.target.value })} style={{ flex: 1 }}>
          <option value="fijo">💰 Fijo</option>
          <option value="variable">📊 Variable</option>
        </select>
      </div>
      <datalist id="titulares-sugeridos">
        {TITULARES_SUGERIDOS.map((t) => <option key={t} value={t} />)}
      </datalist>
      <button className="btn-primary btn-primary--accent" onClick={handleSaveNew} style={{ marginTop: 4 }}>
        Añadir ingreso
      </button>
    </div>
  );

  return (
    <Section title={`Ingresos · ${formatMonthLabel(selectedMonth)}`} icon="💰" onAdd={handleAdd} mobileMode={mobileMode}>
      {/* Desglose por titular (si hay más de uno) */}
      {Object.keys(porTitular).length > 1 && (
        <div style={{
          padding: "8px 12px", marginBottom: 10,
          background: "var(--bg-subtle)",
          borderRadius: "var(--radius-md)",
          fontSize: 11, fontWeight: 600,
          display: "flex", gap: 10, flexWrap: "wrap",
        }}>
          {Object.entries(porTitular).map(([titular, monto]) => (
            <div key={titular} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: "var(--text-secondary)" }}>{titular}:</span>
              <span style={{ color: "var(--success)", fontFeatureSettings: "'tnum'" }}>{fmt(monto)}</span>
            </div>
          ))}
        </div>
      )}

      {addingTo === "incomes" && AddForm}

      <div className="item-list">
        {filteredIncomes.map((i) => {
          const re = isRowEditing(i.id);
          const titular = i.titular || "yo";
          const tipo = i.tipo || "fijo";

          if (re) {
            return (
              <div key={i.id} style={{
                background: "var(--bg-subtle)", borderRadius: "var(--radius-md)",
                padding: 12, border: "1.5px solid var(--accent)",
                display: "flex", flexDirection: "column", gap: 6,
              }}>
                <input className="sheet-input" value={rowField("concepto")} onChange={(e) => setRowField("concepto", e.target.value)} maxLength={100} />
                <div style={{ display: "flex", gap: 6 }}>
                  <input className="sheet-input" type="number" value={rowField("amount")} onChange={(e) => setRowField("amount", parseFloat(e.target.value) || 0)} style={{ flex: 1 }} />
                  <input className="sheet-input" type="date" value={rowField("fecha")} onChange={(e) => setRowField("fecha", e.target.value)} style={{ flex: 1, colorScheme: "light dark" }} />
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    className="sheet-input"
                    placeholder="Titular"
                    value={rowField("titular")}
                    onChange={(e) => setRowField("titular", e.target.value)}
                    maxLength={30}
                    list="titulares-sugeridos-edit"
                    style={{ flex: 1 }}
                  />
                  <select className="sheet-input" value={rowField("tipo") || "fijo"} onChange={(e) => setRowField("tipo", e.target.value)} style={{ flex: 1 }}>
                    <option value="fijo">💰 Fijo</option>
                    <option value="variable">📊 Variable</option>
                  </select>
                </div>
                <datalist id="titulares-sugeridos-edit">
                  {TITULARES_SUGERIDOS.map((t) => <option key={t} value={t} />)}
                </datalist>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn-primary btn-primary--accent" onClick={handleSaveRowEdit} style={{ flex: 1 }}>Guardar</button>
                  <button className="btn-secondary" onClick={cancelRowEdit}>Cancelar</button>
                </div>
              </div>
            );
          }

          return (
            <div key={i.id} className="item">
              <div className="item__icon item__icon--income">{tipoIcon(tipo)}</div>
              <div className="item__body">
                <div className="item__title">{i.concepto}</div>
                <div className="item__subtitle">
                  {fmtDate(i.fecha)} · {titular}
                  {tipo === "variable" && <span style={{ marginLeft: 4, color: "var(--text-tertiary)" }}>· variable</span>}
                </div>
              </div>
              <div className="item__right">
                <div className="item__amount item__amount--pos">+{fmt(i.amount).replace("−", "").replace("-", "")}</div>
                <div style={{ display: "flex", gap: 2, marginTop: 4, justifyContent: "flex-end" }}>
                  <ActionButtons
                    section="incomes" id={i.id} item={i}
                    isEditing={false}
                    onStartEdit={startRowEdit}
                    onSaveEdit={handleSaveRowEdit}
                    onCancelEdit={cancelRowEdit}
                    onDelete={() => deleteRow("incomes", i.id)}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {filteredIncomes.length === 0 && addingTo !== "incomes" && (
          <div className="empty">
            <div className="empty__emoji">💰</div>
            <div className="empty__title">Sin ingresos este ciclo</div>
            <div className="empty__subtitle">Añade tu nómina o ingresos extra</div>
          </div>
        )}
      </div>

      {filteredIncomes.length > 0 && (
        <div style={{
          padding: "10px 14px", marginTop: 6,
          background: "var(--success-bg)", borderRadius: "var(--radius-md)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--success-text)", textTransform: "uppercase", letterSpacing: 0.5 }}>Total</span>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--success)" }}>{fmt(total)}</div>
        </div>
      )}
    </Section>
  );
}
