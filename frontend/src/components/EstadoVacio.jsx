import { Link } from "react-router-dom";
import Icono from "./Iconos";
import "./EstadoVacio.css";

// Cuando no hay nada que mostrar: dice por que y ofrece el paso siguiente,
// en vez de dejar una tabla en blanco. accion es { etiqueta, ruta } para ir
// a otra pantalla o { etiqueta, onClick } para algo en la misma (limpiar
// filtros); un enlace navega y un boton actua.
export default function EstadoVacio({ icono = "bandeja", titulo, texto, accion }) {
    return (
        <div className="estado-vacio">
            <span className="estado-vacio-icono">
                <Icono nombre={icono} tamano={22} />
            </span>
            <strong>{titulo}</strong>
            {texto && <p>{texto}</p>}
            {accion?.ruta && (
                <Link to={accion.ruta} className="boton boton-secundario boton-chico">
                    {accion.etiqueta}
                </Link>
            )}
            {accion?.onClick && (
                <button type="button" className="boton boton-secundario boton-chico" onClick={accion.onClick}>
                    {accion.etiqueta}
                </button>
            )}
        </div>
    );
}
