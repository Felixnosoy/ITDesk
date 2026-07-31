//========================================
// ITDESK - LAYOUT
//========================================
// Arma el shell de la app (sidebar + topbar movil + footer) segun el rol de
// la sesion, y protege la pagina.
//
// Como se usa en cada pagina protegida:
//   <body data-protegido="Administrador">
//     <div class="app-shell">
//       <div id="sidebar-placeholder"></div>
//       <div class="app-main">
//         <div id="topbar-mobile-placeholder"></div>
//         <main class="app-content">...</main>
//         <div id="footer-placeholder"></div>
//       </div>
//     </div>
//
// data-protegido acepta varios roles separados por coma, ej:
//   data-protegido="Administrador,Tecnico"
//
// Las paginas publicas (index, login) no llevan data-protegido: Layout no
// hace nada en ellas.

const NAV_POR_ROL = {
    Administrador: {
        marca: { href: "dashboard-admin.html", texto: "ITDESK", icono: "bi-headset" },
        links: [
            { href: "dashboard-admin.html", label: "Inicio", icono: "bi-house-fill" },
            { href: "usuarios.html", label: "Usuarios", icono: "bi-people-fill" },
            { href: "reportes.html", label: "Reportes", icono: "bi-bar-chart-fill" },
            { href: "auditoria.html", label: "Auditoría", icono: "bi-clipboard-data-fill" }
        ]
    },
    Tecnico: {
        marca: { href: "dashboard-tecnico.html", texto: "ITDESK", icono: "bi-tools" },
        links: [
            { href: "dashboard-tecnico.html", label: "Mis tickets", icono: "bi-house-fill" },
            { href: "auditoria.html", label: "Auditoría", icono: "bi-clipboard-data-fill" }
        ]
    },
    Cliente: {
        marca: { href: "dashboard-cliente.html", texto: "ITDESK", icono: "bi-headset" },
        links: [
            { href: "dashboard-cliente.html", label: "Inicio", icono: "bi-house-fill" },
            { href: "historial.html", label: "Historial", icono: "bi-clock-history" },
            { href: "documentos.html", label: "Documentos", icono: "bi-receipt" }
        ]
    },
    Recepcionista: {
        marca: { href: "dashboard-recepcion.html", texto: "ITDESK", icono: "bi-person-workspace" },
        links: [
            { href: "dashboard-recepcion.html", label: "Inicio", icono: "bi-house-fill" },
            { href: "recepcion.html", label: "Nuevo ticket", icono: "bi-plus-circle" }
        ]
    }
};

// Modo oscuro: el script anti-parpadeo inline en el <head> de cada pagina ya
// aplica el data-theme guardado antes del primer paint, usando la misma
// llave de localStorage ("tema"). Este objeto solo maneja el toggle.
const Theme = {
    LLAVE: "tema",

    guardado() {
        return localStorage.getItem(this.LLAVE);
    },

    efectivo() {
        return this.guardado() ||
            (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    },

    aplicar(tema) {
        document.documentElement.setAttribute("data-theme", tema);
        localStorage.setItem(this.LLAVE, tema);
    },

    alternar() {
        const nuevo = this.efectivo() === "dark" ? "light" : "dark";
        this.aplicar(nuevo);
        return nuevo;
    }
};

function iniciales(nombre, apellido) {
    return `${(nombre || "").charAt(0)}${(apellido || "").charAt(0)}`.toUpperCase() || "?";
}

// Bandeja de notificaciones (campanita del sidebar). "leida" viene de un
// tinyint(1) en MySQL — puede llegar como 0/1 o false/true segun el driver,
// por eso se usa "!n.leida" en vez de comparar contra un valor especifico.
let notificacionesCache = [];

// El panel se mueve a document.body (no queda anidado en .sidebar) porque
// .sidebar tiene overflow-y:auto — un dropdown posicionado adentro queda
// recortado por ese scroll. Se maneja como un overlay propio en vez de con
// el dropdown de Bootstrap, que asume que puede escapar de su contenedor.
function inicializarPanelNotificaciones() {
    const boton = document.getElementById("btnNotificaciones");
    const panel = document.getElementById("listaNotificaciones");
    if (!boton || !panel) {
        return;
    }

    document.body.appendChild(panel);

    document.getElementById("btnMarcarTodasLeidas")?.addEventListener("click", (evento) => {
        evento.stopPropagation();
        marcarTodasNotificacionesLeidas();
    });

    // El boton vive al pie del sidebar, asi que casi siempre hay mas
    // espacio arriba que abajo — el panel se abre hacia el lado con mas
    // lugar en vez de asumir siempre "hacia abajo" como un dropdown comun.
    const posicionar = () => {
        const rect = boton.getBoundingClientRect();
        const margen = 8;
        const espacioAbajo = window.innerHeight - rect.bottom;
        const espacioArriba = rect.top;

        panel.style.left = `${Math.max(margen, Math.min(rect.right + margen, window.innerWidth - 320 - margen))}px`;

        if (espacioAbajo >= espacioArriba) {
            panel.style.top = `${rect.top}px`;
            panel.style.bottom = "auto";
            panel.style.maxHeight = `${Math.min(400, espacioAbajo - margen)}px`;
        } else {
            panel.style.top = "auto";
            panel.style.bottom = `${window.innerHeight - rect.bottom}px`;
            panel.style.maxHeight = `${Math.min(400, espacioArriba - margen)}px`;
        }
    };

    const cerrar = () => {
        panel.classList.remove("show");
        boton.setAttribute("aria-expanded", "false");
    };

    boton.addEventListener("click", (evento) => {
        evento.stopPropagation();
        const abrir = !panel.classList.contains("show");
        if (abrir) {
            posicionar();
            panel.classList.add("show");
            boton.setAttribute("aria-expanded", "true");
        } else {
            cerrar();
        }
    });

    document.addEventListener("click", (evento) => {
        if (panel.classList.contains("show") && !panel.contains(evento.target) && evento.target !== boton) {
            cerrar();
        }
    });

    document.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape" && panel.classList.contains("show")) {
            cerrar();
            boton.focus();
        }
    });

    window.addEventListener("resize", () => {
        if (panel.classList.contains("show")) {
            posicionar();
        }
    });
}

