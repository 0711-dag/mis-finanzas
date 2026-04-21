// ══════════════════════════════════════════════
// 🔒 DEBOUNCE — Limita escrituras a Firebase
// ──────────────────────────────────────────────
// IMPORTANTE: `isSavingRef` ahora se activa INMEDIATAMENTE al llamar a
// `debouncedSave`, no solo cuando empieza el `await set(...)`.
// Motivo: entre que el usuario hace un cambio y se escribe en Firebase hay
// una ventana de 800ms (el debounce). Si durante esa ventana Firebase emite
// un evento `onValue` con datos viejos (latency compensation, otra pestaña,
// reconexión…), antes pisaba el estado local y el cambio desaparecía.
//
// Con este cambio:
//  - `isSavingRef = true` se activa al programar el timeout (t=0).
//  - Se mantiene en true durante los 800ms de espera + el await set.
//  - Se desactiva 500ms después de que set() termine, dando tiempo al eco
//    de la propia escritura a llegar y ser descartado correctamente.
//
// 🆕 (Entrega de robustez)
// - Antes de cada `set()` aplicamos `stripUndefined(...)`, porque Firebase
//   Realtime Database lanza un error y aborta TODA la escritura si encuentra
//   cualquier propiedad con valor `undefined` en cualquier nivel del árbol.
//   Hasta ahora, esos errores se silenciaban en el catch y el usuario veía
//   sus datos "guardados" en pantalla pero al refrescar habían desaparecido.
// - Si el `set()` falla, llamamos a `onSaveError(message)` para que el hook
//   padre pueda mostrar al usuario un toast con el motivo real del fallo.
// ══════════════════════════════════════════════
import { useCallback, useRef } from "react";
import { db, ref, set } from "../firebase.js";
import { stripUndefined } from "../validation.js";

export default function useDebouncedSave(dbPath, user, setSyncing, setLastSyncTime, onSaveError) {
  const pendingRef = useRef(null);
  const timeoutRef = useRef(null);
  const isSavingRef = useRef(false);
  // Timeout que desactiva isSavingRef tras completar el guardado.
  // Lo guardamos para poder cancelarlo si llega un nuevo save antes de que expire.
  const unlockTimeoutRef = useRef(null);

  const debouncedSave = useCallback(
    (d) => {
      if (!dbPath) return;
      pendingRef.current = d;

      // 🔒 Bloqueamos onValue YA, no dentro del setTimeout.
      // Así cualquier eco/evento del servidor durante los próximos 800ms
      // no pisa el estado local recién actualizado.
      isSavingRef.current = true;

      // Si había programado un desbloqueo pendiente, lo cancelamos:
      // estamos en medio de otra escritura, seguimos "guardando".
      if (unlockTimeoutRef.current) {
        clearTimeout(unlockTimeoutRef.current);
        unlockTimeoutRef.current = null;
      }

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
        // isSavingRef ya está en true desde que se llamó a debouncedSave,
        // no hace falta volver a ponerlo aquí.
        try {
          // 🆕 Limpiar undefineds antes de mandar a Firebase. Sin esto, un
          // único campo undefined en cualquier rincón del árbol provoca que
          // Firebase rechace la escritura completa.
          const safePayload = stripUndefined(pendingRef.current);
          await set(ref(db, dbPath), safePayload);
          setLastSyncTime(new Date());
        } catch (e) {
          console.error("Error saving:", e);
          // 🆕 Notificar al hook padre para que el usuario vea el error.
          // Antes era silencioso: la app mostraba los datos en memoria pero
          // al refrescar se perdían sin avisar.
          if (typeof onSaveError === "function") {
            const msg = e?.message
              ? `No se pudo guardar: ${e.message}`
              : "No se pudo guardar el cambio. Comprueba tu conexión.";
            try { onSaveError(msg); } catch { /* no-op */ }
          }
        }
        setSyncing(false);
        pendingRef.current = null;

        // Mantenemos el bloqueo 500ms más para que el eco de la propia
        // escritura (onValue con los datos que acabamos de subir) se
        // ignore y no dispare un re-render innecesario.
        unlockTimeoutRef.current = setTimeout(() => {
          isSavingRef.current = false;
          unlockTimeoutRef.current = null;
        }, 500);
      }, 800);
    },
    [dbPath, user, setSyncing, setLastSyncTime, onSaveError]
  );

  return { debouncedSave, isSavingRef };
}
