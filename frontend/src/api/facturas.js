import { apiFetch } from "./client";

// Sin cuerpo: el servidor copia montos y lineas de la cotizacion aprobada.
export async function generarFactura(token, idTicket) {
    const respuesta = await apiFetch(`/tickets/${idTicket}/factura`, { method: "POST", token });

    return respuesta.data;
}

// Pago simulado: solo acepta las tarjetas de prueba. Responde 402 si la
// tarjeta es la de rechazo; del pago solo se guardan referencia, fecha y
// los ultimos 4 digitos.
export async function pagarFactura(token, idTicket, { numero_tarjeta, titular, vencimiento, cvv }) {
    const respuesta = await apiFetch(`/tickets/${idTicket}/factura/pago`, {
        method: "POST",
        token,
        body: { numero_tarjeta, titular: titular.trim(), vencimiento, cvv },
    });

    return respuesta.data;
}