async function cargarNotificaciones() {
    try {
        notificacionesCache = await apiFetch("/notificacion/mis");
    } catch {
        notificacionesCache = [];
    }
    actualizarBadgeNotificaciones();
    renderListaNotificaciones();
}

function actualizarBadgeNotificaciones() {
    const badge = document.getElementById("badgeNotificaciones");
    if (!badge) {
        return;
    }
    const noLeidas = notificacionesCache.filter(n => !n.leida).length;
    if (noLeidas > 0) {
        badge.textContent = noLeidas > 9 ? "9+" : noLeidas;
        badge.classList.remove("d-none");
    } else {
        badge.classList.add("d-none");
    }

    const btnMarcarTodas = document.getElementById("btnMarcarTodasLeidas");
    if (btnMarcarTodas) {
        btnMarcarTodas.disabled = noLeidas === 0;
    }
}

function renderListaNotificaciones() {
    const contenedor = document.getElementById("listaNotificacionesItems");
    if (!contenedor) {
        return;
    }

    if (notificacionesCache.length === 0) {
        contenedor.innerHTML = `
            <div class="p-3 text-muted small text-center">
                <i class="bi bi-bell-slash"></i><br>Sin notificaciones.
            </div>
        `;
        return;
    }

    contenedor.innerHTML = notificacionesCache.map(n => `
        <button type="button" class="dropdown-item text-wrap py-2 border-bottom" onclick="abrirNotificacion(${n.id_notificacion})">
            <div class="d-flex justify-content-between align-items-start gap-2">
                ${UI.badgeTipoNotificacion(n.tipo)}
                ${n.leida ? "" : `<span class="notif-unread-dot"></span>`}
            </div>
            <div class="small ${n.leida ? "text-muted" : ""} mt-1">${n.mensaje}</div>
            <div class="small text-muted mt-1">${n.ticket_titulo}</div>
        </button>
    `).join("");
}

// Marcar como leida es "fire and forget" respecto a la navegacion — el
// tecnico/cliente ya quiere ir al ticket, no tiene sentido hacerlo esperar
// a que el PATCH termine.
function abrirNotificacion(id_notificacion) {
    const notificacion = notificacionesCache.find(n => n.id_notificacion === id_notificacion);
    if (!notificacion) {
        return;
    }

    if (!notificacion.leida) {
        apiFetch(`/notificacion/mis/${id_notificacion}/leida`, { method: "PATCH" }).catch(() => {});
        notificacion.leida = 1;
        actualizarBadgeNotificaciones();
    }

    const pagina = Auth.getRol() === "Cliente" ? "ticket-cliente.html" : "detalle-ticket.html";
    window.location.href = `${pagina}?id=${notificacion.id_ticket}`;
}

