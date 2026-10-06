import { apiFetch } from "./client";

// Sin cuerpo: el servidor copia montos y lineas de la cotizacion aprobada.
export async function generarFactura(token, idTicket) {
    const respuesta = await apiFetch(`/tickets/${idTicket}/factura`, { method: "POST", token });

    return respuesta.data;
}
