import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Bloquea el acceso a todo lo que cuelgue de esta ruta si no hay sesion.
export default function RequireAuth() {
    const { sesion } = useAuth();

    if (!sesion) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}
