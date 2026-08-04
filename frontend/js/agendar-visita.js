//========================================
// ITDESK - AGENDAR VISITA TECNICA (Cliente)
//========================================
// No hay un motor de turnos con franjas fijas — el cliente elige fecha y
// hora libremente (input date + time), y se muestra a modo informativo que
// horarios ya tiene ocupados ese dia cada tecnico con la especialidad
// pedida (GET /visita-tecnica/disponibilidad), para que evite pisar un
// horario ya tomado. El chequeo real de conflicto lo hace Recepcion/Admin
// al confirmar y asignar el tecnico definitivo.

async function cargarEspecialidades() {
    const select = document.getElementById("visitaEspecialidad");

    try {
        const especialidades = await apiFetch("/especialidad");

        select.innerHTML = `<option value="" selected disabled>Seleccioná una opción...</option>` +
            especialidades.map(e => `<option value="${e.id_especialidad}">${e.nombre}</option>`).join("");

    } catch (error) {
        UI.toast("No se pudo cargar el catálogo de especialidades.", "danger");
    }
}

async function actualizarDisponibilidad() {
    const idEspecialidad = document.getElementById("visitaEspecialidad").value;
    const fecha = document.getElementById("visitaFecha").value;
    const contenedor = document.getElementById("visitaDisponibilidad");

    if (!idEspecialidad || !fecha) {
        contenedor.classList.add("d-none");
        return;
    }

    try {
        const disponibilidad = await apiFetch(`/visita-tecnica/disponibilidad?id_especialidad=${idEspecialidad}&fecha=${fecha}`);

        if (disponibilidad.length === 0) {
            contenedor.innerHTML = `<i class="bi bi-info-circle"></i> Todavía no hay técnicos con esta especialidad cargados en el sistema — igual podés solicitar la visita.`;
        } else {
            const ocupados = disponibilidad.flatMap(t => t.horasOcupadas.map(h => h.slice(0, 5)));
            contenedor.innerHTML = ocupados.length > 0
                ? `<i class="bi bi-info-circle"></i> Horarios ya solicitados ese día: ${[...new Set(ocupados)].join(", ")}. Elegí otro para más chances de que te confirmen esa hora.`
                : `<i class="bi bi-check-circle"></i> No hay horarios ocupados ese día todavía.`;
        }

        contenedor.classList.remove("d-none");

    } catch (error) {
        contenedor.classList.add("d-none");
    }
}

async function solicitarVisita(event) {
    event.preventDefault();

    const datos = {
        id_especialidad: Number(document.getElementById("visitaEspecialidad").value),
        fecha_solicitada: document.getElementById("visitaFecha").value,
        hora_solicitada: document.getElementById("visitaHora").value,
        direccion: document.getElementById("visitaDireccion").value.trim(),
        motivo: document.getElementById("visitaMotivo").value.trim()
    };

    const boton = event.target.querySelector("button[type=submit]");

    try {
        await UI.conCargando(boton, "Enviando...", () => apiFetch("/visita-tecnica", {
            method: "POST",
            body: JSON.stringify(datos)
        }));

        sessionStorage.setItem("avisoVisitaSolicitada", "1");
        window.location.href = "mis-visitas.html";

    } catch (error) {
        UI.toast(error.message, "danger");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    cargarEspecialidades();

    const hoy = new Date();
    const manana = new Date(hoy.getTime() + 24 * 60 * 60 * 1000);
    document.getElementById("visitaFecha").min = manana.toISOString().slice(0, 10);

    document.getElementById("visitaEspecialidad").addEventListener("change", actualizarDisponibilidad);
    document.getElementById("visitaFecha").addEventListener("change", actualizarDisponibilidad);
});
