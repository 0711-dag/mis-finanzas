// ══════════════════════════════════════════════
// 🍞 ValidationToast — toast inferior centrado
// ──────────────────────────────────────────────
// Soporta tres variantes mediante el prop `kind`:
//   - "error"   (por defecto): fondo oscuro, ⚠️
//   - "success": fondo verde, ✓
//   - "info":    fondo neutro, ℹ️
//
// Es retrocompatible: si no se pasa `kind`, se comporta exactamente
// como antes (toast de error).
//
// Los estilos extra para las nuevas variantes se inyectan en <head>
// la primera vez que se monta el componente, para no tocar global.css.
// ══════════════════════════════════════════════
import { useEffect } from "react";

const STYLES_ID = "validation-toast-extra-styles";
const STYLES = `
/* Variantes de la Entrega 2. La clase base .toast vive en global.css. */
.toast.toast--success {
  background: var(--success);
  color: white;
}
.toast.toast--info {
  background: var(--info);
  color: white;
}
[data-theme="dark"] .toast.toast--success {
  background: var(--success);
  color: var(--bg-page);
}
[data-theme="dark"] .toast.toast--info {
  background: var(--info);
  color: var(--bg-page);
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

const KIND_CONFIG = {
  error:   { className: "toast",                 icon: "⚠️" },
  success: { className: "toast toast--success",  icon: "✓"  },
  info:    { className: "toast toast--info",     icon: "ℹ️" },
};

export default function ValidationToast({ message, kind = "error" }) {
  useEffect(() => { injectStylesOnce(); }, []);

  if (!message) return null;
  const cfg = KIND_CONFIG[kind] || KIND_CONFIG.error;
  return (
    <div className={cfg.className} role="status" aria-live="polite">
      {cfg.icon} {message}
    </div>
  );
}
