// ══════════════════════════════════════════════
// 🔒 DEBOUNCE — Limita escrituras a Firebase
// ══════════════════════════════════════════════
import { useCallback, useRef } from "react";
import { db, ref, set } from "../firebase.js";

export default function useDebouncedSave(dbPath, user, setSyncing) {
  const pendingRef = useRef(null);
  const timeoutRef = useRef(null);
  const isSavingRef = useRef(false);

  const debouncedSave = useCallback(
    (d) => {
      if (!dbPath) return;
      pendingRef.current = d;

      // Guardar en localStorage como cache local
      if (user) {
        try {
          localStorage.setItem(`finance-${user.uid}`, JSON.stringify(d));
        } catch {
          /* quota exceeded */
        }
      }

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(async () => {
        if (!pendingRef.current) return;
        setSyncing(true);
        isSavingRef.current = true;
        try {
          await set(ref(db, dbPath), pendingRef.current);
        } catch (e) {
          console.error("Error saving:", e);
        }
        setTimeout(() => {
          isSavingRef.current = false;
        }, 500);
        setSyncing(false);
        pendingRef.current = null;
      }, 800);
    },
    [dbPath, user, setSyncing]
  );

  return { debouncedSave, isSavingRef };
}
