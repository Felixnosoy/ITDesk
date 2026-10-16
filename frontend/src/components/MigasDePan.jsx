import { Link } from "react-router-dom";
import "./MigasDePan.css";

// Donde esta el usuario dentro del sistema (Tickets › TK-0004) y como volver
// un nivel. Reemplaza al enlace suelto "Volver a tickets": dice lo mismo y
// ademas ubica. El ultimo elemento es la pagina actual y no es enlace.
//
// elementos: [{ etiqueta, ruta? }]
export default function MigasDePan({ elementos }) {
    return (
        <nav className="migas no-imprimir" aria-label="Ruta de navegación">
            <ol>
                {elementos.map((elemento, indice) => {
                    const esActual = indice === elementos.length - 1;

                    return (
                        <li key={elemento.etiqueta}>
                            {esActual || !elemento.ruta ? (
                                <span aria-current={esActual ? "page" : undefined}>{elemento.etiqueta}</span>
                            ) : (
                                <Link to={elemento.ruta}>{elemento.etiqueta}</Link>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
