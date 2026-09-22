import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

const CLAVE_SESION = "itdesk_sesion";

function leerSesionGuardada() {
    try {
        const guardada = localStorage.getItem(CLAVE_SESION);
        return guardada ? JSON.parse(guardada) : null;
    } catch {
        return null;
    }
}

export function AuthProvider({ children }) {
    const [sesion, setSesion] = useState(leerSesionGuardada);

    const iniciarSesion = ({ token, usuario }) => {
        const nuevaSesion = { token, usuario };
        localStorage.setItem(CLAVE_SESION, JSON.stringify(nuevaSesion));
        setSesion(nuevaSesion);
    };

    const cerrarSesion = () => {
        localStorage.removeItem(CLAVE_SESION);
        setSesion(null);
    };

    return (
        <AuthContext.Provider value={{ sesion, iniciarSesion, cerrarSesion }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
