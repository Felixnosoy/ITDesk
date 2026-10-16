import { useEffect, useRef, useState } from "react";
import "./MenuAcciones.css";

// Boton "..." con las acciones menos frecuentes de una fila, para no llenar
// la tabla de botones. Se cierra con Escape, al elegir o al hacer clic fuera.
//
// opciones: [{ etiqueta, onClick, deshabilitada?, motivo?, peligro? }]
export default function MenuAcciones({ etiqueta, opciones }) {
    const [abierto, setAbierto] = useState(false);
    const contenedor = useRef(null);

    useEffect(() => {
        if (!abierto) return undefined;

        const alClic = (evento) => {
            if (!contenedor.current?.contains(evento.target)) setAbierto(false);
        };
        const alTecla = (evento) => {
            if (evento.key === "Escape") setAbierto(false);
        };
        document.addEventListener("mousedown", alClic);
        document.addEventListener("keydown", alTecla);
        return () => {
            document.removeEventListener("mousedown", alClic);
            document.removeEventListener("keydown", alTecla);
        };
    }, [abierto]);

    return (
        <div className="menu-acciones" ref={contenedor}>
            <button
                type="button"
                className="boton boton-chico boton-secundario menu-acciones-boton"
                aria-label={etiqueta}
                aria-haspopup="menu"
                aria-expanded={abierto}
                onClick={() => setAbierto((valor) => !valor)}
            >
                ⋯
            </button>
            {abierto && (
                <ul className="menu-acciones-lista" role="menu">
                    {opciones.map((opcion) => (
                        <li key={opcion.etiqueta} role="none">
                            <button
                                type="button"
                                role="menuitem"
                                className={opcion.peligro ? "menu-acciones-peligro" : undefined}
                                disabled={opcion.deshabilitada}
                                title={opcion.deshabilitada ? opcion.motivo : undefined}
                                onClick={() => {
                                    setAbierto(false);
                                    opcion.onClick();
                                }}
                            >
                                {opcion.etiqueta}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
