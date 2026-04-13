// ══════════════════════════════════════════════
// 🔒 INACTIVIDAD — Cierre de sesión automático
// ══════════════════════════════════════════════
import { useEffect, useRef } from "react";
import { auth, signOut } from "../firebase.js";

const INACTIVITY_TIMEOUT = 30 * 60 * 1000;

export default function useAutoLogout(user) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        try {
          await signOut(auth);
        } catch (e) {
          console.error("Auto-logout error:", e);
        }
      }, INACTIVITY_TIMEOUT);
    };

    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((ev) => window.addEventListener(ev, resetTimer));
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [user]);
}
