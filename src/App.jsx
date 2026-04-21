// ══════════════════════════════════════════════
// 💰 Control Financiero Familiar — App Root
// ══════════════════════════════════════════════
import { useState, useEffect } from "react";
import { auth, onAuthStateChanged } from "./firebase.js";
import Login from "./Login.jsx";
import Dashboard from "./components/Dashboard.jsx";
import useTheme from "./hooks/useTheme.js";
import "./styles/global.css";
// 🆕 Entrega 1/3 — estilos del nuevo layout del gasto rápido
import "./styles/quick-add-v3.css";

export default function App() {
  const [user, setUser] = useState(undefined);
  const { theme, toggle } = useTheme();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => setUser(fbUser || null));
    return () => unsub();
  }, []);

  if (user === undefined) {
    return (
      <div className="spinner-page">
        <div className="spinner-dot" />
        <p className="spinner-text">Cargando…</p>
      </div>
    );
  }

  if (!user) return <Login theme={theme} toggleTheme={toggle} />;

  return <Dashboard user={user} theme={theme} toggleTheme={toggle} />;
}
