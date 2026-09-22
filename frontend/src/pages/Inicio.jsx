import { useAuth } from "../context/AuthContext";

// Pantalla temporal: el panel real por rol (menú lateral, secciones)
// llega con la siguiente historia. Por ahora solo confirma que el login
// funcionó de punta a punta.
export default function Inicio() {
    const { sesion, cerrarSesion } = useAuth();
    const { usuario } = sesion;

    return (
        <div style={{ padding: 32 }}>
            <p>
                Sesión iniciada como <strong>{usuario.nombre} {usuario.apellido}</strong> ({usuario.rol})
            </p>
            <button onClick={cerrarSesion}>Cerrar sesión</button>
        </div>
    );
}
