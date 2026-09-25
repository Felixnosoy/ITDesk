import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { RUTA_INICIO } from "../constants/navegacion";

// La raiz "/" no es una pantalla: manda a cada rol a su propio panel.
export default function IrAlPanel() {
    const { sesion } = useAuth();

    return <Navigate to={RUTA_INICIO[sesion.usuario.rol] ?? "/no-autorizado"} replace />;
}
