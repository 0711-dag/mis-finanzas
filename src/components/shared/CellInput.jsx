export default function CellInput({ value, onChange, onConfirm, onCancel, field }) {
  const isDateField = ["proxFecha", "dayPago", "fecha", "fechaInicio"].includes(field);
  return (
    <input
      autoFocus
      type={isDateField ? "date" : "text"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onConfirm}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); onConfirm(); }
        if (e.key === "Escape") onCancel();
      }}
      className="inline-input"
    />
  );
}
