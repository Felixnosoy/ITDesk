import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./AvisoFlotante.css";

const DURACION_MS = 5000;

// Confirmacion de que algo se guardo, flotando abajo al centro: se ve
// aunque la accion se haya hecho a mitad de la pagina, y se va sola. Va en
// un portal para que ningun contenedor con overflow la recorte.
export default function AvisoFlotante({ mensaje, onCerrar }) {
    // onCerrar suele ser una funcion nueva en cada render: con la ref el
    // temporizador no se reinicia cada vez que la pantalla se vuelve a pintar
    const cerrar = useRef(onCerrar);
    useEffect(() => {
        cerrar.current = onCerrar;
    });

    useEffect(() => {
        if (!mensaje) return undefined;
        const temporizador = setTimeout(() => cerrar.current(), DURACION_MS);
        return () => clearTimeout(temporizador);
    }, [mensaje]);

    if (!mensaje) return null;

    return createPortal(
        <div className="aviso-flotante no-imprimir" role="status">
            <span className="aviso-flotante-icono" aria-hidden="true">
                ✓
            </span>
            <span>{mensaje}</span>
            <button type="button" className="aviso-flotante-cerrar" aria-label="Cerrar aviso" onClick={onCerrar}>
                ×
            </button>
        </div>,
        document.body
    );
}
