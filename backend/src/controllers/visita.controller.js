const visitaService = require("../services/visita.service")
const auditoriaService = require("../services/auditoria.service")
const responder = require("../utils/respuesta")

const crearVisita = async (req, res) => {
    try {
        const visita = await visitaService.crearVisita({ ...req.body, id_usuario: req.usuario.id_usuario });

        auditoriaService.registrarEvento({
            id_usuario: req.usuario.id_usuario,
            accion: "VISITA_SOLICITADA",
            descripcion: `Solicitó una visita técnica (${visita.especialidad}) para el ${visita.fecha_solicitada}.`,
            id_visita: visita.id_visita
        });

        responder(res, 200, {
            message: "Visita técnica solicitada exitosamente",
            data: visita
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerVisitas = async (req, res) => {
    try {
        const visitas = await visitaService.obtenerVisitas();

        responder(res, 200, {
            data: visitas
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerMisVisitas = async (req, res) => {
    try {
        const visitas = await visitaService.obtenerVisitasDeUsuario(req.usuario.id_usuario);

        responder(res, 200, {
            data: visitas
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerVisitasTecnico = async (req, res) => {
    try {
        const visitas = await visitaService.obtenerVisitasDeTecnico(req.usuario.id_usuario);

        responder(res, 200, {
            data: visitas
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerDisponibilidad = async (req, res) => {
    try {
        const { id_especialidad, fecha } = req.query;

        const disponibilidad = await visitaService.obtenerDisponibilidad(id_especialidad, fecha);

        responder(res, 200, {
            data: disponibilidad
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerVisitaPorId = async (req, res) => {
    try {
        const { id } = req.params

        const visita = await visitaService.obtenerVisitaPorId(id);

        responder(res, 200, {
            data: visita
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const confirmarVisita = async (req, res) => {
    try {
        const { id } = req.params

        const visita = await visitaService.confirmarVisita(id, req.body);

        auditoriaService.registrarEvento({
            id_usuario: req.usuario.id_usuario,
            accion: "VISITA_CONFIRMADA",
            descripcion: `Confirmó la visita técnica #${id}${visita.tecnico ? ` con ${visita.tecnico}` : ""}.`,
            id_ticket: visita.id_ticket,
            id_visita: Number(id)
        });

        responder(res, 200, {
            data: visita
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const reprogramarVisita = async (req, res) => {
    try {
        const { id } = req.params

        const visita = await visitaService.reprogramarVisita(id, req.body);

        auditoriaService.registrarEvento({
            id_usuario: req.usuario.id_usuario,
            accion: "VISITA_REPROGRAMADA",
            descripcion: `Reprogramó la visita técnica #${id} para el ${visita.fecha_solicitada} ${visita.hora_solicitada}.`,
            id_ticket: visita.id_ticket,
            id_visita: Number(id)
        });

        responder(res, 200, {
            data: visita
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const asignarTecnicoVisita = async (req, res) => {
    try {
        const { id } = req.params

        const visita = await visitaService.asignarTecnico(id, req.body);

        auditoriaService.registrarEvento({
            id_usuario: req.usuario.id_usuario,
            accion: "VISITA_REASIGNADA",
            descripcion: `Reasignó la visita técnica #${id} a ${visita.tecnico}.`,
            id_ticket: visita.id_ticket,
            id_visita: Number(id)
        });

        responder(res, 200, {
            data: visita
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const cancelarVisita = async (req, res) => {
    try {
        const { id } = req.params
        const { motivo } = req.body

        const visita = await visitaService.cancelarVisita(id, req.usuario);

        auditoriaService.registrarEvento({
            id_usuario: req.usuario.id_usuario,
            accion: "VISITA_CANCELADA",
            descripcion: `Canceló la visita técnica #${id}${motivo ? `: ${motivo}` : "."}`,
            id_ticket: visita.id_ticket,
            id_visita: Number(id)
        });

        responder(res, 200, {
            data: visita
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const cambiarEstadoVisita = async (req, res) => {
    try {
        const { id } = req.params
        const { estado } = req.body

        const visita = await visitaService.cambiarEstadoPropia(id, estado, req.usuario);

        auditoriaService.registrarEvento({
            id_usuario: req.usuario.id_usuario,
            accion: `VISITA_${estado.toUpperCase().replace(/\s+/g, "_")}`,
            descripcion: `Actualizó la visita técnica #${id} a "${estado}".`,
            id_ticket: visita.id_ticket,
            id_visita: Number(id)
        });

        responder(res, 200, {
            data: visita
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

module.exports = {
    crearVisita,
    obtenerVisitas,
    obtenerMisVisitas,
    obtenerVisitasTecnico,
    obtenerDisponibilidad,
    obtenerVisitaPorId,
    confirmarVisita,
    reprogramarVisita,
    asignarTecnicoVisita,
    cancelarVisita,
    cambiarEstadoVisita
}
