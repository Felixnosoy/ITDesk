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
        marca: { href: "recepcion.html", texto: "ITDESK", icono: "bi-person-workspace" },
        links: [
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
                <span class="small ${n.leida ? "" : "fw-semibold"}">${n.tipo}</span>
                ${n.leida ? "" : `<span class="rounded-circle flex-shrink-0" style="width:8px;height:8px;background:var(--accent-600);margin-top:4px;"></span>`}
            </div>
            <div class="small ${n.leida ? "text-muted" : ""}">${n.mensaje}</div>
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

        const links = config.links.map(link => {
            const activo = link.href === paginaActual;
            return `
                <a class="sidebar-link ${activo ? "active" : ""}" href="${link.href}" ${activo ? 'aria-current="page"' : ""}>
                    <i class="bi ${link.icono}"></i>
                    <span>${link.label}</span>
                </a>
            `;
        }).join("");

        contenedor.outerHTML = `
            <aside class="sidebar" id="sidebar-placeholder">
                <a class="sidebar-brand" href="${config.marca.href}">
                    <i class="bi ${config.marca.icono}"></i>
                    <span>${config.marca.texto}</span>
                </a>

                <nav class="sidebar-nav" aria-label="Navegación principal">
                    ${links}
                </nav>

                <div class="sidebar-footer">
                    <a class="sidebar-link" href="perfil.html">
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
                                <span class="badge rounded-pill bg-danger d-none" id="badgeNotificaciones"
                                    style="position:absolute; top:-2px; right:-2px; font-size:.6rem;"></span>
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
                        <a class="sidebar-link sidebar-link-danger" href="#" id="btnCerrarSesion">
                            <i class="bi bi-box-arrow-right"></i>
                            <span>Cerrar sesión</span>
                        </a>
                    </div>
                </div>
            </aside>
        `;

        document.getElementById("sidebarAvatar").textContent = iniciales(usuario.nombre, usuario.apellido);

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

        this.renderSidebar(usuario.rol, usuario);
        this.renderTopbarMobile(usuario.rol);
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
