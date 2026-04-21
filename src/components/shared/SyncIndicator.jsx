// ══════════════════════════════════════════════
// ☁️ Indicador de sincronización (minimalista)
// ──────────────────────────────────────────────
// Dos variantes:
//   - default: usado en la sidebar de escritorio. Botón ancho con
//     dot + texto + tooltip de "última sincronización".
//   - compact: usado en el header móvil. Sólo el dot, accesible vía
//     `title` y `aria-label`. Ocupa muy poco para no robar espacio.
//
// Los estilos compactos se inyectan en <head> la primera vez que se
// monta el componente, para no tocar global.css.
// ══════════════════════════════════════════════
import { useEffect, useState } from "react";

const STYLES_ID = "sync-indicator-compact-styles";
const STYLES = `
/* Versión compacta del dot, usada en headers donde no hay espacio
   para el botón completo. Hereda los colores de .sync-dot--{variant}
   ya definidos en global.css. */
.sync-dot-compact {
  display: inline-block;
  flex-shrink: 0;
  /* Pequeño "halo" para que el dot no se pierda contra el fondo. */
  outline: 3px solid var(--bg-elevated);
  outline-offset: 0;
  /* Garantiza tamaño consistente aunque cambie el contexto. */
  width: 10px;
  height: 10px;
}
`;

function injectStylesOnce() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLES_ID)) return;
  const style = document.createElement("style");
  style.id = STYLES_ID;
  style.textContent = STYLES;
  document.head.appendChild(style);
}

export default function SyncIndicator({ syncing, online, lastSyncTime, compact = false }) {
  const [showTooltip, setShowTooltip] = useState(false);
  useEffect(() => { injectStylesOnce(); }, []);

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

  // ── Variante compacta para móvil ─────────────────────────────────
  if (compact) {
    const tooltipText = lastSyncTime && !syncing
      ? `${label} · Última: ${formatFull(lastSyncTime)}`
      : label;
    return (
      <span
        className={`sync-dot-compact ${dotClass}`}
        title={tooltipText}
        aria-label={tooltipText}
        role="status"
      />
    );
  }

  // ── Variante completa para sidebar de escritorio ─────────────────
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
