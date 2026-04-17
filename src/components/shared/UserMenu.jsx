// ══════════════════════════════════════════════
// 👤 Menú de usuario (avatar + popover)
// ══════════════════════════════════════════════
import { useState, useEffect, useRef } from "react";
import { CYCLE_START_DAY } from "../../utils/cycle.js";

export default function UserMenu({ user, theme, toggleTheme, onLogout, onReset, inline }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    setTimeout(() => document.addEventListener("click", close), 10);
    return () => document.removeEventListener("click", close);
  }, [open]);

  const userInitial = (user.displayName?.[0] || user.email?.[0] || "?").toUpperCase();
  const userName = user.displayName || user.email?.split("@")[0] || "Usuario";

  if (inline) {
    // Versión inline para sidebar desktop
    return (
      <div ref={ref} style={{ position: "relative" }}>
        <button
          className="nav-item"
          onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
          style={{ width: "100%" }}
        >
          <div style={{
            width: 24, height: 24, borderRadius: "50%",
            background: "var(--bg-subtle)", color: "var(--text-primary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, overflow: "hidden", flexShrink: 0,
          }}>
            {user.photoURL ? (
              <img src={user.photoURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} referrerPolicy="no-referrer" />
            ) : userInitial}
          </div>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName}</span>
        </button>

        {open && (
          <div className="user-menu" style={{ bottom: "calc(100% + 6px)", top: "auto", right: 0 }} onClick={(e) => e.stopPropagation()}>
            <MenuContent user={user} userName={userName} onLogout={onLogout} onReset={onReset} />
          </div>
        )}
      </div>
    );
  }

  // Versión compacta (avatar circular para móvil)
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className="m-avatar"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        title={userName}
        style={user.photoURL ? { padding: 0, overflow: "hidden" } : {}}
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt="" referrerPolicy="no-referrer" />
        ) : userInitial}
      </button>
      {open && (
        <div className="user-menu" onClick={(e) => e.stopPropagation()}>
          <MenuContent user={user} userName={userName} onLogout={onLogout} onReset={onReset} theme={theme} toggleTheme={toggleTheme} showTheme />
        </div>
      )}
    </div>
  );
}

function MenuContent({ user, userName, onLogout, onReset, theme, toggleTheme, showTheme }) {
  return (
    <>
      <div className="user-menu__info">
        <div className="user-menu__name">{userName}</div>
        <div className="user-menu__email">{user.email}</div>
        <div className="user-menu__hint">🔒 Sesión cierra tras 30 min inactivo</div>
        <div className="user-menu__hint">📅 Ciclo: día {CYCLE_START_DAY} → día {CYCLE_START_DAY - 1}</div>
      </div>

      {showTheme && (
        <button className="user-menu__item" onClick={toggleTheme}>
          <span>{theme === "light" ? "🌙" : "☀️"}</span>
          <span>{theme === "light" ? "Modo oscuro" : "Modo claro"}</span>
        </button>
      )}

      <button className="user-menu__item" onClick={onLogout}>
        <span>🚪</span>
        <span>Cerrar sesión</span>
      </button>

      <div className="user-menu__divider" />
      <div className="user-menu__label">Zona peligrosa</div>
      <button className="user-menu__item user-menu__item--danger" onClick={onReset}>
        <span>🗑️</span>
        <span>Restablecer cuenta</span>
      </button>
    </>
  );
}
