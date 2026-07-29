//========================================
// ITDESK - ORDENAR
//========================================
// Ordenamiento de tablas 100% client-side, mismo criterio que Search: no
// pide nada nuevo al backend, ordena lo que ya esta en memoria. Se conecta
// a los <th data-sort="campo"> de una tabla — un click ordena ascendente,
// un segundo click en la misma columna invierte a descendente, un click en
// otra columna cambia el criterio y vuelve a ascendente.
//
// No decide COMO se re-renderiza la tabla (eso varia demasiado entre
// paginas: unas paginan, otras agrupan filas) — solo avisa por callback
// cual es el campo/direccion activos para que la pagina vuelva a llamar su
// propio pipeline de render (filtrar -> ordenar -> paginar).

const Ordenar = {

    // tabla: el <table> que contiene los <th data-sort="...">.
    // alCambiar(campo, direccion): se llama cada vez que el usuario hace
    // click (o Enter/Espacio) en un encabezado ordenable.
    // Devuelve el objeto de estado {campo, direccion} — la pagina puede
    // leerlo en cualquier momento (ej. despues de una busqueda) para
    // reaplicar el mismo orden sin depender de un nuevo click.
    conectar(tabla, alCambiar) {
        const estado = { campo: null, direccion: "asc" };

        if (!tabla) {
            return estado;
        }

        const encabezados = [...tabla.querySelectorAll("th[data-sort]")];

        const actualizarIndicadores = () => {
            encabezados.forEach(th => {
                th.classList.remove("th-orden-asc", "th-orden-desc");
                th.setAttribute("aria-sort", "none");
                if (th.dataset.sort === estado.campo) {
                    th.classList.add(estado.direccion === "asc" ? "th-orden-asc" : "th-orden-desc");
                    th.setAttribute("aria-sort", estado.direccion === "asc" ? "ascending" : "descending");
                }
            });
        };

        encabezados.forEach(th => {
            th.classList.add("th-ordenable");
            th.tabIndex = 0;
            th.setAttribute("role", "button");
            th.setAttribute("aria-label", `Ordenar por ${th.textContent.trim()}`);

            const activar = () => {
                if (estado.campo === th.dataset.sort) {
                    estado.direccion = estado.direccion === "asc" ? "desc" : "asc";
                } else {
                    estado.campo = th.dataset.sort;
                    estado.direccion = "asc";
                }
                actualizarIndicadores();
                alCambiar(estado.campo, estado.direccion);
            };

            th.addEventListener("click", activar);
            th.addEventListener("keydown", (evento) => {
                if (evento.key === "Enter" || evento.key === " ") {
                    evento.preventDefault();
                    activar();
                }
            });
        });

        return estado;
    },

    // datos: array a ordenar (no lo modifica, devuelve uno nuevo).
    // campo/direccion: los que trae el estado de conectar().
    // extractor (opcional): para columnas donde el valor a comparar no es
    // el campo tal cual (ej. Codigos.ticket(t) en vez de t.id_ticket).
    // Numeros se comparan como numeros; el resto, como texto en español
    // (localeCompare con "numeric" para que "TCK-2" quede antes que "TCK-10").
    aplicar(datos, campo, direccion, extractor) {
        if (!campo) {
            return datos;
        }

        const obtener = extractor || (item => item[campo]);

        return [...datos].sort((a, b) => {
            const va = obtener(a);
            const vb = obtener(b);

            let comparacion;
            if (typeof va === "number" && typeof vb === "number") {
                comparacion = va - vb;
            } else {
                comparacion = String(va ?? "").localeCompare(String(vb ?? ""), "es", { sensitivity: "base", numeric: true });
            }

            return direccion === "asc" ? comparacion : -comparacion;
        });
    }
};
