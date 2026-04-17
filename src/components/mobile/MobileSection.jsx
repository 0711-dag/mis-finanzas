export default function MobileSection({ title, action, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="section-header">
        <div className="section-header__title">{title}</div>
        {action}
      </div>
      {children}
    </div>
  );
}
