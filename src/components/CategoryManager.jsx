// ══════════════════════════════════════════════
// 🏷️ CategoryManager v2
//
// Una sola lista editable de categorías:
//  - Defaults: se pueden editar (emoji, nombre, tipoGasto) pero NO borrar.
//  - Custom:  se pueden editar y borrar.
//
// Al borrar una custom se ofrece REASIGNAR los gastos/budgets que la
// usaban a otra categoría, o dejarlos "sin categoría".
// ══════════════════════════════════════════════
import { useState } from "react";
import useCategories from "../hooks/useCategories.js";

const EMOJI_SUGERIDOS = [
  "🎨", "🎵", "🎮", "📚", "✈️", "🏋️", "💊", "🐶",
  "🎂", "☕", "🍺", "🌱", "🎁", "💼", "🔧", "💄",
  "📱", "💻", "🚿", "🧴", "🎯", "⭐", "❤️", "🔥",
];

const TIPO_GASTO_OPCIONES = [
  { value: "",             label: "Auto",         hint: "Inferir por contexto" },
  { value: "CF",           label: "CF",           hint: "Costo fijo" },
  { value: "CV",           label: "CV",           hint: "Costo variable" },
  { value: "Discrecional", label: "Discrec.",     hint: "Opcional, reducible" },
];

