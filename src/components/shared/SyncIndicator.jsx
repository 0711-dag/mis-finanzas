import { useState } from "react";

export default function SyncIndicator({ syncing, online, lastSyncTime }) {
  const [showTooltip, setShowTooltip] = useState(false);

  const formatFull = (date) => {
    if (!date) return "Sin datos";
    return date.toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  let statusClass = "sync-indicator--online";
  let label = "Sincronizado";
  if (syncing) {
    statusClass = "sync-indicator--saving";
    label = "Guardando…";
  } else if (!online) {
    statusClass = "sync-indicator--offline";
    label = "Sin conexión";
  }

  return (
    <div
      className={`sync-indicator ${statusClass}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={() => setShowTooltip((v) => !v)}
    >
      <span className="sync-indicator__dot" />
      <span className="sync-indicator__label">{label}</span>

      {showTooltip && lastSyncTime && !syncing && (
        <div className="sync-indicator__tooltip">
          <span className="sync-indicator__tooltip-title">Última sincronización</span>
          <span className="sync-indicator__tooltip-time">{formatFull(lastSyncTime)}</span>
        </div>
      )}
    </div>
  );
}
