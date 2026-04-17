// ══════════════════════════════════════════════
// 📱 Detectar tamaño de pantalla (mobile vs desktop)
// ══════════════════════════════════════════════
import { useState, useEffect } from "react";

export default function useMediaQuery(query = "(min-width: 900px)") {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mql.addEventListener?.("change", handler);
    return () => mql.removeEventListener?.("change", handler);
  }, [query]);

  return matches;
}