export default function CategoryManager({
  data,              // objeto data completo — para leer categories, gastos y budgets
  onAdd,             // (cat) => boolean
  onUpdate,          // (id, fields) => boolean
  onDelete,          // (id, reassignToId) => void
  onClose,           // () => void
  title,
}) {
  const { items: allItems, findById } = useCategories("any", data?.categories, data?.customCategories);

  // Estado form alta
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNombre, setNewNombre] = useState("");
  const [newEmoji, setNewEmoji] = useState("📦");
  const [newTipoGasto, setNewTipoGasto] = useState("");

  // Estado edición
  const [editingId, setEditingId] = useState(null);
  const [editNombre, setEditNombre] = useState("");
  const [editEmoji, setEditEmoji] = useState("");
  const [editTipoGasto, setEditTipoGasto] = useState("");

  // Estado borrado con reasignación
  const [deletingId, setDeletingId] = useState(null);
  const [reassignToId, setReassignToId] = useState("");

  const resetAddForm = () => {
    setShowAddForm(false);
    setNewNombre("");
    setNewEmoji("📦");
    setNewTipoGasto("");
  };

  const handleAdd = () => {
    const ok = onAdd({
      nombre: newNombre,
      emoji: newEmoji,
      tipoGasto: newTipoGasto,
    });
    if (ok) resetAddForm();
  };

  const handleStartEdit = (cat) => {
    setEditingId(cat.id);
    setEditNombre(cat.nombre);
    setEditEmoji(cat.emoji || "📦");
    setEditTipoGasto(cat.tipoGasto || "");
    setDeletingId(null);
  };

  const handleSaveEdit = () => {
    const ok = onUpdate(editingId, {
      nombre: editNombre,
      emoji: editEmoji,
      tipoGasto: editTipoGasto,
    });
    if (ok) {
      setEditingId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleStartDelete = (cat) => {
    setDeletingId(cat.id);
    setReassignToId("");
  };

  const handleConfirmDelete = () => {
    onDelete(deletingId, reassignToId);
    setDeletingId(null);
    setReassignToId("");
  };

  // Contar gastos afectados por un id (para mostrar warning al borrar)
  const countAffected = (id) => {
    if (!id || !data) return 0;
    const f = (data.fixedExpenses || []).filter((x) => x.categoryId === id).length;
    const v = (data.variableExpenses || []).filter((x) => x.categoryId === id).length;
    const b = (data.budgets || []).filter((x) => x.categoryId === id).length;
    return f + v + b;
  };

  // Lista de categorías donde se puede reasignar (todas menos la que se borra)
  const reassignOptions = allItems.filter((c) => c.id !== deletingId);

  const tituloFinal = title || "Mis categorías";

  // Subcomponente selector CF/CV/Discrecional
  const TipoGastoSelector = ({ value, onChange }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{
        fontSize: 10, color: "var(--text-tertiary)", fontWeight: 600,
        textTransform: "uppercase", letterSpacing: 0.5,
      }}>
        Clasificación contable
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 4,
      }}>
        {TIPO_GASTO_OPCIONES.map((opt) => {
          const activo = value === opt.value;
          return (
            <button
              key={opt.value || "auto"}
              type="button"
              onClick={() => onChange(opt.value)}
              title={opt.hint}
              style={{
                padding: "8px 4px",
                borderRadius: "var(--radius-sm)",
                background: activo ? "var(--accent)" : "var(--bg-surface)",
                color: activo ? "white" : "var(--text-primary)",
                border: `1px solid ${activo ? "var(--accent)" : "var(--border-subtle)"}`,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div className="modal__title">🏷️ {tituloFinal}</div>
          <button className="modal__close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <div className="modal__body">
          <div style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            marginBottom: 14,
            lineHeight: 1.5,
          }}>
            Edita cualquier categoría: puedes cambiar su emoji, nombre y clasificación contable. Las categorías por defecto (🔒) no se pueden eliminar, pero sí personalizar. Los gastos guardados conservan la categoría aunque la renombres.
          </div>

          {/* Botón añadir */}
          {!showAddForm && (
            <button
              className="btn-primary btn-primary--accent"
              onClick={() => setShowAddForm(true)}
              style={{ width: "100%", marginBottom: 14 }}
            >
              + Añadir categoría
            </button>
          )}

          {/* Formulario alta */}
          {showAddForm && (
            <div style={{
              background: "var(--bg-subtle)",
              borderRadius: "var(--radius-md)",
              padding: 14,
              marginBottom: 14,
              border: "1.5px solid var(--accent)",
              display: "flex", flexDirection: "column", gap: 10,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>Nueva categoría</div>

              <div style={{
                padding: "10px 12px",
                background: "var(--bg-surface)",
                borderRadius: "var(--radius-sm)",
                fontSize: 14,
                fontWeight: 600,
                textAlign: "center",
                border: "1px solid var(--border-subtle)",
              }}>
                {newEmoji} {newNombre || "Nombre de la categoría"}
              </div>

              <input
                className="sheet-input"
                placeholder="Nombre (ej: Hobbies, Mascotas...)"
                value={newNombre}
                onChange={(e) => setNewNombre(e.target.value)}
                maxLength={25}
                autoFocus
              />

              <input
                className="sheet-input"
                placeholder="Emoji"
                value={newEmoji}
                onChange={(e) => setNewEmoji(e.target.value.slice(0, 4))}
                maxLength={4}
                style={{ fontSize: 18, textAlign: "center" }}
              />

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(8, 1fr)",
                gap: 4,
              }}>
                {EMOJI_SUGERIDOS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setNewEmoji(e)}
                    style={{
                      fontSize: 18, padding: "6px 0",
                      borderRadius: "var(--radius-sm)",
                      background: newEmoji === e ? "var(--accent)" : "var(--bg-surface)",
                      border: "1px solid var(--border-subtle)",
                      cursor: "pointer",
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>

              <TipoGastoSelector value={newTipoGasto} onChange={setNewTipoGasto} />

              <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                <button
                  className="btn-primary btn-primary--accent"
                  onClick={handleAdd}
                  style={{ flex: 1 }}
                  disabled={!newNombre.trim()}
                >
                  Crear
                </button>
                <button className="btn-secondary" onClick={resetAddForm}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Lista única: defaults primero (por orden), custom después */}
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: 0.06,
            marginBottom: 6,
          }}>
            Todas las categorías ({allItems.length})
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 }}>
            {allItems.map((cat) => {
              const isEditing = editingId === cat.id;
              const isDeleting = deletingId === cat.id;
              const isDefault = cat.kind === "default";

              // ─── Modo edición ───
              if (isEditing) {
                return (
                  <div
                    key={cat.id}
                    style={{
                      padding: 12,
                      background: "var(--bg-subtle)",
                      borderRadius: "var(--radius-sm)",
                      border: "1.5px solid var(--accent)",
                      display: "flex", flexDirection: "column", gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        className="sheet-input"
                        value={editEmoji}
                        onChange={(e) => setEditEmoji(e.target.value.slice(0, 4))}
                        maxLength={4}
                        style={{ width: 60, textAlign: "center", fontSize: 18 }}
                      />
                      <input
                        className="sheet-input"
                        value={editNombre}
                        onChange={(e) => setEditNombre(e.target.value)}
                        maxLength={25}
                        style={{ flex: 1 }}
                        autoFocus
                      />
                    </div>

                    <TipoGastoSelector value={editTipoGasto} onChange={setEditTipoGasto} />

                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className="btn-primary btn-primary--accent"
                        onClick={handleSaveEdit}
                        style={{ flex: 1 }}
                        disabled={!editNombre.trim()}
                      >
                        Guardar
                      </button>
                      <button className="btn-secondary" onClick={handleCancelEdit}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                );
              }

              // ─── Modo confirmación de borrado con reasignación ───
              if (isDeleting) {
                const affected = countAffected(deletingId);
                return (
                  <div
                    key={cat.id}
                    style={{
                      padding: 12,
                      background: "var(--danger-bg)",
                      borderRadius: "var(--radius-sm)",
                      border: "1.5px solid var(--danger)",
                      display: "flex", flexDirection: "column", gap: 8,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--danger-text)" }}>
                      ¿Eliminar "{cat.emoji} {cat.nombre}"?
                    </div>
                    {affected > 0 ? (
                      <>
                        <div style={{ fontSize: 12, color: "var(--danger-text)", lineHeight: 1.5 }}>
                          Hay {affected} {affected === 1 ? "registro" : "registros"} usando esta categoría. ¿Reasignarlos a otra categoría?
                        </div>
                        <select
                          className="sheet-input"
                          value={reassignToId}
                          onChange={(e) => setReassignToId(e.target.value)}
                        >
                          <option value="">— Dejar sin categoría —</option>
                          {reassignOptions.map((c) => (
                            <option key={c.id} value={c.id}>{c.label}</option>
                          ))}
                        </select>
                      </>
                    ) : (
                      <div style={{ fontSize: 12, color: "var(--danger-text)" }}>
                        Ningún gasto ni presupuesto usa esta categoría.
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className="btn-danger"
                        onClick={handleConfirmDelete}
                        style={{ flex: 1 }}
                      >
                        Eliminar
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => { setDeletingId(null); setReassignToId(""); }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                );
              }

              // ─── Modo normal ───
              return (
                <div
                  key={cat.id}
                  style={{
                    padding: "10px 12px",
                    background: "var(--bg-surface)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-subtle)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{
                    fontSize: 13,
                    color: "var(--text-primary)",
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    minWidth: 0, flex: 1,
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <span>{cat.emoji} {cat.nombre}</span>
                    {cat.tipoGasto && (
                      <span style={{
                        fontSize: 9, fontWeight: 700,
                        padding: "2px 6px", borderRadius: 4,
                        background: "var(--bg-subtle)",
                        color: "var(--text-tertiary)",
                        letterSpacing: 0.4, textTransform: "uppercase",
                        flexShrink: 0,
                      }}>
                        {cat.tipoGasto}
                      </span>
                    )}
                    {isDefault && (
                      <span
                        title="Categoría por defecto (no se puede eliminar)"
                        style={{
                          fontSize: 10, color: "var(--text-tertiary)",
                          flexShrink: 0,
                        }}
                      >
                        🔒
                      </span>
                    )}
                  </span>

                  <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                    <button
                      className="edit-icon"
                      onClick={() => handleStartEdit(cat)}
                      title="Editar"
                    >
                      ✏️
                    </button>
                    {!isDefault && (
                      <button
                        className="edit-icon edit-icon--delete"
                        onClick={() => handleStartDelete(cat)}
                        title="Eliminar"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            lineHeight: 1.5,
            padding: "8px 10px",
            background: "var(--bg-subtle)",
            borderRadius: "var(--radius-sm)",
          }}>
            💡 Al renombrar una categoría, los gastos anteriores siguen vinculados por su ID interno, así que se actualizan automáticamente al nuevo nombre en informes y listas.
          </div>
        </div>
      </div>
    </div>
  );
}
