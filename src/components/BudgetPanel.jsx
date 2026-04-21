// ══════════════════════════════════════════════
// 📊 Panel de Presupuesto
// Se muestra dentro de VariableExpenses al pulsar "Ver presupuesto"
// Permite definir/editar el presupuesto por categoría y ver el consumo real
// ══════════════════════════════════════════════
import { useState } from "react";
import { fmt } from "../utils/format.js";
import { calcBudgetUsage } from "../utils/finance.js";
import { getDefaultCategories } from "../utils/categoryDefaults.js";

export default function BudgetPanel({
  budgets,
  variableExpenses,
  cycleMK,
  addOrUpdateBudget,
  removeBudget,
  copyBudgetsFromPrevCycle,
  getPrevCycle,
  // Lista unificada de categorías (defaults + custom) inyectada por VariableExpenses.
  // 🆕 Si no llega (retrocompatibilidad), caemos a la lista única global.
  allCategories,
}) {
  const [editingCat, setEditingCat] = useState(null); // categoría en edición
  const [editValue, setEditValue] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [newAmount, setNewAmount] = useState("");

  // 🆕 Fuente de categorías a ofrecer al crear un presupuesto:
  // - Si nos pasaron `allCategories`, la usamos (incluye custom + defaults unificadas).
  // - Si no, caemos a la lista única de defaults.
  const categoriesSource = (allCategories && allCategories.length > 0)
    ? allCategories
    : getDefaultCategories();

  // Cálculo del uso del presupuesto por categoría
  const usage = calcBudgetUsage(budgets, variableExpenses, cycleMK);
  const { categorias, totalPresupuestado, totalGastado, totalRestante } = usage;

  // Porcentaje total del presupuesto
  const pctTotal = totalPresupuestado > 0 ? (totalGastado / totalPresupuestado) * 100 : 0;

  // Categorías disponibles para añadir (que no tengan ya presupuesto)
  const yaPresupuestadas = new Set(
    categorias.filter((c) => c.presupuestado > 0).map((c) => c.categoria)
  );
  const disponibles = categoriesSource.filter((c) => !yaPresupuestadas.has(c));

  // Guardar edición de una categoría existente
  const handleSaveEdit = (categoria) => {
    const monto = parseFloat(editValue) || 0;
    if (monto <= 0) {
      removeBudget(cycleMK, categoria);
    } else {
      addOrUpdateBudget(cycleMK, categoria, monto);
    }
    setEditingCat(null);
    setEditValue("");
  };

  // Añadir nueva categoría al presupuesto
  const handleAddNew = () => {
    if (!newCat || !newAmount) return;
    const ok = addOrUpdateBudget(cycleMK, newCat, parseFloat(newAmount) || 0);
    if (ok) {
      setShowAdd(false);
      setNewCat("");
      setNewAmount("");
    }
  };

  // Copiar presupuesto del ciclo anterior
  const handleCopyPrev = () => {
    const prev = getPrevCycle?.(cycleMK);
    if (prev) copyBudgetsFromPrevCycle(cycleMK, prev);
  };

  // Color según estado del presupuesto de una categoría
  const stateColor = (estado) => {
    if (estado === "excedido") return "var(--danger)";
    if (estado === "alerta") return "var(--warning)";
    if (estado === "sin_presupuesto") return "var(--text-tertiary)";
    return "var(--success)";
  };

  // Si no hay presupuesto definido todavía
  const sinPresupuesto = categorias.filter((c) => c.presupuestado > 0).length === 0;

  return (
    <div style={{
      background: "var(--bg-subtle)",
      borderRadius: "var(--radius-md)",
      padding: 14,
      marginBottom: 10,
      border: "1px solid var(--border-subtle)",
    }}>
      {/* Cabecera */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        marginBottom: 14, gap: 10,
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
            📊 Presupuesto del ciclo
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
            Define cuánto quieres gastar por categoría
          </div>
        </div>
      </div>

      {/* Resumen global (solo si hay presupuesto) */}
      {!sinPresupuesto && (
        <div style={{
          background: "var(--bg-surface)",
          borderRadius: "var(--radius-sm)",
          padding: 12, marginBottom: 12,
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "baseline", marginBottom: 6,
          }}>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>
              Total del ciclo
            </div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              {pctTotal.toFixed(0)}% usado
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", fontFeatureSettings: "'tnum'" }}>
              {fmt(totalGastado)}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", fontFeatureSettings: "'tnum'" }}>
              de {fmt(totalPresupuestado)}
            </div>
          </div>
          {/* Barra global */}
          <div className="progress" style={{ height: 6 }}>
            <div
              className="progress__fill"
              style={{
                width: `${Math.min(100, pctTotal)}%`,
                background: pctTotal >= 100 ? "var(--danger)"
                  : pctTotal >= 80 ? "var(--warning)"
                  : "var(--accent)",
              }}
            />
          </div>
          <div style={{
            marginTop: 8, fontSize: 12,
            color: totalRestante >= 0 ? "var(--success)" : "var(--danger)",
            fontWeight: 600,
          }}>
            {totalRestante >= 0
              ? `Te quedan ${fmt(totalRestante)}`
              : `Excedido en ${fmt(Math.abs(totalRestante))}`}
          </div>
        </div>
      )}

      {/* Lista de categorías */}
      {sinPresupuesto && categorias.length === 0 ? (
        <div style={{
          padding: 20, textAlign: "center",
          color: "var(--text-secondary)", fontSize: 13,
        }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>📊</div>
          <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
            Sin presupuesto definido
          </div>
          <div style={{ fontSize: 12 }}>
            Define cuánto quieres gastar en cada categoría
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {categorias.map((c) => {
            const emoji = c.categoria.split(" ")[0] || "📦";
            const nombre = c.categoria.replace(/^[^\s]+\s/, "") || c.categoria;
            const color = stateColor(c.estado);
            const isEditing = editingCat === c.categoria;
            const pct = c.presupuestado > 0 ? (c.gastado / c.presupuestado) * 100 : 0;

            return (
              <div key={c.categoria} style={{
                background: "var(--bg-surface)",
                borderRadius: "var(--radius-sm)",
                padding: 10,
                border: `1px solid ${c.estado === "excedido" ? "var(--danger)" : "var(--border-subtle)"}`,
              }}>
                {/* Fila superior: emoji + nombre + monto */}
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center", marginBottom: 6, gap: 8,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                    <span style={{ fontSize: 16 }}>{emoji}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {nombre}
                    </span>
                  </div>

                  {isEditing ? (
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <input
                        type="number"
                        className="sheet-input"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder="€"
                        autoFocus
                        style={{ width: 80, padding: "6px 8px", fontSize: 13, marginBottom: 0 }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit(c.categoria);
                          if (e.key === "Escape") { setEditingCat(null); setEditValue(""); }
                        }}
                      />
                      <button
                        className="edit-icon edit-icon--save"
                        onClick={() => handleSaveEdit(c.categoria)}
                        title="Guardar"
                      >✓</button>
                      <button
                        className="edit-icon edit-icon--cancel"
                        onClick={() => { setEditingCat(null); setEditValue(""); }}
                        title="Cancelar"
                      >✕</button>
                    </div>
                  ) : (
                    <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 6 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", fontFeatureSettings: "'tnum'" }}>
                          {fmt(c.gastado)}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--text-tertiary)", fontFeatureSettings: "'tnum'" }}>
                          {c.presupuestado > 0 ? `de ${fmt(c.presupuestado)}` : "sin presupuesto"}
                        </div>
                      </div>
                      {c.presupuestado > 0 && (
                        <button
                          className="edit-icon"
                          onClick={() => {
                            setEditingCat(c.categoria);
                            setEditValue(String(c.presupuestado));
                          }}
                          title="Editar presupuesto"
                          style={{ marginLeft: 4 }}
                        >✏️</button>
                      )}
                      {c.presupuestado === 0 && c.estado === "sin_presupuesto" && (
                        <button
                          className="edit-icon"
                          onClick={() => {
                            setEditingCat(c.categoria);
                            setEditValue("");
                          }}
                          title="Añadir presupuesto"
                          style={{ marginLeft: 4, fontSize: 14 }}
                        >＋</button>
                      )}
                    </div>
                  )}
                </div>

                {/* Barra de progreso */}
                {c.presupuestado > 0 && (
                  <>
                    <div className="progress" style={{ height: 5 }}>
                      <div
                        className="progress__fill"
                        style={{
                          width: `${Math.min(100, pct)}%`,
                          background: color,
                        }}
                      />
                    </div>
                    <div style={{
                      marginTop: 4, fontSize: 11, color, fontWeight: 600,
                      display: "flex", justifyContent: "space-between",
                    }}>
                      <span>{pct.toFixed(0)}%</span>
                      <span>
                        {c.restante >= 0
                          ? `Quedan ${fmt(c.restante)}`
                          : `Excedido ${fmt(Math.abs(c.restante))}`}
                      </span>
                    </div>
                  </>
                )}

                {/* Si hay gasto pero no presupuesto */}
                {c.estado === "sin_presupuesto" && (
                  <div style={{
                    fontSize: 11, color: "var(--text-tertiary)",
                    fontStyle: "italic",
                  }}>
                    Sin presupuesto asignado
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Añadir nueva categoría al presupuesto */}
      {showAdd ? (
        <div style={{
          marginTop: 12, padding: 12,
          background: "var(--bg-surface)",
          borderRadius: "var(--radius-sm)",
          border: "1.5px solid var(--accent)",
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
            Nuevo presupuesto
          </div>
          <select
            className="sheet-input"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
          >
            <option value="">— Categoría —</option>
            {disponibles.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            className="sheet-input"
            type="number"
            placeholder="Monto mensual €"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
          />
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="btn-primary btn-primary--accent"
              onClick={handleAddNew}
              style={{ flex: 1 }}
              disabled={!newCat || !newAmount}
            >
              Guardar
            </button>
            <button
              className="btn-secondary"
              onClick={() => { setShowAdd(false); setNewCat(""); setNewAmount(""); }}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
          {disponibles.length > 0 && (
            <button
              className="btn-secondary"
              onClick={() => setShowAdd(true)}
              style={{ flex: 1, minWidth: 120 }}
            >
              + Añadir categoría
            </button>
          )}
          {sinPresupuesto && getPrevCycle && getPrevCycle(cycleMK) && (
            <button
              className="btn-secondary"
              onClick={handleCopyPrev}
              style={{ flex: 1, minWidth: 140 }}
              title="Copia los presupuestos del ciclo anterior"
            >
              📋 Copiar ciclo anterior
            </button>
          )}
        </div>
      )}
    </div>
  );
}
