import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { TODOS_LOS_ROLES } from "./constants/roles";
import RequireAuth from "./routes/RequireAuth";
import RequireRole from "./routes/RequireRole";
import Login from "./pages/Login";
import Inicio from "./pages/Inicio";
import NoAutorizado from "./pages/NoAutorizado";

export default function App() {
    const { sesion } = useAuth();

    return (
        <Routes>
            <Route
                path="/login"
                element={sesion ? <Navigate to="/" replace /> : <Login />}
            />

            <Route element={<RequireAuth />}>
                <Route path="/no-autorizado" element={<NoAutorizado />} />

                <Route element={<RequireRole roles={TODOS_LOS_ROLES} />}>
                    <Route path="/" element={<Inicio />} />
                </Route>
            </Route>
        </Routes>
    );
}
