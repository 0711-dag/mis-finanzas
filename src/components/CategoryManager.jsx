// ══════════════════════════════════════════════
// 🏷️ CategoryManager
// Modal para gestionar categorías custom.
// 🆕 Las categorías son GLOBALES: una sola lista unificada de defaults,
// y al crear/editar una custom el usuario elige su clasificación
// contable (CF / CV / Discrecional) que alimenta el panel financiero.
// ══════════════════════════════════════════════
import { useState } from "react";
import { DEFAULT_CATEGORIES } from "../utils/categoryDefaults.js";

// Sugerencias de emojis rápidos para el picker simplificado
const EMOJI_SUGERIDOS = [
  "🎨", "🎵", "🎮", "📚", "✈️", "🏋️", "💊", "🐶",
  "🎂", "☕", "🍺", "🌱", "🎁", "💼", "🔧", "💄",
  "📱", "💻", "🚿", "🧴", "🎯", "⭐", "❤️", "🔥",
];

// 🆕 Opciones de tipo de gasto que el usuario puede asignar a su categoría.
// "" significa "auto" → se infiere por nombre o fallback por origen.
const TIPO_GASTO_OPCIONES = [
  { value: "",             label: "Auto",         hint: "Inferir por contexto" },
  { value: "CF",           label: "CF",           hint: "Costo fijo" },
  { value: "CV",           label: "CV",           hint: "Costo variable" },
  { value: "Discrecional", label: "Discrecional", hint: "Opcional, reducible" },
];

