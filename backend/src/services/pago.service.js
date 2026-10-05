const crypto = require("crypto");
const crearError = require("../utils/crearError");
const ESTADOS_FACTURA = require("../constants/estadosFactura");
const ticketService = require("./ticket.service");
const facturaService = require("./factura.service");
const { enTransaccion } = require("./cotizacion.service");
const { TIPOS_ACTUALIZACION } = require("./seguimiento.service");
const { validarTexto } = require("../validators/comun.validator");

// Pasarela de pago simulada (issue HU17). No se conecta con ningun banco:
// solo acepta tarjetas de prueba conocidas, asi nadie puede escribir una
// tarjeta real por error. Del pago se guarda la referencia, la fecha y los
// ultimos 4 digitos; el numero completo, el vencimiento y el CVV se usan
// para validar y se descartan.
const TARJETAS_DE_PRUEBA = {
    "4242424242424242": { aprobada: true },
    "4000000000000002": { aprobada: false }
};

const limpiarNumero = (valor) =>
    typeof valor === "string" ? valor.replace(/[\s-]/g, "") : "";

// MM/AA, y que no haya vencido: la tarjeta vale hasta el ultimo dia de
// ese mes
const validarVencimiento = (valor, hoy) => {
    const coincidencia = typeof valor === "string" && valor.trim().match(/^(0[1-9]|1[0-2])\/(\d{2})$/);

    if (!coincidencia) {
        throw crearError("El campo vencimiento debe tener el formato MM/AA.", 400);
    }

    const mes = Number(coincidencia[1]);
    const anio = 2000 + Number(coincidencia[2]);
    const finDeMes = new Date(anio, mes, 1);

    if (finDeMes <= hoy) {
        throw crearError("La tarjeta está vencida.", 400);
    }
};

const validarTarjeta = (datos, hoy = new Date()) => {
    const numero = limpiarNumero(datos.numero_tarjeta);

    if (!/^\d{16}$/.test(numero)) {
        throw crearError("El campo numero_tarjeta debe tener 16 dígitos.", 400);
    }

    if (!TARJETAS_DE_PRUEBA[numero]) {
        throw crearError("Este sistema está en modo de prueba: usa la tarjeta 4242 4242 4242 4242. No ingreses una tarjeta real.", 400);
    }

    validarTexto(datos.titular, "titular", 100);
    validarVencimiento(datos.vencimiento, hoy);

    if (typeof datos.cvv !== "string" || !/^\d{3,4}$/.test(datos.cvv.trim())) {
        throw crearError("El campo cvv debe tener 3 o 4 dígitos.", 400);
    }

    return { ultimos4: numero.slice(-4), ...TARJETAS_DE_PRUEBA[numero] };
};

// PAG- y 10 caracteres al azar: no revela cuantos pagos hay ni de quien
const generarReferencia = () =>
    `PAG-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;

// El cliente dueño paga la factura de su ticket. Que sea el Cliente lo
// exige la ruta; que sea el dueño lo resuelve obtenerTicketPorId (un
// ticket ajeno responde 404). Primero se valida la tarjeta sin tocar la
// base; despues se bloquea la factura para que dos clics no cobren dos
// veces. Una tarjeta rechazada responde 402 y no cambia nada.
const pagarFactura = async (idTicket, datos = {}, usuario) => {
    const tarjeta = validarTarjeta(datos);
    const ticket = await ticketService.obtenerTicketPorId(idTicket, usuario);
    const referencia = generarReferencia();

    await enTransaccion(async (conexion) => {
        const [facturas] = await conexion.query(
            "SELECT id_factura, estado FROM factura WHERE id_ticket = ? FOR UPDATE",
            [ticket.id_ticket]
        );

        if (facturas.length === 0) {
            throw crearError("El ticket todavía no tiene factura.", 404);
        }

        const factura = facturas[0];

        if (factura.estado === ESTADOS_FACTURA.PAGADA) {
            throw crearError("Esta factura ya está pagada.", 409);
        }

        if (!tarjeta.aprobada) {
            throw crearError("La tarjeta fue rechazada. No se hizo ningún cobro.", 402);
        }

        await conexion.query(
            `
            UPDATE factura
            SET estado = ?, fecha_pago = NOW(), referencia_pago = ?, tarjeta_ultimos4 = ?
            WHERE id_factura = ?
            `,
            [ESTADOS_FACTURA.PAGADA, referencia, tarjeta.ultimos4, factura.id_factura]
        );

        await conexion.query(
            `
            INSERT INTO actualizacion (id_ticket, id_usuario, tipo, estado, observaciones)
            VALUES (?, ?, ?, ?, ?)
            `,
            [
                ticket.id_ticket,
                usuario.id_usuario,
                TIPOS_ACTUALIZACION.AVANCE,
                ticket.estado,
                `El cliente pagó la factura en línea. Referencia ${referencia}.`
            ]
        );
    });

    return facturaService.obtenerFacturaDeTicket(ticket.id_ticket);
};

module.exports = {
    TARJETAS_DE_PRUEBA,
    validarTarjeta,
    pagarFactura
};
