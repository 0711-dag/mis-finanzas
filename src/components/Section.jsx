export default function Section({ title, onAdd, children }) {
  return (
    <section className="section-card">
      <div className="section-header">
        <h2 className="section-title">{title}</h2>
        <button className="btn-add" onClick={onAdd}>+ Añadir</button>
      </div>
      {children}
    </section>
  );
}
