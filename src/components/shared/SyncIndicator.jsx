// ══════════════════════════════════════════════
// ☁️ Indicador de sincronización (minimalista)
// ══════════════════════════════════════════════
import { useState } from "react";

export default function SyncIndicator({ syncing, online, lastSyncTime }) {
  const [showTooltip, setShowTooltip] = useState(false);

  let dotClass = "sync-dot sync-dot--online";
  let label = "Sincronizado";
  if (syncing) {
    dotClass = "sync-dot sync-dot--saving";
    label = "Guardando…";
  } else if (!online) {
    dotClass = "sync-dot sync-dot--offline";
    label = "Sin conexión";
  }

  const formatFull = (date) => {
    if (!date) return "Sin datos";
    return date.toLocaleString("es-ES", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <button
      className="nav-item"
      onClick={() => setShowTooltip((v) => !v)}
      style={{ position: "relative", width: "100%" }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className={dotClass} />
      <span style={{ fontSize: 12 }}>{label}</span>
      {showTooltip && lastSyncTime && !syncing && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: 12,
          background: "var(--text-primary)", color: "var(--text-inverse)",
          borderRadius: 6, padding: "5px 10px", fontSize: 10,
          whiteSpace: "nowrap", fontWeight: 600,
          animation: "fadeInUp 0.1s ease",
        }}>
          Última: {formatFull(lastSyncTime)}
        </div>
      )}
    </button>
  );
}
