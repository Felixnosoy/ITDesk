//========================================
// ITDESK - UI
//========================================
// Helpers de presentacion compartidos por todas las pantallas: badges de
// estado/prioridad, formateo de fechas, skeletons, empty states, timeline y
// un reemplazo de confirm()/alert() con modales de Bootstrap. No depende de
// api.js ni de Auth: es puro renderizado.

const UI = {

    // Vocabulario único de estado -> (tono semántico, ícono). Los tonos son
    // los definidos en tokens.css (.badge-pill.tone-*), así que cada badge
    // responde solo a modo claro/oscuro automaticamente.
    MAPA_ESTADO_TICKET: {
        Abierto: { tono: "danger", icono: "bi-exclamation-circle-fill" },
        "En proceso": { tono: "warning", icono: "bi-hourglass-split" },
        Resuelto: { tono: "success", icono: "bi-check-circle-fill" },
        Cerrado: { tono: "neutral", icono: "bi-lock-fill" }
    },

    MAPA_PRIORIDAD: {
        Alta: { tono: "danger", icono: "bi-arrow-up-circle-fill" },
        Media: { tono: "warning", icono: "bi-dash-circle-fill" },
        Baja: { tono: "info", icono: "bi-arrow-down-circle-fill" }
    },

    MAPA_CATEGORIA_TICKET: {
        Hardware: { tono: "accent", icono: "bi-pc-display" },
        Software: { tono: "info", icono: "bi-file-earmark-code" },
        Red: { tono: "warning", icono: "bi-hdd-network" },
        Otro: { tono: "neutral", icono: "bi-question-circle" }
    },

    MAPA_ESTADO_USUARIO: {
        Activo: { tono: "success", icono: "bi-check-circle-fill" },
        Inactivo: { tono: "neutral", icono: "bi-slash-circle" }
    },

    MAPA_ROL: {
        Administrador: { tono: "accent", icono: "bi-shield-lock-fill" },
        Tecnico: { tono: "info", icono: "bi-tools" },
        Recepcionista: { tono: "warning", icono: "bi-person-workspace" },
        Cliente: { tono: "neutral", icono: "bi-person-fill" }
    },

    // Estados reales verificados contra backend/src/constants/estadosCotizacion.js
    // y estadosFactura.js — no son los mismos valores entre uno y otro.
    MAPA_ESTADO_COTIZACION: {
        Pendiente: { tono: "warning", icono: "bi-hourglass-split" },
        Aprobada: { tono: "success", icono: "bi-check-circle-fill" },
        Rechazada: { tono: "danger", icono: "bi-x-circle-fill" },
        Vencida: { tono: "neutral", icono: "bi-clock-history" }
    },

    MAPA_ESTADO_FACTURA: {
        Pendiente: { tono: "warning", icono: "bi-hourglass-split" },
        Pagada: { tono: "success", icono: "bi-check-circle-fill" },
        Anulada: { tono: "danger", icono: "bi-x-circle-fill" },
        Vencida: { tono: "neutral", icono: "bi-clock-history" }
    },

    // Helper generico: valor + mapa de tonos -> pill con icono. El resto de
    // los badgeX() de abajo son wrappers finos sobre este.
    badge(valor, mapa, etiquetaVacia) {
        if (!valor) {
            return etiquetaVacia
                ? `<span class="badge-pill tone-neutral"><span class="dot"></span>${etiquetaVacia}</span>`
                : "";
        }
        const cfg = mapa[valor] || { tono: "neutral", icono: null };
        const icono = cfg.icono ? `<i class="bi ${cfg.icono}"></i>` : `<span class="dot"></span>`;
        return `<span class="badge-pill tone-${cfg.tono}">${icono}${valor}</span>`;
    },

    badgeEstado(estado) {
        return this.badge(estado, this.MAPA_ESTADO_TICKET, "Sin estado");
    },

    badgePrioridad(prioridad) {
        return this.badge(prioridad, this.MAPA_PRIORIDAD);
    },

    badgeCategoria(categoria) {
        return this.badge(categoria, this.MAPA_CATEGORIA_TICKET);
    },

    badgeEstadoUsuario(estado) {
        return this.badge(estado, this.MAPA_ESTADO_USUARIO, "Sin estado");
    },

    badgeRol(rol) {
        return this.badge(rol, this.MAPA_ROL);
    },

    formatearFecha(fecha) {
        if (!fecha) {
            return "—";
        }
        return new Date(fecha).toLocaleString("es-DO", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    },

    formatearFechaCorta(fecha) {
        if (!fecha) {
            return "—";
        }
        return new Date(fecha).toLocaleDateString("es-DO", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    },

    // tabla: <tbody>. cols: cantidad de <td> por fila. filas: cuantas filas fantasma.
    renderSkeleton(tabla, cols, filas = 3) {
        if (!tabla) {
            return;
        }
        const celda = `<td><span class="skeleton-line"></span></td>`;
        tabla.innerHTML = Array.from({ length: filas }).map(() => `
            <tr class="skeleton-row">${celda.repeat(cols)}</tr>
        `).join("");
    },

    renderEmptyState(tabla, cols, mensaje, icono = "bi-inbox") {
        if (!tabla) {
            return;
        }
        tabla.innerHTML = `
            <tr>
                <td colspan="${cols}">
                    <div class="empty-state">
                        <i class="bi ${icono}"></i>
                        <p class="mb-0">${mensaje}</p>
                    </div>
                </td>
            </tr>
        `;
    },

    // Pagina el RENDER de una lista que ya esta completa en memoria (la API
    // no soporta LIMIT/OFFSET) — muestra los primeros "tamano" items y un
    // boton "Mostrar mas" mientras queden. renderFn(visibles, listaOrdenada)
    // recibe la porcion a pintar y la lista completa ya ordenada (para casos
    // como la cola del tecnico, que necesita el total real por grupo aunque
    // solo se vean los primeros N). contenedorBoton: elemento donde se monta
    // el boton (se limpia/oculta solo si no hace falta).
    paginarRender(listaOrdenada, renderFn, contenedorBoton, tamano = 50) {
        if (!contenedorBoton) {
            renderFn(listaOrdenada, listaOrdenada);
            return;
        }

        let mostrados = Math.min(tamano, listaOrdenada.length);

        const pintar = () => {
            renderFn(listaOrdenada.slice(0, mostrados), listaOrdenada);

            const restantes = listaOrdenada.length - mostrados;
            if (restantes <= 0) {
                contenedorBoton.innerHTML = "";
                contenedorBoton.classList.add("d-none");
                return;
            }

            contenedorBoton.classList.remove("d-none");
            contenedorBoton.innerHTML = `
                <button type="button" class="btn btn-outline-secondary btn-sm">
                    Mostrar ${Math.min(tamano, restantes)} más <span class="text-muted">(${restantes} restantes)</span>
                </button>
            `;
            contenedorBoton.querySelector("button").addEventListener("click", () => {
                mostrados = Math.min(mostrados + tamano, listaOrdenada.length);
                pintar();
            });
        };

        pintar();
    },

    renderErrorRow(tabla, cols, mensaje) {
        if (!tabla) {
            return;
        }
        tabla.innerHTML = `
            <tr>
                <td colspan="${cols}" class="text-danger text-center py-3">
                    <i class="bi bi-exclamation-triangle-fill"></i> ${mensaje}
                </td>
            </tr>
        `;
    },

    // Marcado para un archivo colgado de un comentario puntual. Una imagen
    // se ve DIRECTO en el comentario (sin tener que descargarla primero) —
    // pero mostrarla requiere un fetch autenticado que ui.js no hace (no
    // depende de Auth/api.js), asi que esto solo arma un placeholder con
    // data-archivo-id; quien llama (ticket-tecnico.js) lo resuelve despues
    // via cargarImagenesAdjuntas() y conecta el click a UI.mostrarImagen().
    // Un PDF no tiene vista previa: sigue siendo un boton de descarga.
    renderAdjunto(archivo, opciones = {}) {
        if (!archivo) {
            return "";
        }

        const esImagen = archivo.tipo_mime && archivo.tipo_mime.startsWith("image/");
        const nombreEscapado = archivo.nombre_original.replace(/"/g, "&quot;");

        if (esImagen) {
            return `
                <div class="adjunto-imagen-wrap mt-2" data-archivo-id="${archivo.id_archivo}" data-archivo-nombre="${nombreEscapado}">
                    <div class="adjunto-imagen-loading"><span class="spinner-border spinner-border-sm"></span></div>
                </div>
            `;
        }

        if (!opciones.funcionDescarga) {
            return "";
        }

        return `
            <div class="d-flex align-items-center gap-2 mt-2">
                <button class="btn btn-outline-secondary btn-sm" type="button"
                    onclick="${opciones.funcionDescarga}(${archivo.id_archivo}, '${archivo.nombre_original.replace(/'/g, "\\'")}')">
                    <i class="bi bi-file-earmark-pdf"></i> ${archivo.nombre_original}
                </button>
                ${opciones.funcionEliminarArchivo ? `
                    <button class="btn btn-outline-danger btn-sm" type="button" onclick="${opciones.funcionEliminarArchivo}(${archivo.id_archivo})">
                        <i class="bi bi-trash"></i>
                    </button>
                ` : ""}
            </div>
        `;
    },

    // Lightbox generico: agranda una imagen ya resuelta (blob URL, no pide
    // nada nuevo — quien llama ya hizo el fetch autenticado). Descargar sale
    // gratis desde la misma URL; Eliminar es opcional y se invoca por
    // nombre de funcion global, mismo patron que el resto de UI con onclick.
    mostrarImagen({ url, nombre, idArchivo, funcionEliminar }) {
        let modalEl = document.getElementById("modalImagenUI");

        if (!modalEl) {
            const envoltorio = document.createElement("div");
            envoltorio.innerHTML = `
                <div class="modal fade" id="modalImagenUI" tabindex="-1">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content lightbox-content">
                            <div class="modal-header border-0">
                                <h6 class="modal-title text-white text-truncate" id="modalImagenUITitulo"></h6>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body text-center pt-0">
                                <img id="modalImagenUIImg" src="" class="lightbox-img" alt="">
                            </div>
                            <div class="modal-footer border-0 justify-content-center">
                                <button type="button" class="btn btn-outline-light btn-sm" id="modalImagenUIDescargar">
                                    <i class="bi bi-download"></i> Descargar
                                </button>
                                <button type="button" class="btn btn-outline-danger btn-sm d-none" id="modalImagenUIEliminar">
                                    <i class="bi bi-trash"></i> Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(envoltorio.firstElementChild);
            modalEl = document.getElementById("modalImagenUI");
        }

        document.getElementById("modalImagenUITitulo").textContent = nombre || "";
        document.getElementById("modalImagenUIImg").src = url;

        document.getElementById("modalImagenUIDescargar").onclick = () => {
            const enlace = document.createElement("a");
            enlace.href = url;
            enlace.download = nombre || "imagen";
            enlace.click();
        };

        const btnEliminar = document.getElementById("modalImagenUIEliminar");
        if (funcionEliminar && idArchivo) {
            btnEliminar.classList.remove("d-none");
            btnEliminar.onclick = () => {
                bootstrap.Modal.getInstance(modalEl)?.hide();
                window[funcionEliminar](idArchivo);
            };
        } else {
            btnEliminar.classList.add("d-none");
        }

        new bootstrap.Modal(modalEl).show();
    },

    // entradas: [{ estado, observaciones, fecha_actualizacion, usuario? }], mas antiguo primero o mas nuevo primero segun venga.
    renderTimeline(contenedor, entradas, opciones = {}) {
        if (!contenedor) {
            return;
        }

        if (!entradas || entradas.length === 0) {
            contenedor.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-clock-history"></i>
                    <p class="mb-0">${opciones.vacioMensaje || "Todavía no hay novedades registradas."}</p>
                </div>
            `;
            return;
        }

        let fechaAnterior = null;

        contenedor.innerHTML = `
            <div class="timeline">
                ${entradas.map(entrada => {
                    const cfg = this.MAPA_ESTADO_TICKET[entrada.estado] || { tono: "neutral", icono: "bi-circle-fill" };
                    const fechaDia = this.formatearFechaCorta(entrada.fecha_actualizacion);
                    const separadorFecha = fechaDia !== fechaAnterior
                        ? `<div class="timeline-date-divider">${fechaDia}</div>`
                        : "";
                    fechaAnterior = fechaDia;

                    // archivo adjunto a ESTA entrada puntual (no un listado
                    // aparte del ticket entero) — opcional, viene de un mapa
                    // {id_actualizacion: archivo} armado por quien llama.
                    const archivo = opciones.archivosPorEntrada && entrada.id_actualizacion
                        ? opciones.archivosPorEntrada[entrada.id_actualizacion]
                        : null;

                    return `
                        ${separadorFecha}
                        <div class="timeline-item">
                            <div class="timeline-marker tone-${cfg.tono}"><i class="bi ${cfg.icono}"></i></div>
                            <div class="timeline-content">
                                <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
                                    ${this.badgeEstado(entrada.estado)}
                                    <small class="text-muted">${this.formatearFecha(entrada.fecha_actualizacion)}</small>
                                </div>
                                ${entrada.observaciones ? `<p class="mb-0 mt-2">${entrada.observaciones}</p>` : ""}
                                ${this.renderAdjunto(archivo, opciones)}
                                <div class="d-flex justify-content-between align-items-center mt-1">
                                    ${entrada.usuario ? `<small class="text-muted"><i class="bi bi-person-fill"></i> ${entrada.usuario}</small>` : "<span></span>"}
                                    ${opciones.editable && entrada.id_actualizacion ? `
                                        <button class="btn btn-link btn-sm p-0" type="button" onclick="editarActualizacion(${entrada.id_actualizacion})">
                                            <i class="bi bi-pencil"></i> Editar
                                        </button>
                                    ` : ""}
                                </div>
                            </div>
                        </div>
                    `;
                }).join("")}
            </div>
        `;
    },

    // Reemplaza confirm() nativo por un modal de Bootstrap. Devuelve una Promise<boolean>.
    confirmar(mensaje, opciones = {}) {
        return new Promise((resolve) => {
            let modalEl = document.getElementById("modalConfirmarUI");

            if (!modalEl) {
                const wrapper = document.createElement("div");
                wrapper.innerHTML = `
                    <div class="modal fade" id="modalConfirmarUI" tabindex="-1">
                        <div class="modal-dialog modal-dialog-centered">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h5 class="modal-title" id="modalConfirmarUITitulo">Confirmar acción</h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                </div>
                                <div class="modal-body" id="modalConfirmarUIMensaje"></div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                                    <button type="button" class="btn btn-danger" id="modalConfirmarUIBtn">Confirmar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                document.body.appendChild(wrapper.firstElementChild);
                modalEl = document.getElementById("modalConfirmarUI");
            }

            document.getElementById("modalConfirmarUITitulo").textContent = opciones.titulo || "Confirmar acción";
            document.getElementById("modalConfirmarUIMensaje").textContent = mensaje;

            const btnConfirmar = document.getElementById("modalConfirmarUIBtn");
            btnConfirmar.textContent = opciones.textoConfirmar || "Confirmar";
            btnConfirmar.className = `btn ${opciones.claseConfirmar || "btn-danger"}`;

            const modal = new bootstrap.Modal(modalEl);

            let resuelto = false;

            const alConfirmar = () => {
                resuelto = true;
                modal.hide();
                resolve(true);
            };

            const alOcultar = () => {
                btnConfirmar.removeEventListener("click", alConfirmar);
                modalEl.removeEventListener("hidden.bs.modal", alOcultar);
                if (!resuelto) {
                    resolve(false);
                }
            };

            btnConfirmar.addEventListener("click", alConfirmar);
            modalEl.addEventListener("hidden.bs.modal", alOcultar);

            modal.show();
        });
    },

    // Aviso no bloqueante en la esquina de la pantalla. tipo: success | danger | warning | info.
    toast(mensaje, tipo = "success") {
        let contenedor = document.getElementById("toastContainerUI");

        if (!contenedor) {
            contenedor = document.createElement("div");
            contenedor.id = "toastContainerUI";
            contenedor.className = "toast-container position-fixed bottom-0 end-0 p-3";
            contenedor.style.zIndex = "1080";
            document.body.appendChild(contenedor);
        }

        const iconos = {
            success: "bi-check-circle-fill",
            danger: "bi-exclamation-octagon-fill",
            warning: "bi-exclamation-triangle-fill",
            info: "bi-info-circle-fill"
        };

        const toastEl = document.createElement("div");
        toastEl.className = `toast align-items-center text-white bg-${tipo} border-0`;
        toastEl.setAttribute("role", "alert");
        toastEl.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi ${iconos[tipo] || iconos.info}"></i> ${mensaje}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        contenedor.appendChild(toastEl);

        const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
        toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
        toast.show();
    },

    // Envuelve una accion async con el patron "disable + spinner + restaurar"
    // que antes estaba copiado en cada formulario. No atrapa errores: los
    // deja pasar para que el caller decida como avisar (normalmente UI.toast).
    async conCargando(boton, textoCargando, fn) {
        const original = boton.innerHTML;
        boton.disabled = true;
        boton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> ${textoCargando}`;
        try {
            return await fn();
        } finally {
            boton.disabled = false;
            boton.innerHTML = original;
        }
    }
};
