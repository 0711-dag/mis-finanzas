import { useState } from "react";
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  googleProvider,
  updateProfile,
} from "./firebase.js";

export default function Login() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const errorMessages = {
    "auth/invalid-email": "El email no es válido",
    "auth/user-disabled": "Esta cuenta ha sido desactivada",
    "auth/user-not-found": "No existe una cuenta con este email",
    "auth/wrong-password": "Contraseña incorrecta",
    "auth/invalid-credential": "Email o contraseña incorrectos",
    "auth/email-already-in-use": "Ya existe una cuenta con este email",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres",
    "auth/too-many-requests": "Demasiados intentos. Espera un momento",
    "auth/popup-closed-by-user": "Se cerró la ventana de Google",
    "auth/network-request-failed": "Error de conexión. Comprueba tu internet",
  };

  const getErrorMsg = (code) =>
    errorMessages[code] || "Error inesperado. Inténtalo de nuevo.";

  const handleEmail = async (e) => {
    if (e) e.preventDefault();
    if (!email || !password) return;
    setError("");
    setLoading(true);
    try {
      if (mode === "register") {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (name.trim()) {
          await updateProfile(cred.user, { displayName: name.trim() });
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(getErrorMsg(err.code));
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError(getErrorMsg(err.code));
      }
    }
    setLoading(false);
  };

  return (
    <div style={S.page}>
      <div style={S.bgCircle1} />
      <div style={S.bgCircle2} />

      <div style={S.card}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <span style={{ fontSize: 42, display: "block", marginBottom: 6, animation: "float 3s ease-in-out infinite" }}>💰</span>
          <h1 style={{ fontSize: 21, fontWeight: 800, color: "#1f2937", letterSpacing: -0.5, lineHeight: 1.2 }}>Control Financiero</h1>
          <p style={{ fontSize: 13, color: "#6b7280", fontWeight: 500, marginTop: 3 }}>Tu economía familiar, bajo control</p>
        </div>

        <div style={{ display: "flex", background: "#f4f2ed", borderRadius: 10, padding: 3, marginBottom: 18, gap: 2 }}>
          <button className={`tab-btn ${mode === "login" ? "active" : ""}`} onClick={() => { setMode("login"); setError(""); }}>Iniciar sesión</button>
          <button className={`tab-btn ${mode === "register" ? "active" : ""}`} onClick={() => { setMode("register"); setError(""); }}>Crear cuenta</button>
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: 8, padding: "10px 14px", fontSize: 12.5, fontWeight: 500, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleEmail} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {mode === "register" && (
            <div>
              <label style={S.label}>Nombre (opcional)</label>
              <input className="login-input" type="text" placeholder="Tu nombre" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />
            </div>
          )}
          <div>
            <label style={S.label}>Email</label>
            <input className="login-input" type="email" placeholder="tucorreo@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div>
            <label style={S.label}>Contraseña</label>
            <input className="login-input" type="password" placeholder={mode === "register" ? "Mínimo 6 caracteres" : "Tu contraseña"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === "register" ? "new-password" : "current-password"} />
          </div>
          <button type="submit" className="btn-primary" disabled={loading || !email || !password} style={{ marginTop: 4 }}>
            {loading ? "⏳ Espera..." : mode === "login" ? "Entrar" : "Crear cuenta"}
          </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0 14px" }}>
          <span style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
          <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>o continúa con</span>
          <span style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
        </div>

        <button className="btn-google" onClick={handleGoogle} disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 48 48" style={{ marginRight: 10 }}>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          Google
        </button>

        <p style={{ textAlign: "center", fontSize: 12.5, color: "#6b7280", marginTop: 18 }}>
          {mode === "login" ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
          <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }} style={{ background: "none", border: "none", color: "#4338ca", fontWeight: 700, cursor: "pointer", fontSize: 12.5, fontFamily: "'IBM Plex Sans', sans-serif", textDecoration: "underline", textUnderlineOffset: 2 }}>
            {mode === "login" ? "Regístrate aquí" : "Inicia sesión"}
          </button>
        </p>
      </div>
    </div>
  );
}

const S = {
  page: { fontFamily: "'IBM Plex Sans', sans-serif", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4f2ed", padding: 16, position: "relative", overflow: "hidden" },
  bgCircle1: { position: "absolute", top: -100, right: -60, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)", pointerEvents: "none" },
  bgCircle2: { position: "absolute", bottom: -80, left: -40, width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,197,94,0.06) 0%, transparent 70%)", pointerEvents: "none" },
  card: { background: "#fff", borderRadius: 16, padding: "32px 28px 26px", width: "100%", maxWidth: 400, boxShadow: "0 4px 24px rgba(0,0,0,.06), 0 1px 3px rgba(0,0,0,.04)", animation: "fadeUp .45s ease-out", position: "relative", zIndex: 1 },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#374151", letterSpacing: 0.2, marginBottom: 4 },
};
