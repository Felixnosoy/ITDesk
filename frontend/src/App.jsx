import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { ROLES, TODOS_LOS_ROLES } from "./constants/roles";
import { RUTA_INICIO } from "./constants/navegacion";
import RequireAuth from "./routes/RequireAuth";
import RequireRole from "./routes/RequireRole";
import IrAlPanel from "./routes/IrAlPanel";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Panel from "./pages/Panel";
import NoAutorizado from "./pages/NoAutorizado";
import Perfil from "./pages/Perfil";
import CambiarContrasena from "./pages/CambiarContrasena";
import Usuarios from "./pages/Usuarios";

export default function App() {
    const { sesion } = useAuth();

    return (
        <Routes>
            <Route
                path="/login"
                element={sesion ? <Navigate to="/" replace /> : <Login />}
            />

            <Route element={<RequireAuth />}>
                <Route element={<Layout />}>
                    <Route path="/" element={<IrAlPanel />} />
                    <Route path="/no-autorizado" element={<NoAutorizado />} />

                    {/* cada rol tiene su propio panel de inicio */}
                    {TODOS_LOS_ROLES.map((rol) => (
                        <Route key={rol} element={<RequireRole roles={[rol]} />}>
                            <Route path={RUTA_INICIO[rol]} element={<Panel />} />
                        </Route>
                    ))}

                    <Route element={<RequireRole roles={[ROLES.ADMINISTRADOR]} />}>
                        <Route path="/usuarios" element={<Usuarios />} />
                    </Route>

                    <Route element={<RequireRole roles={TODOS_LOS_ROLES} />}>
                        <Route path="/perfil" element={<Perfil />} />
                        <Route path="/cambiar-contrasena" element={<CambiarContrasena />} />
                    </Route>
                </Route>
            </Route>

            {/* cualquier otra direccion vuelve a la raiz, que decide segun la sesion */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
