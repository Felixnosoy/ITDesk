import { apiFetch } from "./client";

// El servidor calcula importes y totales: solo se mandan descripcion,
// cantidad y precio de cada linea (ver docs/api-cotizaciones.md).
export async function crearCotizacion(token, idTicket, { lineas, observaciones }) {
    const respuesta = await apiFetch(`/tickets/${idTicket}/cotizaciones`, {
        method: "POST",
        token,
        body: {
            lineas: lineas.map(({ descripcion, cantidad, precio_unitario }) => ({
                descripcion: descripcion.trim(),
                cantidad: Number(cantidad),
                precio_unitario: Number(precio_unitario),
            })),
            observaciones: observaciones.trim() || undefined,
        },
    });

    return respuesta.data;
}
