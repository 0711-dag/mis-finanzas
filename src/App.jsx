// ══════════════════════════════════════════════
// 💰 Control Financiero Familiar — App Root
// Solo gestiona autenticación y muestra
// Login o Dashboard según el estado.
// ══════════════════════════════════════════════
import { useState, useEffect } from "react";
import { auth, onAuthStateChanged } from "./firebase.js";
import Login from "./Login.jsx";
import Dashboard from "./components/Dashboard.jsx";
import "./styles/global.css";

export default function App() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser || null);
    });
    return () => unsub();
  }, []);

  // Cargando estado de auth
  if (user === undefined) {
    return (
      <div className="spinner-page">
        <div className="spinner-dot" />
        <p className="spinner-text">Cargando...</p>
      </div>
    );
  }

  // No autenticado → Login
  if (!user) return <Login />;

  // Autenticado → Dashboard
  return <Dashboard user={user} />;
}
