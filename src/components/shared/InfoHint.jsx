// ══════════════════════════════════════════════
// ⓘ InfoHint — icono de ayuda con explicación
// · Desktop: tooltip al pasar el ratón
// · Móvil: popover al hacer click (se cierra al clicar fuera)
//
// Los estilos viven dentro del propio archivo para no tocar
// global.css ni añadir dependencias. Se inyectan una sola vez.
// ══════════════════════════════════════════════
import { useState, useRef, useEffect } from "react";

// CSS auto-contenido. Se inyecta sólo una vez en <head>.
const STYLES_ID = "info-hint-styles";
const STYLES = `
.info-hint {
  position: relative;
  display: inline-flex;
  align-items: center;
  line-height: 1;
}
.info-hint__trigger {
  background: transparent;
  border: none;
  padding: 2px;
  margin: 0;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-tertiary);
  opacity: 0.7;
  transition: opacity 0.15s ease, color 0.15s ease;
  line-height: 1;
}
.info-hint__trigger:hover,
.info-hint__trigger:focus {
  opacity: 1;
  color: var(--text-secondary);
  outline: none;
}
/* Tooltip (desktop, hover) */
.info-hint__tooltip {
  position: absolute;
  bottom: calc(100% + 6px);
  right: 0;
  width: 240px;
  max-width: 80vw;
  padding: 10px 12px;
  background: var(--bg-elevated, var(--bg-surface));
  color: var(--text-primary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  font-size: 12px;
  line-height: 1.4;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.15s ease, visibility 0.15s ease;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
  white-space: normal;
  font-weight: 400;
  letter-spacing: 0;
  text-transform: none;
}
.info-hint--left .info-hint__tooltip { right: auto; left: 0; }
.info-hint__tooltip-title {
  font-weight: 700;
  font-size: 12px;
  color: var(--text-primary);
}
.info-hint__tooltip-desc {
  color: var(--text-secondary);
  font-size: 11px;
}
.info-hint__tooltip-formula {
  font-size: 11px;
  color: var(--text-tertiary);
  padding-top: 4px;
  border-top: 1px dashed var(--border-subtle);
  font-family: ui-monospace, Menlo, monospace;
}
/* Desktop: tooltip al hover (sólo en dispositivos con puntero fino) */
@media (hover: hover) and (pointer: fine) {
  .info-hint:hover .info-hint__tooltip,
  .info-hint:focus-within .info-hint__tooltip {
    opacity: 1;
    visibility: visible;
  }
}
/* Móvil: popover al click (controlado por estado) */
.info-hint__popover {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: 240px;
  max-width: 80vw;
  padding: 12px 14px;
  background: var(--bg-elevated, var(--bg-surface));
  color: var(--text-primary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.24);
  font-size: 12px;
  line-height: 1.45;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
  font-weight: 400;
  letter-spacing: 0;
  text-transform: none;
  animation: info-hint-fade 0.12s ease-out;
}
.info-hint--left .info-hint__popover { right: auto; left: 0; }
.info-hint__popover-title {
  font-weight: 700;
  font-size: 13px;
  color: var(--text-primary);
}
.info-hint__popover-desc {
  color: var(--text-secondary);
  font-size: 12px;
}
.info-hint__popover-formula {
  font-size: 11px;
  color: var(--text-tertiary);
  padding-top: 6px;
  border-top: 1px dashed var(--border-subtle);
  font-family: ui-monospace, Menlo, monospace;
}
@keyframes info-hint-fade {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

// Inyecta estilos una sola vez al cargar el módulo (no por instancia).
function ensureStylesInjected() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLES_ID)) return;
  const tag = document.createElement("style");
  tag.id = STYLES_ID;
  tag.textContent = STYLES;
  document.head.appendChild(tag);
}

export default function InfoHint({ title, description, formula, align = "right" }) {
  // Inyección perezosa — sólo la primera vez que se usa el componente.
  ensureStylesInjected();

  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Cierra el popover al clicar fuera (modo móvil)
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const handleClick = (e) => {
    e.stopPropagation();
    setOpen((v) => !v);
  };

  return (
    <span
      ref={ref}
      className={`info-hint info-hint--${align}`}
      onClick={handleClick}
    >
      <button
        type="button"
        className="info-hint__trigger"
        aria-label={`Información sobre ${title}`}
        aria-expanded={open}
      >
        ⓘ
      </button>

      {/* Tooltip (desktop, aparece al hacer hover). Se controla por CSS. */}
      <span className="info-hint__tooltip" role="tooltip">
        <span className="info-hint__tooltip-title">{title}</span>
        <span className="info-hint__tooltip-desc">{description}</span>
        {formula && (
          <span className="info-hint__tooltip-formula">
            <strong>Cálculo:</strong> {formula}
          </span>
        )}
      </span>

      {/* Popover (móvil, aparece al hacer click). Se controla por estado. */}
      {open && (
        <span className="info-hint__popover" role="dialog" onClick={(e) => e.stopPropagation()}>
          <span className="info-hint__popover-title">{title}</span>
          <span className="info-hint__popover-desc">{description}</span>
          {formula && (
            <span className="info-hint__popover-formula">
              <strong>Cálculo:</strong> {formula}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
