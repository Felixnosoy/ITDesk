import { useEffect, useState } from "react";
import Modal from "./Modal";
import { esAtajoLibre } from "../utils/teclado";
import "./AyudaAtajos.css";

const GRUPOS = [
    {
        titulo: "En cualquier pantalla",
        atajos: [
            [["Ctrl", "K"], "Buscar tickets, clientes y equipos"],
            [["/"], "Buscar (otra forma)"],
            [["?"], "Mostrar esta ayuda"],
            [["Esc"], "Cerrar una ventana o la búsqueda"],
        ],
    },
    {
        titulo: "En el detalle de un ticket",
        atajos: [
            [["A"], "Escribir un avance para el cliente"],
            [["N"], "Escribir una nota interna"],
            [["E"], "Cambiar el estado"],
            [["Ctrl", "Enter"], "Enviar el mensaje"],
        ],
    },
];

// Lista de atajos de teclado, con "?" desde cualquier pantalla. El trabajo
// diario del taller (buscar, anotar, cambiar estado) se puede hacer sin
// soltar el teclado.
export default function AyudaAtajos() {
    const [abierta, setAbierta] = useState(false);

    useEffect(() => {
        const alPresionar = (evento) => {
            if (evento.key !== "?" || !esAtajoLibre(evento)) return;
            evento.preventDefault();
            setAbierta(true);
        };
        document.addEventListener("keydown", alPresionar);
        return () => document.removeEventListener("keydown", alPresionar);
    }, []);

    return (
        <>
            {/* sin el boton, los atajos solo los descubre quien ya sabe que existen */}
            <button
                type="button"
                className="atajos-boton"
                aria-label="Atajos de teclado"
                title="Atajos de teclado (?)"
                onClick={() => setAbierta(true)}
            >
                <kbd>?</kbd>
            </button>
            {abierta && (
                <Modal titulo="Atajos de teclado" onCerrar={() => setAbierta(false)}>
                    {GRUPOS.map((grupo) => (
                        <section key={grupo.titulo} className="atajos-grupo">
                            <h3>{grupo.titulo}</h3>
                            <dl>
                                {grupo.atajos.map(([teclas, descripcion]) => (
                                    <div key={descripcion} className="atajos-fila">
                                        <dt>
                                            {teclas.map((tecla, i) => (
                                                <span key={tecla}>
                                                    {i > 0 && " + "}
                                                    <kbd>{tecla}</kbd>
                                                </span>
                                            ))}
                                        </dt>
                                        <dd>{descripcion}</dd>
                                    </div>
                                ))}
                            </dl>
                        </section>
                    ))}
                </Modal>
            )}
        </>
    );
}
