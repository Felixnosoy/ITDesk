// "Hay novedades desde tu ultima visita" en el listado y el inicio. Se
// guarda en este navegador, por persona, la ultima actividad que vio de
// cada ticket. La primera vez se toma una fecha base: asi un navegador
// nuevo no marca todo como nuevo, solo lo que pase despues.
//
// Es por dispositivo: si se abre el ticket en otro equipo, aca sigue
// marcado hasta abrirlo tambien aca.
const clave = (idUsuario) => `itdesk_vistos_${idUsuario}`;

export function leerVistos(idUsuario) {
    try {
        const guardado = JSON.parse(localStorage.getItem(clave(idUsuario)) ?? "null");
        if (guardado?.base) return guardado;

        const nuevo = { base: new Date().toISOString(), tickets: {} };
        localStorage.setItem(clave(idUsuario), JSON.stringify(nuevo));
        return nuevo;
    } catch {
        // sin almacenamiento no hay con que comparar: nada se marca como nuevo
        return { base: new Date().toISOString(), tickets: {} };
    }
}

const masReciente = (...fechas) => Math.max(0, ...fechas.filter(Boolean).map((f) => new Date(f).getTime()));

// lo ultimo que paso en un ticket del listado: su apertura, un avance o una
// nota interna (esta ultima solo le llega al personal)
export const ultimaActividad = (ticket) =>
    masReciente(ticket.fecha_apertura, ticket.ultima_actualizacion, ticket.ultima_nota);

export function tieneNovedades(ticket, vistos) {
    const visto = vistos.tickets[ticket.id_ticket] ?? vistos.base;
    return ultimaActividad(ticket) > new Date(visto).getTime();
}

// al abrir el detalle se guarda lo mas reciente que se vio de ese ticket
export function marcarVisto(idUsuario, idTicket, fechas) {
    const vistos = leerVistos(idUsuario);
    const ultima = masReciente(...fechas);
    if (!ultima) return;

    try {
        vistos.tickets[idTicket] = new Date(ultima).toISOString();
        localStorage.setItem(clave(idUsuario), JSON.stringify(vistos));
    } catch {
        // si no se puede guardar, el aviso sigue hasta la proxima vez
    }
}
