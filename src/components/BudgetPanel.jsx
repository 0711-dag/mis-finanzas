// ══════════════════════════════════════════════
// 📊 Panel de Presupuesto (v2)
//
// Recibe:
//   - allCategoryItems: array de {id, label, emoji, nombre, ...}
//     (devuelto por useCategories en v2). Si llega, el selector usa IDs.
//   - categories: data.categories (para pasar al cálculo)
//
// Llama a addOrUpdateBudget / removeBudget con opts.categoryId=true
// siempre que se trabaje con IDs de v2.
// ══════════════════════════════════════════════
import { useState } from "react";
import { fmt } from "../utils/format.js";
import { calcBudgetUsage } from "../utils/finance.js";

export default function BudgetPanel({
  budgets,
  variableExpenses,
  cycleMK,
  addOrUpdateBudget,
  removeBudget,
  copyBudgetsFromPrevCycle,
  getPrevCycle,
  allCategoryItems,       // 🆕 v2: array de objetos [{id, label, ...}]
  categories,             // 🆕 v2: data.categories (para el cálculo)
}) {
  const [editingKey, setEditingKey] = useState(null); // _key de la categoría editando
  const [editValue, setEditValue] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newCatId, setNewCatId] = useState("");
  const [newAmount, setNewAmount] = useState("");

  const itemsSource = Array.isArray(allCategoryItems) && allCategoryItems.length > 0
    ? allCategoryItems
    : [];

  const usage = calcBudgetUsage(budgets, variableExpenses, cycleMK, categories || []);
  const { categorias, totalPresupuestado, totalGastado, totalRestante } = usage;

  const pctTotal = totalPresupuestado > 0 ? (totalGastado / totalPresupuestado) * 100 : 0;

  // Categorías con presupuesto ya definido (para excluirlas del select "añadir")
  const yaPresupuestadas = new Set(
    categorias.filter((c) => c.presupuestado > 0).map((c) => c._key)
  );
  const disponibles = itemsSource.filter((c) => !yaPresupuestadas.has(c.id));

  const handleSaveEdit = (row) => {
    const monto = parseFloat(editValue) || 0;
    // Clave: si tiene categoryId, borramos/editamos por ID; si no, por string legacy.
    if (row.categoryId) {
      if (monto <= 0) removeBudget(cycleMK, row.categoryId, { categoryId: true });
      else addOrUpdateBudget(cycleMK, row.categoryId, monto, { categoryId: true });
    } else {
      // Fila legacy (sin ID resuelto) — seguimos por string
      if (monto <= 0) removeBudget(cycleMK, row._key);
      else addOrUpdateBudget(cycleMK, row._key, monto);
    }
    setEditingKey(null);
    setEditValue("");
  };

  const handleAddNew = () => {
    if (!newCatId || !newAmount) return;
    const ok = addOrUpdateBudget(cycleMK, newCatId, parseFloat(newAmount) || 0, { categoryId: true });
    if (ok) {
      setShowAdd(false);
      setNewCatId("");
      setNewAmount("");
    }
  };

  const handleCopyPrev = () => {
    const prev = getPrevCycle?.(cycleMK);
    if (prev) copyBudgetsFromPrevCycle(cycleMK, prev);
  };

  const stateColor = (estado) => {
    if (estado === "excedido") return "var(--danger)";
    if (estado === "alerta") return "var(--warning)";
    if (estado === "sin_presupuesto") return "var(--text-tertiary)";
    return "var(--success)";
  };

  const sinPresupuesto = categorias.filter((c) => c.presupuestado > 0).length === 0;

  return (
    <div style={{
      background: "var(--bg-subtle)",
      borderRadius: "var(--radius-md)",
      padding: 14, marginBottom: 10,
      border: "1px solid var(--border-subtle)",
    }}>
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
            {totalRestante >= 0 ? `Te quedan ${fmt(totalRestante)}` : `Excedido en ${fmt(Math.abs(totalRestante))}`}
          </div>
        </div>
      )}

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
            const isEditing = editingKey === c._key;
            const pct = c.presupuestado > 0 ? (c.gastado / c.presupuestado) * 100 : 0;

            return (
              <div key={c._key || c.categoria} style={{
                background: "var(--bg-surface)",
                borderRadius: "var(--radius-sm)",
                padding: 10,
                border: `1px solid ${c.estado === "excedido" ? "var(--danger)" : "var(--border-subtle)"}`,
              }}>
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
                          if (e.key === "Enter") handleSaveEdit(c);
                          if (e.key === "Escape") { setEditingKey(null); setEditValue(""); }
                        }}
                      />
                      <button
                        className="edit-icon edit-icon--save"
                        onClick={() => handleSaveEdit(c)}
                        title="Guardar"
                      >✓</button>
                      <button
                        className="edit-icon edit-icon--cancel"
                        onClick={() => { setEditingKey(null); setEditValue(""); }}
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
                            setEditingKey(c._key);
                            setEditValue(String(c.presupuestado));
                          }}
                          title="Editar presupuesto"
                          style={{ marginLeft: 4 }}
                        >✏️</button>
                      )}
                      {c.presupuestado === 0 && c.estado === "sin_presupuesto" && c._key !== "__sin__" && (
                        <button
                          className="edit-icon"
                          onClick={() => {
                            setEditingKey(c._key);
                            setEditValue("");
                          }}
                          title="Añadir presupuesto"
                          style={{ marginLeft: 4, fontSize: 14 }}
                        >＋</button>
                      )}
                    </div>
                  )}
                </div>

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
                        {c.restante >= 0 ? `Quedan ${fmt(c.restante)}` : `Excedido ${fmt(Math.abs(c.restante))}`}
                      </span>
                    </div>
                  </>
                )}

                {c.estado === "sin_presupuesto" && (
                  <div style={{
                    fontSize: 11, color: "var(--text-tertiary)",
                    fontStyle: "italic",
                  }}>
                    {c._key === "__sin__" ? "Gastos sin categoría asignada" : "Sin presupuesto asignado"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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
            value={newCatId}
            onChange={(e) => setNewCatId(e.target.value)}
          >
            <option value="">— Categoría —</option>
            {disponibles.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
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
              disabled={!newCatId || !newAmount}
            >
              Guardar
            </button>
            <button
              className="btn-secondary"
              onClick={() => { setShowAdd(false); setNewCatId(""); setNewAmount(""); }}
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
