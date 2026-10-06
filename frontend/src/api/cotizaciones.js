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

// Solo el cliente dueno decide. estado es "Aprobada" o "Rechazada"; el
// motivo solo viaja al rechazar y es opcional.
export async function decidirCotizacion(token, idTicket, idCotizacion, { estado, motivo }) {
    const respuesta = await apiFetch(`/tickets/${idTicket}/cotizaciones/${idCotizacion}`, {
        method: "PATCH",
        token,
        body: { estado, motivo: motivo?.trim() || undefined },
    });

    return respuesta.data;
}
