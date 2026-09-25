import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { EVENTO_SESION_EXPIRADA } from "../api/client";

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

    const cerrarSesion = useCallback(() => {
        localStorage.removeItem(CLAVE_SESION);
        setSesion(null);
    }, []);

    // si el servidor rechaza el token (vencido), se cierra la sesion y
    // RequireAuth devuelve al usuario al login
    useEffect(() => {
        window.addEventListener(EVENTO_SESION_EXPIRADA, cerrarSesion);
        return () => window.removeEventListener(EVENTO_SESION_EXPIRADA, cerrarSesion);
    }, [cerrarSesion]);

    return (
        <AuthContext.Provider value={{ sesion, iniciarSesion, cerrarSesion }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
