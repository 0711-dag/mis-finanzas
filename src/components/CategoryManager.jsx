// ══════════════════════════════════════════════
// 🏷️ CategoryManager
// Modal reutilizable para gestionar categorías custom.
// Soporta ambos tipos ("fixed" | "variable") vía prop `tipo`.
// Las categorías por defecto aparecen bloqueadas con candado (no se borran).
// Las custom se pueden añadir, editar emoji/nombre y eliminar.
// ══════════════════════════════════════════════
import { useState } from "react";
import { getDefaultCategories } from "../utils/categoryDefaults.js";

// Sugerencias de emojis rápidos para el picker simplificado
const EMOJI_SUGERIDOS = [
  "🎨", "🎵", "🎮", "📚", "✈️", "🏋️", "💊", "🐶",
  "🎂", "☕", "🍺", "🌱", "🎁", "💼", "🔧", "💄",
  "📱", "💻", "🚿", "🧴", "🎯", "⭐", "❤️", "🔥",
];

export default function CategoryManager({
  tipo,             // "fixed" | "variable"
  customCategories, // array completo de data.customCategories
  onAdd,            // (cat) => boolean
  onUpdate,         // (id, fields) => boolean
  onDelete,         // (id) => void
  onClose,          // () => void
  title,            // texto del header, opcional
}) {
  const defaults = getDefaultCategories(tipo);
  const customOfType = (customCategories || []).filter((c) => c.tipo === tipo);

  // Estado del formulario de alta
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNombre, setNewNombre] = useState("");
  const [newEmoji, setNewEmoji] = useState("📦");

  // Estado de edición
  const [editingId, setEditingId] = useState(null);
  const [editNombre, setEditNombre] = useState("");
  const [editEmoji, setEditEmoji] = useState("");

  // Estado de confirmación de borrado
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const resetAddForm = () => {
    setShowAddForm(false);
    setNewNombre("");
    setNewEmoji("📦");
  };

  const handleAdd = () => {
    const ok = onAdd({ tipo, nombre: newNombre, emoji: newEmoji });
    if (ok) resetAddForm();
  };

  const handleStartEdit = (cat) => {
    setEditingId(cat.id);
    setEditNombre(cat.nombre);
    setEditEmoji(cat.emoji || "📦");
    setConfirmDeleteId(null);
  };

  const handleSaveEdit = () => {
    const ok = onUpdate(editingId, { nombre: editNombre, emoji: editEmoji });
    if (ok) {
      setEditingId(null);
      setEditNombre("");
      setEditEmoji("");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditNombre("");
    setEditEmoji("");
  };

  const handleConfirmDelete = (id) => {
    onDelete(id);
    setConfirmDeleteId(null);
  };

  const tituloFinal =
    title || (tipo === "fixed" ? "Categorías de gastos fijos" : "Categorías de gastos variables");

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
            Las categorías por defecto (🔒) siempre están disponibles. Puedes añadir las tuyas propias.
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

          {/* Lista: defaults primero (bloqueadas) */}
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: 0.06,
            marginBottom: 6,
          }}>
            Categorías por defecto
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 16 }}>
            {defaults.map((label) => (
              <div
                key={label}
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
                <span>{label}</span>
                <span style={{ fontSize: 12, color: "var(--text-tertiary)" }} title="Categoría por defecto">
                  🔒
                </span>
              </div>
            ))}
          </div>

          {/* Lista: custom del usuario */}
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: 0.06,
            marginBottom: 6,
          }}>
            Tus categorías ({customOfType.length})
          </div>

          {customOfType.length === 0 ? (
            <div style={{
              padding: 20,
              textAlign: "center",
              color: "var(--text-tertiary)",
              fontSize: 12,
              background: "var(--bg-subtle)",
              borderRadius: "var(--radius-sm)",
            }}>
              Aún no has creado ninguna categoría personalizada
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {customOfType.map((cat) => {
                const isEditing = editingId === cat.id;
                const isConfirmingDelete = confirmDeleteId === cat.id;
                const emoji = cat.emoji || "📦";

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
                        gap: 6,
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
                    }}>
                      {emoji} {cat.nombre}
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

          {/* Nota al pie */}
          <div style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            marginTop: 18,
            lineHeight: 1.5,
            padding: "8px 10px",
            background: "var(--bg-subtle)",
            borderRadius: "var(--radius-sm)",
          }}>
            💡 Al eliminar una categoría custom, los gastos que la usaban conservarán el nombre como texto, pero ya no podrás seleccionarla de nuevo.
          </div>
        </div>
      </div>
    </div>
  );
}
