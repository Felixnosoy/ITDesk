import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { login } from "../api/auth";
import Logo from "../components/Logo";
import "./Login.css";

// Inicio de sesion con la identidad del taller (issue HU27.6): a un lado la
// marca y su mensaje, al otro el formulario. En el celular la marca queda
// arriba, resumida.
export default function Login() {
    const [correo, setCorreo] = useState("");
    const [contraseña, setContraseña] = useState("");
    const [verClave, setVerClave] = useState(false);
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
            <section className="login-marca" aria-label="ITDesk">
                <Logo tamano="lg" lema />

                <div className="login-marca-mensaje">
                    <p className="login-marca-titular">Cada equipo, en su lugar.</p>
                    <p className="login-marca-texto">
                        Recepción, diagnóstico, cotización, reparación y pago del taller, en un solo sistema.
                    </p>
                </div>
            </section>

            <main className="login-lado-formulario">
                <form className="login-formulario" onSubmit={manejarSubmit}>
                    <h1 className="login-titulo">Inicia sesión</h1>
                    <p className="login-subtitulo">Usa el correo que registraste en el taller.</p>

                    {error && (
                        <p className="aviso aviso-error" role="alert">
                            {error}
                        </p>
                    )}

                    <div className="campo">
                        <label htmlFor="correo">Correo</label>
                        <input
                            id="correo"
                            type="email"
                            autoComplete="username"
                            value={correo}
                            onChange={(e) => setCorreo(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>

                    <div className="campo">
                        <label htmlFor="contraseña">Contraseña</label>
                        <div className="login-clave">
                            <input
                                id="contraseña"
                                type={verClave ? "text" : "password"}
                                autoComplete="current-password"
                                value={contraseña}
                                onChange={(e) => setContraseña(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className="login-ver-clave"
                                aria-pressed={verClave}
                                onClick={() => setVerClave((visible) => !visible)}
                            >
                                {verClave ? "Ocultar" : "Mostrar"}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="boton login-entrar" disabled={cargando}>
                        {cargando ? "Ingresando..." : "Ingresar"}
                    </button>
                </form>
            </main>
        </div>
    );
}
