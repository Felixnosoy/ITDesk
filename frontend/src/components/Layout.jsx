import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ETIQUETA_ROL } from "../constants/roles";
import { RUTA_INICIO, seccionesParaRol } from "../constants/navegacion";
import Icono from "./Iconos";
import Logo from "./Logo";
import BusquedaGlobal from "./BusquedaGlobal";
import { TEMAS, guardarTema } from "../utils/tema";
import "./Layout.css";

function iniciales(usuario) {
    return `${usuario.nombre?.[0] ?? ""}${usuario.apellido?.[0] ?? ""}`.toUpperCase();
}

// Marco compartido de todas las pantallas con sesion: menu lateral segun el
// rol, datos del usuario y cierre de sesion. En pantallas angostas el menu se
// oculta y se abre desde la barra superior.
export default function Layout() {
    const { sesion, cerrarSesion } = useAuth();
    const { usuario } = sesion;
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [buscando, setBuscando] = useState(false);
    const [tema, setTema] = useState(() => document.documentElement.dataset.tema ?? TEMAS.CLARO);
    const oscuro = tema === TEMAS.OSCURO;

    const cambiarTema = () => {
        const nuevo = oscuro ? TEMAS.CLARO : TEMAS.OSCURO;
        guardarTema(nuevo);
        setTema(nuevo);
    };

    // el color de cada rol sale de data-rol (styles/tokens.css); va en <html>
    // y no en el layout porque modales y documentos se montan fuera de el
    useEffect(() => {
        document.documentElement.dataset.rol = usuario.rol;
        return () => {
            delete document.documentElement.dataset.rol;
        };
    }, [usuario.rol]);

    useEffect(() => {
        if (!menuAbierto) return undefined;

        const alPresionar = (evento) => {
            if (evento.key === "Escape") setMenuAbierto(false);
        };
        document.addEventListener("keydown", alPresionar);
        return () => document.removeEventListener("keydown", alPresionar);
    }, [menuAbierto]);

    // Ctrl+K (Cmd+K en Mac) abre la busqueda global desde cualquier
    // pantalla (issue HU30.4); se escucha aqui porque el layout envuelve a
    // todas. Con la busqueda abierta, el mismo atajo la cierra.
    useEffect(() => {
        const alPresionar = (evento) => {
            if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === "k") {
                evento.preventDefault();
                setMenuAbierto(false);
                setBuscando((abierta) => !abierta);
            }
        };
        document.addEventListener("keydown", alPresionar);
        return () => document.removeEventListener("keydown", alPresionar);
    }, []);

    const abrirBusqueda = () => {
        setMenuAbierto(false);
        setBuscando(true);
    };

    const opciones = [
        { ruta: RUTA_INICIO[usuario.rol], etiqueta: "Inicio", icono: "inicio" },
        ...seccionesParaRol(usuario.rol),
    ];

    return (
        <div className="layout">
            <header className="layout-topbar">
                <button
                    type="button"
                    className="layout-hamburguesa"
                    aria-label="Abrir menú"
                    aria-expanded={menuAbierto}
                    aria-controls="menu-lateral"
                    onClick={() => setMenuAbierto(true)}
                >
                    <Icono nombre="menu" tamano={22} />
                </button>
                <Logo />
                <button
                    type="button"
                    className="layout-hamburguesa layout-buscar-icono"
                    aria-label="Buscar"
                    onClick={abrirBusqueda}
                >
                    <Icono nombre="buscar" tamano={22} />
                </button>
            </header>

            {menuAbierto && (
                <div
                    className="layout-fondo"
                    onClick={() => setMenuAbierto(false)}
                    aria-hidden="true"
                />
            )}

            <aside
                id="menu-lateral"
                className={`layout-lateral${menuAbierto ? " abierto" : ""}`}
            >
                <div className="layout-lateral-marca">
                    <Logo />
                </div>

                <button type="button" className="layout-buscar" onClick={abrirBusqueda}>
                    <Icono nombre="buscar" tamano={16} />
                    <span>Buscar</span>
                    <kbd className="busqueda-tecla" aria-label="atajo Control K">
                        Ctrl K
                    </kbd>
                </button>

                <nav className="layout-nav" aria-label="Navegación principal">
                    {opciones.map((opcion) => (
                        <NavLink
                            key={opcion.ruta}
                            to={opcion.ruta}
                            end
                            className="layout-enlace"
                            onClick={() => setMenuAbierto(false)}
                        >
                            <Icono nombre={opcion.icono} />
                            <span>{opcion.etiqueta}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="layout-usuario">
                    <div className="layout-usuario-datos">
                        <span className="layout-avatar" aria-hidden="true">
                            {iniciales(usuario)}
                        </span>
                        <div className="layout-usuario-texto">
                            <strong>
                                {usuario.nombre} {usuario.apellido}
                            </strong>
                            <span>{ETIQUETA_ROL[usuario.rol] ?? usuario.rol}</span>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="layout-accion"
                        aria-pressed={oscuro}
                        onClick={cambiarTema}
                    >
                        <Icono nombre={oscuro ? "sol" : "luna"} />
                        <span>Modo oscuro</span>
                    </button>
                    <button
                        type="button"
                        className="layout-accion layout-salir"
                        onClick={cerrarSesion}
                    >
                        <Icono nombre="salir" />
                        <span>Cerrar sesión</span>
                    </button>
                </div>
            </aside>

            <main className="layout-contenido">
                <Outlet />
            </main>

            {buscando && <BusquedaGlobal onCerrar={() => setBuscando(false)} />}
        </div>
    );
}
