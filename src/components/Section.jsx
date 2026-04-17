export default function Section({ title, icon, onAdd, children, mobileMode }) {
  if (mobileMode) {
    return (
      <div>
        {onAdd && (
          <button
            className="btn-secondary"
            onClick={onAdd}
            style={{ width: "100%", marginBottom: 8 }}
          >
            + Añadir nuevo
          </button>
        )}
        {children}
      </div>
    );
  }
  return (
    <section className="panel">
      <div className="panel__header">
        <h2 className="panel__title">
          {icon && <span>{icon}</span>}
          <span>{title}</span>
        </h2>
        {onAdd && (
          <button className="btn-ghost" onClick={onAdd}>+ Añadir</button>
        )}
      </div>
      <div className="panel__body">{children}</div>
    </section>
  );
}
