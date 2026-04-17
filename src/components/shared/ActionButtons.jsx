import { useState, useEffect } from "react";

export default function ActionButtons({
  section, id, item, isEditing,
  onStartEdit, onSaveEdit, onCancelEdit, onDelete,
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!confirmingDelete) return;
    const t = setTimeout(() => setConfirmingDelete(false), 3000);
    return () => clearTimeout(t);
  }, [confirmingDelete]);

  if (isEditing) {
    return (
      <div style={{ display: "flex", gap: 3 }}>
        <button className="edit-icon edit-icon--save" onClick={onSaveEdit} title="Guardar">✓</button>
        <button className="edit-icon edit-icon--cancel" onClick={onCancelEdit} title="Cancelar">✕</button>
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
        className="edit-icon"
        onClick={() => onStartEdit(section, item)}
        title="Modificar"
      >✏️</button>
      <button
        className={confirmingDelete ? "edit-icon edit-icon--confirm" : "edit-icon edit-icon--delete"}
        onClick={handleDelete}
        title={confirmingDelete ? "Pulsa otra vez para confirmar" : "Eliminar"}
      >
        {confirmingDelete ? "¿?" : "✕"}
      </button>
    </div>
  );
}
