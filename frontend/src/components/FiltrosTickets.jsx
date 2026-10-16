import {
    ESTADOS_TICKET,
    PRIORIDADES,
    CATEGORIAS,
    ETIQUETA_ESTADO,
    ETIQUETA_PRIORIDAD,
    ETIQUETA_CATEGORIA,
    FILTROS_VACIOS,
} from "../constants/tickets";
import "./FiltrosTickets.css";

// Cada selector sale del catalogo, asi el filtro solo puede mandar valores
// que el backend reconoce. La opcion vacia es corta porque la etiqueta ya
// dice que se filtra.
const SELECTORES = [
    { campo: "estado", titulo: "Estado", todos: "Todos", valores: ESTADOS_TICKET, etiquetas: ETIQUETA_ESTADO },
    { campo: "categoria", titulo: "Categoría", todos: "Todas", valores: CATEGORIAS, etiquetas: ETIQUETA_CATEGORIA },
    { campo: "prioridad", titulo: "Prioridad", todos: "Todas", valores: PRIORIDADES, etiquetas: ETIQUETA_PRIORIDAD },
];

// Panel de busqueda y filtros del listado de tickets. Es controlado: la
// pantalla guarda los valores y decide si filtra en el navegador o si los
// manda como parametros al backend.
// El cliente no filtra por prioridad (no la ve) ni busca por cliente.
export default function FiltrosTickets({ valores, onCambiar, esCliente = false }) {
    const selectores = esCliente ? SELECTORES.filter((s) => s.campo !== "prioridad") : SELECTORES;
    const hayFiltros = Object.values(valores).some((valor) => valor !== "");
    const cambiar = (campo, valor) => onCambiar({ ...valores, [campo]: valor });

    return (
        <div className="filtros-tickets">
            <div className="campo filtros-busqueda">
                <label htmlFor="filtro-busqueda">Buscar</label>
                <input
                    id="filtro-busqueda"
                    type="search"
                    placeholder={esCliente ? "Código, título o equipo" : "Código, cliente o equipo"}
                    value={valores.busqueda}
                    onChange={(e) => cambiar("busqueda", e.target.value)}
                />
            </div>

            {selectores.map(({ campo, titulo, todos, valores: catalogo, etiquetas }) => (
                <div className="campo" key={campo}>
                    <label htmlFor={`filtro-${campo}`}>{titulo}</label>
                    <select
                        id={`filtro-${campo}`}
                        value={valores[campo]}
                        onChange={(e) => cambiar(campo, e.target.value)}
                    >
                        <option value="">{todos}</option>
                        {Object.values(catalogo).map((valor) => (
                            <option key={valor} value={valor}>
                                {etiquetas[valor]}
                            </option>
                        ))}
                    </select>
                </div>
            ))}

            <button
                type="button"
                className="boton boton-secundario filtros-limpiar"
                disabled={!hayFiltros}
                onClick={() => onCambiar(FILTROS_VACIOS)}
            >
                Limpiar filtros
            </button>
        </div>
    );
}
