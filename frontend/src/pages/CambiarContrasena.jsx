import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { cambiarContrasena } from "../api/usuarios";

// mismo minimo que exige el backend (usuario.service.js)
const LONGITUD_MINIMA = 8;

export default function CambiarContrasena() {
    const { sesion } = useAuth();
    const { token, usuario } = sesion;

    const [actual, setActual] = useState("");
    const [nueva, setNueva] = useState("");
    const [confirmacion, setConfirmacion] = useState("");
    const [error, setError] = useState("");
    const [aviso, setAviso] = useState("");
    const [guardando, setGuardando] = useState(false);

    // valida en el navegador lo que el servidor tambien valida, para no
    // hacer una peticion que se sabe que va a fallar
    const validar = () => {
        if (nueva.length < LONGITUD_MINIMA) {
            return `La nueva contraseña debe tener al menos ${LONGITUD_MINIMA} caracteres.`;
        }
        if (nueva !== confirmacion) {
            return "La confirmación no coincide con la nueva contraseña.";
        }
        if (nueva === actual) {
            return "La nueva contraseña debe ser distinta de la actual.";
        }
        return "";
    };

    const enviar = async (evento) => {
        evento.preventDefault();
        setAviso("");

        const problema = validar();
        if (problema) {
            setError(problema);
            return;
        }

        setError("");
        setGuardando(true);

        try {
            await cambiarContrasena(token, usuario.id_usuario, actual, nueva);
            setActual("");
            setNueva("");
            setConfirmacion("");
            setAviso("La contraseña se actualizó. Úsala la próxima vez que inicies sesión.");
        } catch (err) {
            setError(err.message);
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="pagina">
            <div className="pagina-cabecera">
                <h1>Cambiar contraseña</h1>
                <p>Para confirmar el cambio hace falta escribir la contraseña actual.</p>
            </div>

            <form className="tarjeta" style={{ maxWidth: 480 }} onSubmit={enviar}>
                {error && (
                    <div className="aviso aviso-error" role="alert">
                        {error}
                    </div>
                )}
                {aviso && (
                    <div className="aviso aviso-ok" role="status">
                        {aviso}
                    </div>
                )}

                <div className="campo">
                    <label htmlFor="actual">Contraseña actual</label>
                    <input
                        id="actual"
                        type="password"
                        autoComplete="current-password"
                        value={actual}
                        onChange={(e) => setActual(e.target.value)}
                        required
                    />
                </div>

                <div className="campo">
                    <label htmlFor="nueva">Nueva contraseña</label>
                    <input
                        id="nueva"
                        type="password"
                        autoComplete="new-password"
                        value={nueva}
                        onChange={(e) => setNueva(e.target.value)}
                        required
                    />
                    <span className="campo-ayuda">
                        Mínimo {LONGITUD_MINIMA} caracteres.
                    </span>
                </div>

                <div className="campo">
                    <label htmlFor="confirmacion">Confirmar nueva contraseña</label>
                    <input
                        id="confirmacion"
                        type="password"
                        autoComplete="new-password"
                        value={confirmacion}
                        onChange={(e) => setConfirmacion(e.target.value)}
                        required
                    />
                </div>

                <button type="submit" className="boton" disabled={guardando}>
                    {guardando ? "Guardando..." : "Cambiar contraseña"}
                </button>
            </form>
        </div>
    );
}
