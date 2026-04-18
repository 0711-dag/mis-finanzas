// ══════════════════════════════════════════════
// 🎯 Panel de Metas de Ahorro
// Se muestra como una sección más en Dashboard
// Permite crear metas (fondo emergencia + personalizadas),
// registrar aportes y ver el progreso.
// ══════════════════════════════════════════════
import { useState } from "react";
import Section from "./Section.jsx";
import ActionButtons from "./shared/ActionButtons.jsx";
import { fmt, fmtDate, todayISO } from "../utils/format.js";
import { dateToFinancialMonth } from "../utils/cycle.js";
import {
  calcGoalProgress,
  suggestEmergencyFund,
  calcMonthlyTarget,
} from "../utils/finance.js";

// Iconos sugeridos para metas personalizadas
const ICONS_SUGERIDOS = ["🎯", "🏖️", "🚗", "🏠", "🎓", "💍", "🎄", "💻", "🎁", "⭐"];

export default function SavingsGoals({
  data,
  addGoal,
  updateGoal,
  deleteGoal,
  addDeposit,
  deleteDeposit,
  setAddingTo,
  addingTo,
  mobileMode,
}) {
  const [newGoal, setNewGoal] = useState({});
  const [editingGoal, setEditingGoal] = useState(null);
  const [depositingTo, setDepositingTo] = useState(null); // id de meta
  const [depositData, setDepositData] = useState({ monto: "", fecha: todayISO(), nota: "" });
  const [showHistory, setShowHistory] = useState(null); // id de meta con historial abierto

  const goals = data.savingsGoals || [];
  const deposits = data.savingsDeposits || [];
  const fixedExpenses = data.fixedExpenses || [];

  // Sugerencia de fondo de emergencia basada en gastos fijos
  const emergencySugg = suggestEmergencyFund(fixedExpenses);
  const yaHayEmergencia = goals.some((g) => g.tipo === "emergencia");

  // ── Añadir nueva meta ──
  const handleAdd = (tipo = "personalizada") => {
    setAddingTo("savingsGoals");
    if (tipo === "emergencia") {
      setNewGoal({
        tipo: "emergencia",
        nombre: "Fondo de emergencia",
        objetivo: emergencySugg.recomendado,
        fechaLimite: "",
        icono: "🛡️",
      });
    } else {
      setNewGoal({
        tipo: "personalizada",
        nombre: "",
        objetivo: "",
        fechaLimite: "",
        icono: "🎯",
      });
    }
  };

  const handleSaveNew = () => {
    const ok = addGoal({
      nombre: newGoal.nombre,
      tipo: newGoal.tipo || "personalizada",
      objetivo: parseFloat(newGoal.objetivo) || 0,
      fechaLimite: newGoal.fechaLimite || "",
      icono: newGoal.icono || "🎯",
    });
    if (ok) {
      setAddingTo(null);
      setNewGoal({});
    }
  };

  // ── Editar meta existente ──
  const startEditGoal = (_s, goal) => {
    setEditingGoal({ id: goal.id, fields: { ...goal } });
  };
  const cancelEditGoal = () => setEditingGoal(null);
  const handleSaveEdit = () => {
    if (!editingGoal) return;
    updateGoal(editingGoal.id, {
      nombre: editingGoal.fields.nombre,
      objetivo: parseFloat(editingGoal.fields.objetivo) || 0,
      fechaLimite: editingGoal.fields.fechaLimite || "",
      icono: editingGoal.fields.icono || "🎯",
    });
    setEditingGoal(null);
  };
  const isEditing = (id) => editingGoal?.id === id;
  const editField = (f) => editingGoal?.fields?.[f] ?? "";
  const setEditField = (f, v) =>
    setEditingGoal((p) => (p ? { ...p, fields: { ...p.fields, [f]: v } } : p));

  // ── Aportar a una meta ──
  const startDeposit = (goalId) => {
    setDepositingTo(goalId);
    setDepositData({ monto: "", fecha: todayISO(), nota: "" });
  };
  const cancelDeposit = () => {
    setDepositingTo(null);
    setDepositData({ monto: "", fecha: todayISO(), nota: "" });
  };
  const handleSaveDeposit = () => {
    const ok = addDeposit(
      depositingTo,
      parseFloat(depositData.monto) || 0,
      depositData.fecha,
      depositData.nota || ""
    );
    if (ok) {
      setDepositingTo(null);
      setDepositData({ monto: "", fecha: todayISO(), nota: "" });
    }
  };

  // ── Borrar meta ──
  const handleDeleteGoal = (_s, id) => deleteGoal(id);

  // ══════════════════════════════════════════════
  // Formulario de nueva meta
  // ══════════════════════════════════════════════
  const AddGoalForm = (
    <div style={{
      background: "var(--bg-subtle)",
      borderRadius: "var(--radius-md)",
      padding: 14, marginBottom: 10,
      border: "1.5px solid var(--accent)",
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10 }}>
        {newGoal.tipo === "emergencia" ? "Fondo de emergencia" : "Nueva meta de ahorro"}
      </div>

      {newGoal.tipo === "emergencia" && emergencySugg.mensual > 0 && (
        <div style={{
          padding: "8px 10px", marginBottom: 10,
          background: "var(--info-bg)", color: "var(--info-text)",
          borderRadius: "var(--radius-sm)", fontSize: 11, lineHeight: 1.4,
        }}>
          💡 Con tus gastos fijos ({fmt(emergencySugg.mensual)}/mes),
          se recomienda acumular entre {fmt(emergencySugg.minimo)} (3 meses)
          y {fmt(emergencySugg.recomendado)} (6 meses).
        </div>
      )}

      <input
        className="sheet-input"
        placeholder={newGoal.tipo === "emergencia" ? "Nombre (opcional)" : "Nombre (ej: Viaje Japón)"}
        value={newGoal.nombre || ""}
        onChange={(e) => setNewGoal({ ...newGoal, nombre: e.target.value })}
        maxLength={50}
      />

      <div style={{ display: "flex", gap: 6 }}>
        <input
          className="sheet-input"
          type="number"
          placeholder="Objetivo €"
          value={newGoal.objetivo || ""}
          onChange={(e) => setNewGoal({ ...newGoal, objetivo: e.target.value })}
          style={{ flex: 1 }}
        />
        <input
          className="sheet-input"
          type="date"
          placeholder="Fecha límite"
          value={newGoal.fechaLimite || ""}
          onChange={(e) => setNewGoal({ ...newGoal, fechaLimite: e.target.value })}
          style={{ flex: 1, colorScheme: "light dark" }}
        />
      </div>

      {newGoal.tipo !== "emergencia" && (
        <>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 6, marginTop: 4 }}>
            Icono
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
            {ICONS_SUGERIDOS.map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => setNewGoal({ ...newGoal, icono: ic })}
                style={{
                  width: 36, height: 36, fontSize: 18,
                  borderRadius: "var(--radius-sm)",
                  background: newGoal.icono === ic ? "var(--accent-subtle)" : "var(--bg-surface)",
                  border: `1.5px solid ${newGoal.icono === ic ? "var(--accent)" : "var(--border-default)"}`,
                  cursor: "pointer",
                }}
              >{ic}</button>
            ))}
          </div>
        </>
      )}

      <button
        className="btn-primary btn-primary--accent"
        onClick={handleSaveNew}
        style={{ marginTop: 4 }}
      >
        Crear meta
      </button>
    </div>
  );

  // ══════════════════════════════════════════════
  // Formulario de aporte
  // ══════════════════════════════════════════════
  const renderDepositForm = () => (
    <div style={{
      background: "var(--bg-subtle)",
      borderRadius: "var(--radius-sm)",
      padding: 10, marginTop: 8,
      border: "1.5px solid var(--accent)",
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
        Nuevo aporte
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          className="sheet-input"
          type="number"
          placeholder="Monto €"
          value={depositData.monto}
          onChange={(e) => setDepositData({ ...depositData, monto: e.target.value })}
          autoFocus
          style={{ flex: 1 }}
        />
        <input
          className="sheet-input"
          type="date"
          value={depositData.fecha}
          onChange={(e) => setDepositData({ ...depositData, fecha: e.target.value })}
          style={{ flex: 1, colorScheme: "light dark" }}
        />
      </div>
      <input
        className="sheet-input"
        placeholder="Nota (opcional)"
        value={depositData.nota}
        onChange={(e) => setDepositData({ ...depositData, nota: e.target.value })}
        maxLength={100}
      />
      <div style={{ display: "flex", gap: 6 }}>
        <button
          className="btn-primary btn-primary--accent"
          onClick={handleSaveDeposit}
          style={{ flex: 1 }}
          disabled={!depositData.monto}
        >
          Guardar aporte
        </button>
        <button className="btn-secondary" onClick={cancelDeposit}>
          Cancelar
        </button>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════
  // Botones de añadir (según si ya existe fondo de emergencia)
  // ══════════════════════════════════════════════
  const handleAddClick = () => {
    // Si no hay fondo de emergencia, sugerir crearlo primero
    if (!yaHayEmergencia && goals.length === 0) {
      handleAdd("emergencia");
    } else {
      handleAdd("personalizada");
    }
  };

  return (
    <Section title="Metas de ahorro" icon="🎯" onAdd={handleAddClick} mobileMode={mobileMode}>
      {/* Botones específicos si ya hay metas, para elegir tipo al añadir */}
      {goals.length > 0 && !yaHayEmergencia && addingTo !== "savingsGoals" && (
        <button
          className="btn-secondary"
          onClick={() => handleAdd("emergencia")}
          style={{ width: "100%", marginBottom: 10 }}
        >
          🛡️ Crear fondo de emergencia
        </button>
      )}

      {addingTo === "savingsGoals" && AddGoalForm}

      <div className="item-list">
        {goals.map((g) => {
          const progress = calcGoalProgress(g, deposits);
          const monthlyTarget = calcMonthlyTarget(g, deposits);
          const misDeposits = deposits.filter((d) => d.goalId === g.id);
          const esEmergencia = g.tipo === "emergencia";
          const icon = g.icono || (esEmergencia ? "🛡️" : "🎯");
          const completada = progress.porcentaje >= 100;
          const showingHistory = showHistory === g.id;
          const showingDeposit = depositingTo === g.id;

          // Modo edición
          if (isEditing(g.id)) {
            return (
              <div key={g.id} style={{
                background: "var(--bg-subtle)", borderRadius: "var(--radius-md)",
                padding: 12, border: "1.5px solid var(--accent)",
                display: "flex", flexDirection: "column", gap: 6,
              }}>
                <input
                  className="sheet-input"
                  value={editField("nombre")}
                  onChange={(e) => setEditField("nombre", e.target.value)}
                  maxLength={50}
                />
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    className="sheet-input"
                    type="number"
                    value={editField("objetivo")}
                    onChange={(e) => setEditField("objetivo", e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <input
                    className="sheet-input"
                    type="date"
                    value={editField("fechaLimite")}
                    onChange={(e) => setEditField("fechaLimite", e.target.value)}
                    style={{ flex: 1, colorScheme: "light dark" }}
                  />
                </div>
                {!esEmergencia && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {ICONS_SUGERIDOS.map((ic) => (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => setEditField("icono", ic)}
                        style={{
                          width: 30, height: 30, fontSize: 15,
                          borderRadius: "var(--radius-sm)",
                          background: editField("icono") === ic ? "var(--accent-subtle)" : "var(--bg-surface)",
                          border: `1.5px solid ${editField("icono") === ic ? "var(--accent)" : "var(--border-default)"}`,
                        }}
                      >{ic}</button>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn-primary btn-primary--accent" onClick={handleSaveEdit} style={{ flex: 1 }}>Guardar</button>
                  <button className="btn-secondary" onClick={cancelEditGoal}>Cancelar</button>
                </div>
              </div>
            );
          }

          // Visualización normal
          return (
            <div key={g.id} style={{
              background: "var(--bg-surface)",
              borderRadius: "var(--radius-md)",
              border: `1px solid ${completada ? "var(--success)" : "var(--border-subtle)"}`,
              padding: 12,
              opacity: completada ? 0.85 : 1,
            }}>
              {/* Cabecera: icono + nombre + acciones */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div className="item__icon" style={{
                  background: esEmergencia ? "var(--info-bg)" : "var(--bg-subtle)",
                  fontSize: 20,
                }}>
                  {icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {g.nombre}
                    {completada && <span style={{ color: "var(--success)", marginLeft: 6 }}>✓</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
                    {esEmergencia ? "🛡️ Fondo de emergencia" : "🎯 Meta personalizada"}
                    {g.fechaLimite && <span> · Hasta {fmtDate(g.fechaLimite)}</span>}
                  </div>
                </div>
                <ActionButtons
                  section="savingsGoals" id={g.id} item={g}
                  isEditing={false}
                  onStartEdit={startEditGoal}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={cancelEditGoal}
                  onDelete={handleDeleteGoal}
                />
              </div>

              {/* Montos */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", fontFeatureSettings: "'tnum'" }}>
                  {fmt(progress.acumulado)}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", fontFeatureSettings: "'tnum'" }}>
                  de {fmt(g.objetivo)}
                </div>
              </div>

              {/* Barra de progreso */}
              <div className="progress" style={{ height: 6 }}>
                <div
                  className="progress__fill"
                  style={{
                    width: `${Math.min(100, progress.porcentaje)}%`,
                    background: completada ? "var(--success)" : "var(--accent)",
                  }}
                />
              </div>

              <div style={{
                display: "flex", justifyContent: "space-between",
                marginTop: 6, fontSize: 11,
              }}>
                <span style={{ color: completada ? "var(--success)" : "var(--text-secondary)", fontWeight: 600 }}>
                  {progress.porcentaje.toFixed(0)}%
                </span>
                <span style={{ color: "var(--text-secondary)" }}>
                  {completada
                    ? "¡Meta cumplida!"
                    : `Faltan ${fmt(progress.falta)}`}
                </span>
              </div>

              {/* Sugerencia de aporte mensual */}
              {!completada && monthlyTarget && monthlyTarget > 0 && (
                <div style={{
                  marginTop: 8, padding: "6px 10px",
                  background: "var(--bg-subtle)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 11, color: "var(--text-secondary)",
                }}>
                  💡 Ahorra {fmt(monthlyTarget)}/mes para cumplirlo a tiempo
                </div>
              )}

              {/* Acciones: aportar / ver historial */}
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                {!completada && !showingDeposit && (
                  <button
                    className="btn-primary btn-primary--accent"
                    onClick={() => startDeposit(g.id)}
                    style={{ flex: 1 }}
                  >
                    + Aportar
                  </button>
                )}
                {misDeposits.length > 0 && (
                  <button
                    className="btn-secondary"
                    onClick={() => setShowHistory(showingHistory ? null : g.id)}
                    style={{ flex: showingDeposit ? "0 0 auto" : 1 }}
                  >
                    {showingHistory ? "Ocultar" : `Ver aportes (${misDeposits.length})`}
                  </button>
                )}
              </div>

              {/* Formulario de aporte */}
              {showingDeposit && renderDepositForm()}

              {/* Historial de aportes */}
              {showingHistory && misDeposits.length > 0 && (
                <div style={{
                  marginTop: 10, padding: 10,
                  background: "var(--bg-subtle)",
                  borderRadius: "var(--radius-sm)",
                  display: "flex", flexDirection: "column", gap: 4,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.4 }}>
                    Historial de aportes
                  </div>
                  {misDeposits
                    .slice()
                    .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""))
                    .map((d) => (
                      <div key={d.id} style={{
                        display: "flex", justifyContent: "space-between",
                        alignItems: "center", padding: "4px 0",
                        borderBottom: "1px solid var(--border-subtle)",
                        fontSize: 12,
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: "var(--text-primary)" }}>{fmtDate(d.fecha)}</div>
                          {d.nota && (
                            <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{d.nota}</div>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontWeight: 700, color: "var(--success)", fontFeatureSettings: "'tnum'" }}>
                            +{fmt(d.monto)}
                          </span>
                          <button
                            className="edit-icon edit-icon--delete"
                            onClick={() => deleteDeposit(d.id)}
                            title="Borrar aporte"
                          >✕</button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Estado vacío */}
        {goals.length === 0 && addingTo !== "savingsGoals" && (
          <div className="empty">
            <div className="empty__emoji">🎯</div>
            <div className="empty__title">Sin metas de ahorro</div>
            <div className="empty__subtitle">
              Te sugerimos empezar por un fondo de emergencia
            </div>
            {emergencySugg.mensual > 0 && (
              <button
                className="btn-primary btn-primary--accent"
                onClick={() => handleAdd("emergencia")}
                style={{ marginTop: 12 }}
              >
                🛡️ Crear fondo de emergencia
              </button>
            )}
          </div>
        )}
      </div>
    </Section>
  );
}
