const diagnosticoService = require("../services/diagnostico.service");
const auditoriaService = require("../services/auditoria.service");
const responder = require("../utils/respuesta");

const registrarDiagnostico = async (req, res) => {
    try {
        const { diagnostico, editado } = await diagnosticoService.registrarDiagnostico(
            req.params.id,
            req.body,
            req.usuario
        );

        auditoriaService.registrarEvento({
            id_usuario: req.usuario.id_usuario,
            accion: editado ? "DIAGNOSTICO_EDITADO" : "DIAGNOSTICO_REGISTRADO",
            descripcion: editado ? "Editó el diagnóstico del ticket." : "Registró el diagnóstico del ticket.",
            id_ticket: diagnostico.id_ticket
        });

        responder(res, editado ? 200 : 201, {
            message: editado ? "Diagnóstico actualizado" : "Diagnóstico registrado",
            data: diagnostico
        });

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        });
    }
};

module.exports = {
    registrarDiagnostico
};
