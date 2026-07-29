//========================================
// ITDESK - SEARCH
//========================================
// Buscador generico 100% client-side: la API no expone filtros por query
// param, asi que esto filtra sobre un array que ya esta en memoria (ya
// cargado con un GET previo). No hace paginacion ni llama al backend.

const Search = {

    // lista: array de objetos. termino: texto escrito por el usuario.
    // campos: array de nombres de propiedad simples ("titulo") o funciones
    // (item => item.cliente_correo) para armar el texto indexado de cada item.
    filtrar(lista, termino, campos) {
        const termino_normalizado = (termino || "").trim().toLowerCase();

        if (!termino_normalizado) {
            return lista;
        }

        return lista.filter(item => {
            return campos.some(campo => {
                const valor = typeof campo === "function" ? campo(item) : item[campo];
                return String(valor ?? "").toLowerCase().includes(termino_normalizado);
            });
        });
    },

    // Conecta un <input> a una funcion de render, con debounce, sin recargar
    // datos del backend en cada tecla (solo re-filtra lo que ya esta en memoria).
    // idAriaLive (opcional): id de un elemento aria-live donde anunciar
    // cuantos resultados quedaron, para quien use lector de pantalla — solo
    // funciona si onBuscar devuelve la cantidad de resultados (un numero).
    conectar(inputEl, onBuscar, idAriaLive, espera = 250) {
        if (!inputEl) {
            return;
        }

        const elAriaLive = idAriaLive ? document.getElementById(idAriaLive) : null;
        let temporizador = null;

        inputEl.addEventListener("input", () => {
            clearTimeout(temporizador);
            temporizador = setTimeout(() => {
                const cantidad = onBuscar(inputEl.value);
                if (elAriaLive && typeof cantidad === "number") {
                    elAriaLive.textContent = cantidad === 1 ? "1 resultado" : `${cantidad} resultados`;
                }
            }, espera);
        });
    }
};
