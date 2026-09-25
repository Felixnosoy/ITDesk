import { useEffect } from "react";
import "./Modal.css";

// Ventana emergente simple: se cierra con Escape, con la X o al hacer clic
// en el fondo.
export default function Modal({ titulo, onCerrar, children }) {
    useEffect(() => {
        const alPresionar = (evento) => {
            if (evento.key === "Escape") onCerrar();
        };
        document.addEventListener("keydown", alPresionar);
        return () => document.removeEventListener("keydown", alPresionar);
    }, [onCerrar]);

    return (
        <div
            className="modal-fondo"
            onMouseDown={(evento) => {
                if (evento.target === evento.currentTarget) onCerrar();
            }}
        >
            <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
                <div className="modal-cabecera">
                    <h2 id="modal-titulo">{titulo}</h2>
                    <button
                        type="button"
                        className="modal-cerrar"
                        aria-label="Cerrar"
                        onClick={onCerrar}
                    >
                        ×
                    </button>
                </div>
                <div className="modal-cuerpo">{children}</div>
            </div>
        </div>
    );
}
