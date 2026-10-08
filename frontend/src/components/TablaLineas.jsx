import { formatearMonto } from "../utils/formato";
import "./Cotizacion.css";

// Lineas de una cotizacion o de una factura (la factura copia las de la
// cotizacion aprobada, por eso se ven igual).
export default function TablaLineas({ lineas }) {
    return (
        <div className="tabla-envoltorio">
            <table className="cotizacion-tabla">
                <thead>
                    <tr>
                        <th>Descripción</th>
                        <th className="cotizacion-cantidad">Cant.</th>
                        <th className="cotizacion-monto">Precio unitario</th>
                        <th className="cotizacion-monto">Importe</th>
                    </tr>
                </thead>
                <tbody>
                    {lineas.map((linea) => (
                        <tr key={linea.id_linea}>
                            <td>{linea.descripcion}</td>
                            <td className="cotizacion-cantidad">{linea.cantidad}</td>
                            <td className="cotizacion-monto">{formatearMonto(linea.precio_unitario)}</td>
                            <td className="cotizacion-monto">{formatearMonto(linea.importe)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
