import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ETIQUETA_ROL } from "../constants/roles";
import { RUTA_INICIO, seccionesParaRol } from "../constants/navegacion";
import Icono from "./Iconos";
import Logo from "./Logo";
import BuscadorGlobal from "./BuscadorGlobal";
import { TEMAS, guardarTema } from "../utils/tema";
import { leerMenuPlegado, guardarMenuPlegado } from "../utils/preferencias";
import "./Layout.css";

function iniciales(usuario) {
    return `${usuario.nombre?.[0] ?? ""}${usuario.apellido?.[0] ?? ""}`.toUpperCase();
}

// el menu se oculta del todo por debajo de este ancho (mismo valor que la
// media query de Layout.css)
const CONSULTA_ANGOSTA = "(max-width: 960px)";

// Marco compartido de todas las pantallas con sesion: menu lateral segun el
// rol, barra superior y cierre de sesion.
//
// En escritorio el menu se puede plegar a una franja de iconos para dejarle
// la pantalla al trabajo; la eleccion se recuerda. En pantallas angostas el
// menu no ocupa lugar: se abre encima del contenido desde el mismo boton.
export default function Layout() {
    const { sesion, cerrarSesion } = useAuth();
    const { usuario } = sesion;
    const { pathname } = useLocation();
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [plegado, setPlegado] = useState(leerMenuPlegado);
    const [tema, setTema] = useState(() => document.documentElement.dataset.tema ?? TEMAS.CLARO);
    const oscuro = tema === TEMAS.OSCURO;

    const cambiarTema = () => {
        const nuevo = oscuro ? TEMAS.CLARO : TEMAS.OSCURO;
        guardarTema(nuevo);
        setTema(nuevo);
    };

    // un solo boton para las dos cosas: en escritorio pliega, en angosto abre
    const alternarMenu = () => {
        if (window.matchMedia(CONSULTA_ANGOSTA).matches) {
            setMenuAbierto(true);
            return;
        }
        setPlegado((actual) => {
            guardarMenuPlegado(!actual);
            return !actual;
        });
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

    const opciones = [
        { ruta: RUTA_INICIO[usuario.rol], etiqueta: "Inicio", icono: "inicio" },
        ...seccionesParaRol(usuario.rol),
    ];

    // plegado, el texto de cada opcion queda solo para el lector de pantalla
    // y el title muestra el nombre al pasar el cursor
    const pista = (texto) => (plegado ? texto : undefined);

    return (
        <div className={`layout${plegado ? " layout-plegado" : ""}`}>
            {menuAbierto && (
                <div
                    className="layout-fondo"
                    onClick={() => setMenuAbierto(false)}
                    aria-hidden="true"
                />
            )}

            <aside
                id="menu-lateral"
                aria-label="Menú lateral"
                className={`layout-lateral${menuAbierto ? " abierto" : ""}`}
            >
                <div className="layout-lateral-marca">
                    <Logo />
                </div>

                <nav className="layout-nav" aria-label="Navegación principal">
                    {opciones.map((opcion) => (
                        <NavLink
                            key={opcion.ruta}
                            to={opcion.ruta}
                            end
                            title={pista(opcion.etiqueta)}
                            className={({ isActive }) =>
                                `layout-enlace${isActive || opcion.tambienActiva?.includes(pathname) ? " active" : ""}`
                            }
                            onClick={() => setMenuAbierto(false)}
                        >
                            <Icono nombre={opcion.icono} />
                            <span className="layout-texto">{opcion.etiqueta}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="layout-usuario">
                    <div className="layout-usuario-datos" title={pista(`${usuario.nombre} ${usuario.apellido}`)}>
                        <span className="layout-avatar" aria-hidden="true">
                            {iniciales(usuario)}
                        </span>
                        <div className="layout-usuario-texto layout-texto">
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
                        title={pista("Modo oscuro")}
                        onClick={cambiarTema}
                    >
                        <Icono nombre={oscuro ? "sol" : "luna"} />
                        <span className="layout-texto">Modo oscuro</span>
                    </button>
                    <button
                        type="button"
                        className="layout-accion layout-salir"
                        title={pista("Cerrar sesión")}
                        onClick={cerrarSesion}
                    >
                        <Icono nombre="salir" />
                        <span className="layout-texto">Cerrar sesión</span>
                    </button>
                </div>
            </aside>

            <div className="layout-principal">
                <header className="layout-barra no-imprimir">
                    <button
                        type="button"
                        className="layout-alternar"
                        aria-label={plegado ? "Desplegar el menú" : "Plegar el menú"}
                        aria-controls="menu-lateral"
                        aria-expanded={menuAbierto || !plegado}
                        title={plegado ? "Desplegar el menú" : "Plegar el menú"}
                        onClick={alternarMenu}
                    >
                        <span className="layout-alternar-escritorio">
                            <Icono nombre={plegado ? "desplegar" : "plegar"} tamano={20} />
                        </span>
                        <span className="layout-alternar-angosto">
                            <Icono nombre="menu" tamano={22} />
                        </span>
                    </button>
                    <span className="layout-barra-logo">
                        <Logo />
                    </span>
                    <BuscadorGlobal />
                </header>

                <main className="layout-contenido">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
