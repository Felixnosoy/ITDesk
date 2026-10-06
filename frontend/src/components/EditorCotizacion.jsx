import { useRef, useState } from "react";
import { MAXIMO_LINEAS, MAXIMA_CANTIDAD, calcularMontos, cantidadValida, importeCentavos, precioValido } from "../utils/montos";
import { formatearMonto } from "../utils/formato";
import Totales from "./Totales";
import "./Cotizacion.css";

// cada linea lleva una clave propia para que React no confunda los campos
// al quitar una del medio (el indice cambiaria y los textos se moverian)
let siguienteClave = 0;
const lineaVacia = () => ({ clave: ++siguienteClave, descripcion: "", cantidad: "1", precio_unitario: "" });

// Editor de la cotizacion: el tecnico agrega, quita y edita lineas y ve el
// subtotal, el ITBIS y el total al instante. Es solo una vista previa: el
// servidor vuelve a calcular todo con la misma formula al guardar.
export default function EditorCotizacion({ guardando, error, onGuardar, onCancelar }) {
    const [lineas, setLineas] = useState(() => [lineaVacia()]);
    const [observaciones, setObservaciones] = useState("");
    // los errores de cada campo se muestran recien despues de salir de el,
    // para no marcar en rojo algo que el tecnico todavia esta escribiendo
    const [tocados, setTocados] = useState({});
    const tabla = useRef(null);

    const montos = calcularMontos(lineas);

    const cambiar = (clave, campo, valor) =>
        setLineas(lineas.map((linea) => (linea.clave === clave ? { ...linea, [campo]: valor } : linea)));

    const tocar = (clave, campo) => setTocados({ ...tocados, [`${clave}-${campo}`]: true });

    const agregar = () => {
        setLineas([...lineas, lineaVacia()]);
        // lleva el foco a la descripcion nueva para seguir escribiendo sin el mouse
        requestAnimationFrame(() => {
            const campos = tabla.current?.querySelectorAll("input[name='descripcion']");
            campos?.[campos.length - 1]?.focus();
        });
    };

    const quitar = (clave) => setLineas(lineas.filter((linea) => linea.clave !== clave));

    const problemas = (linea) => ({
        descripcion: !linea.descripcion.trim() ? "Escribe qué se cobra." : "",
        cantidad: !cantidadValida(linea.cantidad) ? `Entero de 1 a ${MAXIMA_CANTIDAD}.` : "",
        precio_unitario: !precioValido(linea.precio_unitario) ? "Monto con hasta 2 decimales." : "",
    });

    const todoValido = lineas.every((linea) => Object.values(problemas(linea)).every((p) => !p));

    const enviar = (evento) => {
        evento.preventDefault();

        if (!todoValido) {
            // al intentar guardar se muestran todos los errores juntos
            const todos = {};
            lineas.forEach((linea) => {
                ["descripcion", "cantidad", "precio_unitario"].forEach((campo) => (todos[`${linea.clave}-${campo}`] = true));
            });
            setTocados(todos);
            return;
        }

        onGuardar({ lineas, observaciones });
    };

    const campo = (linea, nombre, props) => {
        const mensaje = tocados[`${linea.clave}-${nombre}`] ? problemas(linea)[nombre] : "";

        return (
            <>
                <input
                    name={nombre}
                    value={linea[nombre]}
                    aria-invalid={Boolean(mensaje)}
                    onChange={(e) => cambiar(linea.clave, nombre, e.target.value)}
                    onBlur={() => tocar(linea.clave, nombre)}
                    {...props}
                />
                {mensaje && <span className="cotizacion-error-campo">{mensaje}</span>}
            </>
        );
    };

    return (
        <form onSubmit={enviar} noValidate>
            {error && (
                <div className="aviso aviso-error" role="alert">
                    {error}
                </div>
            )}

            <div className="tabla-envoltorio">
                <table className="cotizacion-tabla cotizacion-editor" ref={tabla}>
                    <thead>
                        <tr>
                            <th className="cotizacion-numero">#</th>
                            <th>Descripción</th>
                            <th className="cotizacion-cantidad">Cant.</th>
                            <th className="cotizacion-monto">Precio unitario</th>
                            <th className="cotizacion-monto">Importe</th>
                            <th aria-label="Quitar" />
                        </tr>
                    </thead>
                    <tbody>
                        {lineas.map((linea, i) => {
                            const importe = importeCentavos(linea);

                            return (
                                <tr key={linea.clave}>
                                    <td className="cotizacion-numero">{i + 1}</td>
                                    <td>
                                        {campo(linea, "descripcion", {
                                            maxLength: 255,
                                            placeholder: "Pieza o servicio",
                                            "aria-label": `Descripción de la línea ${i + 1}`,
                                        })}
                                    </td>
                                    <td className="cotizacion-cantidad">
                                        {campo(linea, "cantidad", {
                                            type: "number",
                                            min: 1,
                                            max: MAXIMA_CANTIDAD,
                                            step: 1,
                                            "aria-label": `Cantidad de la línea ${i + 1}`,
                                        })}
                                    </td>
                                    <td className="cotizacion-monto">
                                        {campo(linea, "precio_unitario", {
                                            type: "number",
                                            min: 0,
                                            step: "0.01",
                                            placeholder: "0.00",
                                            "aria-label": `Precio unitario de la línea ${i + 1}`,
                                        })}
                                    </td>
                                    <td className="cotizacion-monto">
                                        {importe === null ? "—" : formatearMonto(importe / 100)}
                                    </td>
                                    <td>
                                        <button
                                            type="button"
                                            className="cotizacion-quitar"
                                            aria-label={`Quitar la línea ${i + 1}`}
                                            title="Quitar línea"
                                            disabled={lineas.length === 1}
                                            onClick={() => quitar(linea.clave)}
                                        >
                                            ×
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="cotizacion-pie">
                <button
                    type="button"
                    className="boton boton-chico boton-secundario"
                    disabled={lineas.length >= MAXIMO_LINEAS}
                    onClick={agregar}
                >
                    + Agregar línea
                </button>
                <Totales montos={montos} />
            </div>
            {lineas.length >= MAXIMO_LINEAS && (
                <p className="campo-ayuda">La cotización admite como máximo {MAXIMO_LINEAS} líneas.</p>
            )}

            <div className="campo">
                <label htmlFor="cotizacion-observaciones">Observaciones (opcional)</label>
                <textarea
                    id="cotizacion-observaciones"
                    rows={2}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Garantía, tiempo estimado, condiciones..."
                />
                <span className="campo-ayuda">
                    Al guardar, el ticket pasa a "Esperando aprobación" hasta que el cliente decida.
                </span>
            </div>

            <div className="modal-acciones">
                <button type="button" className="boton boton-secundario" onClick={onCancelar}>
                    Cancelar
                </button>
                <button type="submit" className="boton" disabled={guardando}>
                    {guardando ? "Guardando..." : "Enviar cotización"}
                </button>
            </div>
        </form>
    );
}
