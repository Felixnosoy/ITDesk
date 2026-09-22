import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Se usa siempre adentro de RequireAuth (asume que ya hay sesion).
// Si el rol del usuario logueado no esta en la lista permitida, lo manda
// a /no-autorizado en vez de dejarlo pasar.
export default function RequireRole({ roles }) {
    const { sesion } = useAuth();

    if (!roles.includes(sesion.usuario.rol)) {
        return <Navigate to="/no-autorizado" replace />;
    }

    return <Outlet />;
}