async function marcarTodasNotificacionesLeidas() {
    if (!notificacionesCache.some(n => !n.leida)) {
        return;
    }

    try {
        notificacionesCache = await apiFetch("/notificacion/mis/leidas", { method: "PATCH" });
    } catch {
        notificacionesCache = notificacionesCache.map(n => ({ ...n, leida: 1 }));
    }

    actualizarBadgeNotificaciones();
    renderListaNotificaciones();
}

const Layout = {

    _rol: null,
    _config: null,

    renderSidebar(rol, usuario) {
        const contenedor = document.getElementById("sidebar-placeholder");
        const config = NAV_POR_ROL[rol];

        if (!contenedor || !config) {
            return;
        }

        this._rol = rol;
        this._config = config;

        const paginaActual = window.location.pathname.split("/").pop().replace(/^$/, "index.html");

        // Tecnico trabaja sobre todo dentro de una sola pantalla (cola de
        // trabajo) — para el el sidebar arranca colapsado a solo-iconos por
        // defecto, salvo que ya haya elegido expandirlo a mano (persistido en
        // localStorage). Administrador y Cliente navegan mas entre secciones,
        // asi que mantienen el sidebar completo siempre (Fase 4, redisenio
        // estructural por rol). Recepcionista arranco en este grupo cuando
        // tenia un solo link (el wizard); con panel + wizard (Fase 8) ya
        // navega entre pantallas igual que Administrador, asi que se saca de
        // aca.
        const colapsablePorRol = rol === "Tecnico";
        const prefColapsado = localStorage.getItem("sidebarColapsado");
        const colapsado = colapsablePorRol && (prefColapsado === null ? true : prefColapsado === "1");

        const links = config.links.map(link => {
            const activo = link.href === paginaActual;
            return `
                <a class="sidebar-link ${activo ? "active" : ""}" href="${link.href}" title="${link.label}" ${activo ? 'aria-current="page"' : ""}>
                    <i class="bi ${link.icono}"></i>
                    <span>${link.label}</span>
                </a>
            `;
        }).join("");

        contenedor.outerHTML = `
            <aside class="sidebar ${colapsado ? "collapsed" : ""}" id="sidebar-placeholder">
                <a class="sidebar-brand" href="${config.marca.href}">
                    <i class="bi ${config.marca.icono}"></i>
                    <span>${config.marca.texto}</span>
                </a>

                <nav class="sidebar-nav" aria-label="Navegación principal">
                    ${links}
                </nav>

                <div class="sidebar-footer">
                    <a class="sidebar-link" href="perfil.html" title="${rol}">
                        <span class="sidebar-avatar" id="sidebarAvatar"></span>
                        <span class="sidebar-user-info">
                            <span class="sidebar-user-name" id="nombreUsuario"></span>
                            <span class="sidebar-user-role">${rol}</span>
                        </span>
                    </a>
                    <div class="sidebar-actions">
                        <div class="position-relative">
                            <button class="theme-toggle position-relative" id="btnNotificaciones" type="button"
                                aria-expanded="false" aria-haspopup="true"
                                title="Notificaciones" aria-label="Notificaciones">
                                <i class="bi bi-bell"></i>
                                <span class="badge rounded-pill bg-danger notif-count d-none" id="badgeNotificaciones"></span>
                            </button>
                            <div class="notif-panel" id="listaNotificaciones">
                                <div class="notif-panel-header d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
                                    <span class="small fw-semibold">Notificaciones</span>
                                    <button type="button" class="btn btn-link btn-sm p-0 small" id="btnMarcarTodasLeidas">
                                        Marcar todas leídas
                                    </button>
                                </div>
                                <div id="listaNotificacionesItems">
                                    <div class="p-3 text-muted small">Cargando...</div>
                                </div>
                            </div>
                        </div>
                        <button class="theme-toggle" id="btnTemaToggle" type="button"
                            title="Cambiar tema" aria-label="Cambiar a tema claro u oscuro">
                            <i class="bi" id="iconoTema"></i>
                        </button>
                        ${colapsablePorRol ? `
                        <button class="theme-toggle" id="btnColapsarSidebar" type="button"
                            title="Expandir o colapsar el menú" aria-label="Expandir o colapsar el menú">
                            <i class="bi ${colapsado ? "bi-chevron-right" : "bi-chevron-left"}" id="iconoColapsar"></i>
                        </button>
                        ` : ""}
                        <a class="sidebar-link sidebar-link-danger" href="#" id="btnCerrarSesion" title="Cerrar sesión">
                            <i class="bi bi-box-arrow-right"></i>
                            <span>Cerrar sesión</span>
                        </a>
                    </div>
                </div>
            </aside>
        `;

        document.getElementById("sidebarAvatar").textContent = iniciales(usuario.nombre, usuario.apellido);

        if (colapsablePorRol) {
            const btnColapsar = document.getElementById("btnColapsarSidebar");
            const iconoColapsar = document.getElementById("iconoColapsar");
            btnColapsar.addEventListener("click", () => {
                const aside = document.querySelector(".sidebar");
                const ahoraColapsado = !aside.classList.contains("collapsed");
                aside.classList.toggle("collapsed", ahoraColapsado);
                localStorage.setItem("sidebarColapsado", ahoraColapsado ? "1" : "0");
                iconoColapsar.className = `bi ${ahoraColapsado ? "bi-chevron-right" : "bi-chevron-left"}`;
            });
        }

        document.getElementById("btnCerrarSesion").addEventListener("click", async (event) => {
            event.preventDefault();
            const ok = await UI.confirmar("¿Desea cerrar la sesión?", {
                titulo: "Cerrar sesión", textoConfirmar: "Sí, salir", claseConfirmar: "btn-primary"
            });
            if (ok) {
                Auth.logout();
            }
        });

        const iconoTema = document.getElementById("iconoTema");
        const actualizarIconoTema = () => {
            iconoTema.className = `bi ${Theme.efectivo() === "dark" ? "bi-sun-fill" : "bi-moon-stars-fill"}`;
        };
        actualizarIconoTema();
        document.getElementById("btnTemaToggle").addEventListener("click", () => {
            Theme.alternar();
            actualizarIconoTema();
        });

        inicializarPanelNotificaciones();
        cargarNotificaciones();

        // No hay websockets en este proyecto — un poll liviano es el punto
        // medio pragmatico para "tiempo real sin recargar": la campanita se
        // pone al dia sola cada 45s en vez de solo al navegar entre paginas.
        setInterval(cargarNotificaciones, 45000);
    },

    renderTopbarMobile(rol) {
        const contenedor = document.getElementById("topbar-mobile-placeholder");
        const config = NAV_POR_ROL[rol];

        if (!contenedor || !config) {
            return;
        }

        contenedor.outerHTML = `
            <header class="topbar-mobile" id="topbar-mobile-placeholder">
                <button class="topbar-menu-btn" id="btnAbrirSidebar" type="button" aria-label="Abrir menú" aria-expanded="false">
                    <i class="bi bi-list"></i>
                </button>
                <span class="topbar-brand"><i class="bi ${config.marca.icono}"></i> ${config.marca.texto}</span>
                <span></span>
            </header>
            <div class="sidebar-backdrop" id="sidebarBackdrop"></div>
        `;

        const sidebar = document.querySelector(".sidebar");
        const backdrop = document.getElementById("sidebarBackdrop");
        const btnAbrir = document.getElementById("btnAbrirSidebar");

        // Mientras el drawer esta abierto, Tab no debe poder salir de el
        // hacia el contenido detras del backdrop (trampa de foco basica:
        // ciclar entre el primer y ultimo elemento enfocable).
        const atraparFoco = (e) => {
            if (e.key !== "Tab" || !sidebar.classList.contains("open")) {
                return;
            }
            const enfocables = sidebar.querySelectorAll("a, button");
            if (enfocables.length === 0) {
                return;
            }
            const primero = enfocables[0];
            const ultimo = enfocables[enfocables.length - 1];

            if (e.shiftKey && document.activeElement === primero) {
                e.preventDefault();
                ultimo.focus();
            } else if (!e.shiftKey && document.activeElement === ultimo) {
                e.preventDefault();
                primero.focus();
            }
        };

        const abrir = () => {
            sidebar.classList.add("open");
            backdrop.classList.add("show");
            btnAbrir.setAttribute("aria-expanded", "true");
            const primerLink = sidebar.querySelector("a");
            if (primerLink) {
                primerLink.focus();
            }
        };
        const cerrar = () => {
            sidebar.classList.remove("open");
            backdrop.classList.remove("show");
            btnAbrir.setAttribute("aria-expanded", "false");
            btnAbrir.focus();
        };

        btnAbrir.addEventListener("click", abrir);
        backdrop.addEventListener("click", cerrar);
        sidebar.querySelectorAll("a").forEach(a => a.addEventListener("click", cerrar));
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && sidebar.classList.contains("open")) {
                cerrar();
            }
        });
        document.addEventListener("keydown", atraparFoco);
    },

    // Barra superior fija de escritorio (oculta bajo 992px, ver style.css —
    // en mobile el acceso sigue siendo el drawer de renderTopbarMobile).
    // titulo sale de data-footer del <body>, que ya existe en la mayoria de
    // las paginas para el pie — no se agrega un atributo nuevo solo para esto.
    renderTopbarDesktop(rol, tituloPagina) {
        const contenedor = document.getElementById("topbar-desktop-placeholder");
        if (!contenedor) {
            return;
        }

        contenedor.outerHTML = `
            <header class="topbar-desktop" id="topbar-desktop-placeholder">
                <span class="topbar-titulo">${tituloPagina}</span>
                <div class="topbar-buscador-wrap position-relative">
                    <div class="input-group input-group-sm">
                        <span class="input-group-text"><i class="bi bi-search"></i></span>
                        <label class="visually-hidden" for="buscadorGlobal">Buscar en todo el sistema</label>
                        <input type="text" id="buscadorGlobal" class="form-control" autocomplete="off"
                            placeholder="Buscar ticket, cliente, documento, teléfono..."
                            role="combobox" aria-expanded="false" aria-autocomplete="list"
                            aria-controls="panelBuscadorGlobal">
                    </div>
                    <div class="typeahead-panel d-none" id="panelBuscadorGlobal" role="listbox" aria-label="Resultados de búsqueda"></div>
                </div>
            </header>
        `;

        this._inicializarBusquedaGlobal(rol);
    },

    // La carga de datos es perezosa (recien al primer foco/tecla, no al
    // cargar la pagina) para no sumarle una peticion mas a cada carga de
    // pantalla solo por si el usuario llega a usar el buscador. Cliente
    // busca solo sobre sus propios tickets (/ticket/mis, lo unico que su rol
    // puede pedir); el resto busca sobre todos los tickets + telefono/
    // documento del cliente (cruzado con /usuarios, tambien ya permitido).
    _cacheBusquedaGlobal: null,

    async _cargarCacheBusquedaGlobal(rol) {
        if (this._cacheBusquedaGlobal) {
            return this._cacheBusquedaGlobal;
        }
        try {
            if (rol === "Cliente") {
                const tickets = await apiFetch("/ticket/mis");
                this._cacheBusquedaGlobal = tickets;
            } else {
                const [tickets, usuarios] = await Promise.all([
                    apiFetch("/ticket"),
                    apiFetch("/usuarios").catch(() => [])
                ]);
                const usuariosPorId = new Map(usuarios.map(u => [u.id_usuario, u]));
                this._cacheBusquedaGlobal = tickets.map(t => {
                    const u = usuariosPorId.get(t.id_usuario);
                    return {
                        ...t,
                        cliente_telefono: u?.telefono || "",
                        cliente_documento: u?.num_documento || "",
                        cliente_correo: u?.correo || ""
                    };
                });
            }
        } catch (error) {
            this._cacheBusquedaGlobal = [];
        }
        return this._cacheBusquedaGlobal;
    },

    _inicializarBusquedaGlobal(rol) {
        const input = document.getElementById("buscadorGlobal");
        const panel = document.getElementById("panelBuscadorGlobal");
        if (!input || !panel) {
            return;
        }

        let indiceResaltado = -1;
        let temporizador = null;

        const paginaDestino = rol === "Cliente" ? "ticket-cliente.html" : "detalle-ticket.html";

        const cerrar = () => {
            panel.classList.add("d-none");
            panel.innerHTML = "";
            input.setAttribute("aria-expanded", "false");
            input.removeAttribute("aria-activedescendant");
            indiceResaltado = -1;
        };

        const marcarResaltado = (items) => {
            items.forEach((item, indice) => item.classList.toggle("resaltado", indice === indiceResaltado));
            const activo = items[indiceResaltado];
            if (activo) {
                activo.scrollIntoView({ block: "nearest" });
                input.setAttribute("aria-activedescendant", activo.id);
            } else {
                input.removeAttribute("aria-activedescendant");
            }
        };

        const buscar = async (termino) => {
            if (!termino) {
                cerrar();
                return;
            }

            const datos = await this._cargarCacheBusquedaGlobal(rol);
            const campos = ["titulo", "cliente", "cliente_telefono", "cliente_documento", "cliente_correo", t => Codigos.ticket(t)];
            const encontrados = Search.filtrar(datos, termino, campos).slice(0, 8);

            indiceResaltado = -1;

            if (encontrados.length === 0) {
                panel.innerHTML = `<div class="p-3 text-muted small">Ningún resultado para "${termino}".</div>`;
            } else {
                panel.innerHTML = encontrados.map((t, indice) => `
                    <button type="button" class="typeahead-item" id="busquedaGlobalItem${indice}" role="option" data-id="${t.id_ticket}">
                        <span class="codigo">${Codigos.ticket(t)}</span>
                        <div class="small fw-semibold">${t.titulo}</div>
                        <div class="text-muted small">${t.cliente}</div>
                    </button>
                `).join("");

                panel.querySelectorAll(".typeahead-item").forEach(item => {
                    item.addEventListener("click", () => {
                        window.location.href = `${paginaDestino}?id=${item.dataset.id}`;
                    });
                });
            }

            panel.classList.remove("d-none");
            input.setAttribute("aria-expanded", "true");
        };

        input.addEventListener("input", () => {
            clearTimeout(temporizador);
            temporizador = setTimeout(() => buscar(input.value.trim()), 250);
        });

        input.addEventListener("keydown", (evento) => {
            const items = [...panel.querySelectorAll(".typeahead-item")];
            if (panel.classList.contains("d-none") || items.length === 0) {
                return;
            }
            if (evento.key === "ArrowDown") {
                evento.preventDefault();
                indiceResaltado = Math.min(indiceResaltado + 1, items.length - 1);
                marcarResaltado(items);
            } else if (evento.key === "ArrowUp") {
                evento.preventDefault();
                indiceResaltado = Math.max(indiceResaltado - 1, 0);
                marcarResaltado(items);
            } else if (evento.key === "Enter") {
                if (indiceResaltado >= 0) {
                    evento.preventDefault();
                    items[indiceResaltado].click();
                }
            } else if (evento.key === "Escape") {
                cerrar();
            }
        });

        document.addEventListener("click", (evento) => {
            if (!panel.classList.contains("d-none") && !panel.contains(evento.target) && evento.target !== input) {
                cerrar();
            }
        });
    },

    renderFooter(texto) {
        const contenedor = document.getElementById("footer-placeholder");

        if (!contenedor) {
            return;
        }

        contenedor.outerHTML = `
            <footer class="app-footer" id="footer-placeholder">
                © 2026 ITDESK | ${texto}
            </footer>
        `;
    },

    init() {
        const body = document.body;
        const atributo = body.dataset.protegido;

        if (!atributo) {
            return;
        }

        const rolesPermitidos = atributo.split(",").map(rol => rol.trim());
        const usuario = Auth.requerirRol(...rolesPermitidos);

        if (!usuario) {
            return;
        }

        // Modo embebido (?embed=1): la pagina se carga dentro de un <iframe>
        // (panel de detalle del tecnico, ver tecnico.js) — se salta el
        // sidebar/topbar/footer para no duplicar el chrome de la app adentro
        // del panel. La autenticacion de arriba corre igual sin excepcion.
        if (new URLSearchParams(window.location.search).get("embed") === "1") {
            body.classList.add("modo-embebido");
            return;
        }

        this.renderSidebar(usuario.rol, usuario);
        this.renderTopbarMobile(usuario.rol);
        this.renderTopbarDesktop(usuario.rol, body.dataset.footer || "ITDESK");
        this.renderFooter(body.dataset.footer || "Sistema de Gestión de Soporte Técnico");

        const nombreCompleto = `${usuario.nombre} ${usuario.apellido || ""}`.trim();

        // #nombreUsuario vive dentro del sidebar (lo acaba de crear renderSidebar);
        // #saludoUsuario es el "Bienvenido, X" propio de cada dashboard.
        const nombreEl = document.getElementById("nombreUsuario");
        if (nombreEl) {
            nombreEl.textContent = nombreCompleto;
        }

        const saludoEl = document.getElementById("saludoUsuario");
        if (saludoEl) {
            saludoEl.textContent = nombreCompleto;
        }
    }
};

document.addEventListener("DOMContentLoaded", () => Layout.init());
