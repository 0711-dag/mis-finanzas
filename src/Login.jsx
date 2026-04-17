import { useState } from "react";
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  googleProvider,
  updateProfile,
} from "./firebase.js";

export default function Login({ theme, toggleTheme }) {
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
        if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
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
      if (err.code !== "auth/popup-closed-by-user") setError(getErrorMsg(err.code));
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      {/* Toggle tema, esquina sup. derecha */}
      <button
        className="btn-ghost"
        onClick={toggleTheme}
        style={{ position: "absolute", top: 16, right: 16 }}
        title={`Cambiar a modo ${theme === "light" ? "oscuro" : "claro"}`}
      >
        {theme === "light" ? "🌙" : "☀️"}
      </button>

      <div className="login-card">
        <div className="login-logo">💰</div>
        <h1 className="login-title">Finanzas Familiares</h1>
        <p className="login-subtitle">Tu economía, bajo control</p>

        <div className="login-tabs">
          <button
            className={`login-tab ${mode === "login" ? "login-tab--active" : ""}`}
            onClick={() => { setMode("login"); setError(""); }}
          >
            Iniciar sesión
          </button>
          <button
            className={`login-tab ${mode === "register" ? "login-tab--active" : ""}`}
            onClick={() => { setMode("register"); setError(""); }}
          >
            Crear cuenta
          </button>
        </div>

        {error && <div className="login-error">⚠️ {error}</div>}

        <form onSubmit={handleEmail}>
          {mode === "register" && (
            <div className="login-field">
              <label className="login-label">Nombre (opcional)</label>
              <input
                className="login-input"
                type="text"
                placeholder="Tu nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
              />
            </div>
          )}
          <div className="login-field">
            <label className="login-label">Email</label>
            <input
              className="login-input"
              type="email"
              placeholder="tucorreo@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="login-field">
            <label className="login-label">Contraseña</label>
            <input
              className="login-input"
              type="password"
              placeholder={mode === "register" ? "Mínimo 6 caracteres" : "Tu contraseña"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
            />
          </div>
          <button
            type="submit"
            className="btn-primary btn-primary--accent"
            disabled={loading || !email || !password}
            style={{ marginTop: 6 }}
          >
            {loading ? "Espera…" : mode === "login" ? "Entrar" : "Crear cuenta"}
          </button>
        </form>

        <div className="login-divider">
          <span className="login-divider__line" />
          <span className="login-divider__text">o continúa con</span>
          <span className="login-divider__line" />
        </div>

        <button className="login-google" onClick={handleGoogle} disabled={loading}>
          <svg width="16" height="16" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          Google
        </button>

        <p className="login-footer">
          {mode === "login" ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
          <button
            className="login-link"
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit" }}
          >
            {mode === "login" ? "Regístrate aquí" : "Inicia sesión"}
          </button>
        </p>
      </div>
    </div>
  );
}
