import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { login } from "../api/auth";
import "./Login.css";

export default function Login() {
    const [correo, setCorreo] = useState("");
    const [contraseña, setContraseña] = useState("");
    const [error, setError] = useState("");
    const [cargando, setCargando] = useState(false);

    const { iniciarSesion } = useAuth();
    const navigate = useNavigate();

    const manejarSubmit = async (evento) => {
        evento.preventDefault();
        setError("");
        setCargando(true);

        try {
            const { token, usuario } = await login(correo, contraseña);
            iniciarSesion({ token, usuario });
            navigate("/", { replace: true });
        } catch (err) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="login-pantalla">
            <form className="login-tarjeta" onSubmit={manejarSubmit}>
                <h1>ITDesk</h1>
                <p className="login-subtitulo">Inicia sesión para continuar</p>

                <label htmlFor="correo">Correo</label>
                <input
                    id="correo"
                    type="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    required
                    autoFocus
                />

                <label htmlFor="contraseña">Contraseña</label>
                <input
                    id="contraseña"
                    type="password"
                    value={contraseña}
                    onChange={(e) => setContraseña(e.target.value)}
                    required
                />

                {error && <p className="login-error">{error}</p>}

                <button type="submit" disabled={cargando}>
                    {cargando ? "Ingresando..." : "Ingresar"}
                </button>
            </form>
        </div>
    );
}
