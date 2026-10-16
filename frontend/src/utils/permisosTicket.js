import { ROLES } from "../constants/roles";
import { ESTADOS_TICKET } from "../constants/tickets";
import { ESTADOS_COTIZACION, ESTADOS_FACTURA } from "../constants/cotizaciones";
import { proximoPaso, leToca } from "./ciclo";

// Reglas del detalle de un ticket, sin React: que puede hacer quien mira y
// cual es el proximo paso. Las mismas reglas que las rutas del backend, asi
// la pantalla no ofrece algo que el servidor va a rechazar con 403.

// diagnostico, avances, notas, cotizaciones, facturas y cambios de estado
const ROLES_QUE_TRABAJAN = [ROLES.TECNICO, ROLES.ADMINISTRADOR];

export function permisosDe(detalle, rol) {
    // vista del taller o del cliente: no se decide por el rol sino por lo que
    // manda el servidor; al Cliente no le llegan notas_privadas
    const esTaller = "notas_privadas" in detalle;
    const trabaja = ROLES_QUE_TRABAJAN.includes(rol);
    const esCliente = rol === ROLES.CLIENTE;

    const cotizaciones = detalle.cotizaciones ?? [];
    const pendiente = cotizaciones[0]?.estado === ESTADOS_COTIZACION.PENDIENTE ? cotizaciones[0] : null;
    const aprobada = cotizaciones.find((c) => c.estado === ESTADOS_COTIZACION.APROBADA) ?? null;
    const { factura } = detalle;

    return {
        esTaller,
        esCliente,
        cotizaciones,
        pendiente,
        aprobada,
        // Recepcion ve todo el detalle, notas incluidas, pero no escribe
        puedeEditar: esTaller && trabaja && detalle.ticket.estado !== ESTADOS_TICKET.CERRADO,
        puedeCambiarEstado: trabaja && detalle.estados_siguientes?.length > 0,
        // cotizable ya dice si se puede cotizar ahora (hay diagnostico, no hay
        // otra vigente, no esta resuelto)
        puedeCotizar: Boolean(detalle.cotizable) && trabaja,
        // solo el cliente dueno decide y paga
        puedeDecidir: Boolean(pendiente) && esCliente,
        puedeFacturar: Boolean(detalle.facturable && aprobada) && trabaja,
        puedePagar: factura?.estado === ESTADOS_FACTURA.PENDIENTE && esCliente,
        // el cliente solo ve la tarjeta cuando ya tiene algo que mirar
        mostrarCotizacion: cotizaciones.length > 0 || (esTaller && Boolean(detalle.diagnostico)),
        mostrarFactura: Boolean(factura) || Boolean(detalle.facturable),
    };
}

// Aviso del proximo paso: lo que hay que hacer ahora y, si le toca a quien
// mira, su boton principal. abrir es la seccion o ventana que abre.
export function proximoPasoDetalle(detalle, rol, permisos) {
    const { ticket, diagnostico, factura } = detalle;
    const paso = proximoPaso(
        {
            ...ticket,
            factura_estado: factura?.estado,
            factura_total: factura?.total,
            cotizacion_pendiente_total: permisos.pendiente?.total,
        },
        rol
    );

    let acciones = [];
    if (permisos.puedeDecidir) {
        acciones = [
            { etiqueta: "Rechazar", secundaria: true, abrir: ESTADOS_COTIZACION.RECHAZADA },
            { etiqueta: "Aprobar cotización", abrir: ESTADOS_COTIZACION.APROBADA },
        ];
    } else if (permisos.puedePagar) {
        acciones = [{ etiqueta: "Pagar en línea", abrir: "pago" }];
    } else if (permisos.puedeEditar && !diagnostico) {
        paso.texto = "Registra el diagnóstico: sin él no se puede cotizar.";
        acciones = [{ etiqueta: "Registrar diagnóstico", abrir: "diagnostico" }];
    } else if (permisos.puedeCotizar) {
        paso.texto =
            permisos.cotizaciones.length > 0
                ? "El cliente rechazó la cotización anterior. Prepara una nueva."
                : "El diagnóstico está listo. Prepara la cotización para el cliente.";
        acciones = [{ etiqueta: "Crear cotización", abrir: "cotizacion" }];
    } else if (permisos.puedeFacturar) {
        acciones = [{ etiqueta: "Generar factura", abrir: "factura" }];
    } else if (permisos.puedeCambiarEstado && leToca(paso, rol)) {
        acciones = [{ etiqueta: "Cambiar estado", abrir: "estado" }];
    }

    return { texto: paso.texto, acciones, urgente: acciones.length > 0 };
}