export default function CategoryManager({
  tipo,             // compatibilidad: "fixed" | "variable" — ahora ignorado al crear
  customCategories, // array completo de data.customCategories
  onAdd,            // (cat) => boolean
  onUpdate,         // (id, fields) => boolean
  onDelete,         // (id) => void
  onClose,          // () => void
  title,            // texto del header, opcional
}) {
  // Todas las custom son globales: no filtramos por tipo
  const todasCustom = customCategories || [];

  // Estado del formulario de alta
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNombre, setNewNombre] = useState("");
  const [newEmoji, setNewEmoji] = useState("📦");
  const [newTipoGasto, setNewTipoGasto] = useState(""); // "" = auto

  // Estado de edición
  const [editingId, setEditingId] = useState(null);
  const [editNombre, setEditNombre] = useState("");
  const [editEmoji, setEditEmoji] = useState("");
  const [editTipoGasto, setEditTipoGasto] = useState(""); // "" = auto

  // Estado de confirmación de borrado
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const resetAddForm = () => {
    setShowAddForm(false);
    setNewNombre("");
    setNewEmoji("📦");
    setNewTipoGasto("");
  };

  const handleAdd = () => {
    // 🆕 Se guarda con tipo "any" (global). Si el padre aún pasa "fixed"/"variable"
    // se respeta por compatibilidad, pero el default es "any".
    const tipoFinal = tipo || "any";
    const ok = onAdd({
      tipo: tipoFinal,
      nombre: newNombre,
      emoji: newEmoji,
      tipoGasto: newTipoGasto, // "" si quiere inferencia automática
    });
    if (ok) resetAddForm();
  };

  const handleStartEdit = (cat) => {
    setEditingId(cat.id);
    setEditNombre(cat.nombre);
    setEditEmoji(cat.emoji || "📦");
    setEditTipoGasto(cat.tipoGasto || "");
    setConfirmDeleteId(null);
  };

  const handleSaveEdit = () => {
    const ok = onUpdate(editingId, {
      nombre: editNombre,
      emoji: editEmoji,
      tipoGasto: editTipoGasto,
    });
    if (ok) {
      setEditingId(null);
      setEditNombre("");
      setEditEmoji("");
      setEditTipoGasto("");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditNombre("");
    setEditEmoji("");
    setEditTipoGasto("");
  };

  const handleConfirmDelete = (id) => {
    onDelete(id);
    setConfirmDeleteId(null);
  };

  const tituloFinal = title || "Mis categorías";

  // Selector compacto de tipo de gasto (segmented control pequeño)
  const TipoGastoSelector = ({ value, onChange }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{
        fontSize: 10,
        color: "var(--text-tertiary)",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: 0.5,
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
                transition: "background var(--anim-fast)",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 10, color: "var(--text-tertiary)", lineHeight: 1.4 }}>
        💡 "Auto" deja que la app clasifique según el nombre. Elige CF/CV/Discrecional para forzarlo.
      </div>
    </div>
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal__header">
          <div className="modal__title">🏷️ {tituloFinal}</div>
          <button className="modal__close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        {/* Body */}
        <div className="modal__body">
          {/* Ayuda contextual */}
          <div style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            marginBottom: 14,
            lineHeight: 1.5,
          }}>
            Una misma lista de categorías para todo: gastos fijos, variables, presupuestos e informes. Las categorías por defecto (🔒) no se pueden eliminar; puedes añadir las tuyas con el botón de abajo.
          </div>

          {/* Botón añadir nueva */}
          {!showAddForm && (
            <button
              className="btn-primary btn-primary--accent"
              onClick={() => setShowAddForm(true)}
              style={{ width: "100%", marginBottom: 14 }}
            >
              + Añadir categoría
            </button>
          )}

          {/* Formulario de alta */}
          {showAddForm && (
            <div style={{
              background: "var(--bg-subtle)",
              borderRadius: "var(--radius-md)",
              padding: 14,
              marginBottom: 14,
              border: "1.5px solid var(--accent)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                Nueva categoría
              </div>

              {/* Preview */}
              <div style={{
                padding: "10px 12px",
                background: "var(--bg-surface)",
                borderRadius: "var(--radius-sm)",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-primary)",
                textAlign: "center",
                border: "1px solid var(--border-subtle)",
              }}>
                {newEmoji} {newNombre || "Nombre de la categoría"}
              </div>

              {/* Input nombre */}
              <input
                className="sheet-input"
                placeholder="Nombre (ej: Hobbies, Mascotas...)"
                value={newNombre}
                onChange={(e) => setNewNombre(e.target.value)}
                maxLength={25}
                autoFocus
              />

              {/* Input emoji custom + grid de sugerencias */}
              <input
                className="sheet-input"
                placeholder="Emoji (ej: 🎨)"
                value={newEmoji}
                onChange={(e) => setNewEmoji(e.target.value.slice(0, 4))}
                maxLength={4}
                style={{ fontSize: 18, textAlign: "center" }}
              />

              <div style={{
                fontSize: 10,
                color: "var(--text-tertiary)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}>
                Sugerencias
              </div>

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
                      fontSize: 18,
                      padding: "6px 0",
                      borderRadius: "var(--radius-sm)",
                      background: newEmoji === e ? "var(--accent)" : "var(--bg-surface)",
                      border: "1px solid var(--border-subtle)",
                      cursor: "pointer",
                      transition: "background var(--anim-fast)",
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>

              {/* 🆕 Selector de clasificación contable */}
              <TipoGastoSelector value={newTipoGasto} onChange={setNewTipoGasto} />

              {/* Acciones */}
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

          {/* Lista: custom del usuario (primero, porque son las que más le importan) */}
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: 0.06,
            marginBottom: 6,
          }}>
            Tus categorías ({todasCustom.length})
          </div>

          {todasCustom.length === 0 ? (
            <div style={{
              padding: 20,
              textAlign: "center",
              color: "var(--text-tertiary)",
              fontSize: 12,
              background: "var(--bg-subtle)",
              borderRadius: "var(--radius-sm)",
              marginBottom: 16,
            }}>
              Aún no has creado ninguna categoría personalizada
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 16 }}>
              {todasCustom.map((cat) => {
                const isEditing = editingId === cat.id;
                const isConfirmingDelete = confirmDeleteId === cat.id;
                const emoji = cat.emoji || "📦";
                const tipoGastoActual = cat.tipoGasto || "";

                if (isEditing) {
                  return (
                    <div
                      key={cat.id}
                      style={{
                        padding: 12,
                        background: "var(--bg-subtle)",
                        borderRadius: "var(--radius-sm)",
                        border: "1.5px solid var(--accent)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
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

                      {/* 🆕 Selector de clasificación contable en edición */}
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
                      minWidth: 0,
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}>
                      <span>{emoji} {cat.nombre}</span>
                      {/* 🆕 Chip compacto del tipoGasto actual, si está definido */}
                      {tipoGastoActual && (
                        <span style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: "var(--bg-subtle)",
                          color: "var(--text-tertiary)",
                          letterSpacing: 0.4,
                          textTransform: "uppercase",
                          flexShrink: 0,
                        }}>
                          {tipoGastoActual}
                        </span>
                      )}
                    </span>

                    <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                      {isConfirmingDelete ? (
                        <>
                          <button
                            className="edit-icon edit-icon--confirm"
                            onClick={() => handleConfirmDelete(cat.id)}
                            title="Confirmar borrado"
                          >
                            BORRAR
                          </button>
                          <button
                            className="edit-icon edit-icon--cancel"
                            onClick={() => setConfirmDeleteId(null)}
                            title="Cancelar"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="edit-icon"
                            onClick={() => handleStartEdit(cat)}
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button
                            className="edit-icon edit-icon--delete"
                            onClick={() => setConfirmDeleteId(cat.id)}
                            title="Eliminar"
                          >
                            🗑
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 🆕 Bloque único de defaults (antes eran dos: fijos + variables) */}
          <div style={{ marginBottom: 14 }}>
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: 0.06,
              marginBottom: 6,
            }}>
              Por defecto
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {DEFAULT_CATEGORIES.map((it) => (
                <div
                  key={it}
                  style={{
                    padding: "10px 12px",
                    background: "var(--bg-surface)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-subtle)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 13,
                    color: "var(--text-primary)",
                    fontWeight: 500,
                  }}
                >
                  <span>{it}</span>
                  <span style={{ fontSize: 12, color: "var(--text-tertiary)" }} title="Categoría por defecto">
                    🔒
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Nota al pie */}
          <div style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            marginTop: 6,
            lineHeight: 1.5,
            padding: "8px 10px",
            background: "var(--bg-subtle)",
            borderRadius: "var(--radius-sm)",
          }}>
            💡 Todas las categorías (por defecto y tuyas) están disponibles en gastos fijos, variables, presupuestos e informes.
          </div>
        </div>
      </div>
    </div>
  );
}
