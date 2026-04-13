import { useState, useEffect } from "react";

export default function ActionButtons({
  section,
  id,
  item,
  isEditing,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Auto-cancel confirm after 3s
  useEffect(() => {
    if (!confirmingDelete) return;
    const t = setTimeout(() => setConfirmingDelete(false), 3000);
    return () => clearTimeout(t);
  }, [confirmingDelete]);

  if (isEditing) {
    return (
      <div style={{ display: "flex", gap: 3 }}>
        <button className="btn-save-row" onClick={onSaveEdit} title="Guardar">✓</button>
        <button className="btn-cancel-row" onClick={onCancelEdit} title="Cancelar">✕</button>
      </div>
    );
  }

  const handleDelete = () => {
    if (confirmingDelete) {
      onDelete(section, id);
      setConfirmingDelete(false);
    } else {
      setConfirmingDelete(true);
    }
  };

  return (
    <div style={{ display: "flex", gap: 3 }}>
      <button
        className="btn-edit-row"
        onClick={() => onStartEdit(section, item)}
        title="Modificar"
      >
        ✏️
      </button>
      <button
        className={`btn-delete ${confirmingDelete ? "btn-delete--active" : ""}`}
        onClick={handleDelete}
        title={confirmingDelete ? "Pulsa otra vez para confirmar" : "Eliminar"}
      >
        {confirmingDelete ? "¿Seguro?" : "✕"}
      </button>
    </div>
  );
}
