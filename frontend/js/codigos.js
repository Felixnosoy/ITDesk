//========================================
// ITDESK - CODIGOS DE NEGOCIO
//========================================
// El id autoincremental de la base de datos no es un identificador practico
// para que una persona lo lea, lo diga en voz alta o lo busque — es un
// detalle interno. Este helper arma un codigo legible y estable a partir de
// datos que la API ya devuelve (id + una fecha del mismo objeto), sin pedir
// nada nuevo al backend.

const Codigos = {

    _pad(n) {
        return String(n).padStart(6, "0");
    },

    _año(fecha) {
        return new Date(fecha).getFullYear();
    },

    ticket(t) {
        return `TCK-${this._año(t.fecha_apertura)}-${this._pad(t.id_ticket)}`;
    },

    factura(f) {
        return `FAC-${this._año(f.fecha_emision)}-${this._pad(f.id_factura)}`;
    },

    cotizacion(c) {
        return `COT-${this._año(c.fecha_creacion)}-${this._pad(c.id_cotizacion)}`;
    },

    cliente(u) {
        return `CLI-${this._año(u.fecha_registro)}-${this._pad(u.id_usuario)}`;
    },

    equipo(e) {
        return `EQ-${this._año(e.fecha_registro)}-${this._pad(e.id_equipo)}`;
    }
};
