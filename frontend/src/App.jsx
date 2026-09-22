import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Inicio from "./pages/Inicio";

export default function App() {
    const { sesion } = useAuth();

    return (
        <Routes>
            <Route
                path="/login"
                element={sesion ? <Navigate to="/" replace /> : <Login />}
            />
            <Route
                path="/"
                element={sesion ? <Inicio /> : <Navigate to="/login" replace />}
            />
        </Routes>
    );
}
