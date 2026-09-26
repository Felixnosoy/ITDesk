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
// que el backend reconoce.
const SELECTORES = [
    { campo: "estado", titulo: "Estado", todos: "Todos los estados", valores: ESTADOS_TICKET, etiquetas: ETIQUETA_ESTADO },
    { campo: "categoria", titulo: "Categoría", todos: "Todas las categorías", valores: CATEGORIAS, etiquetas: ETIQUETA_CATEGORIA },
    { campo: "prioridad", titulo: "Prioridad", todos: "Todas las prioridades", valores: PRIORIDADES, etiquetas: ETIQUETA_PRIORIDAD },
];

// Panel de busqueda y filtros del listado de tickets. Es controlado: la
// pantalla guarda los valores y decide si filtra en el navegador o si los
// manda como parametros al backend.
export default function FiltrosTickets({ valores, onCambiar }) {
    const hayFiltros = Object.values(valores).some((valor) => valor !== "");
    const cambiar = (campo, valor) => onCambiar({ ...valores, [campo]: valor });

    return (
        <div className="filtros-tickets">
            <div className="campo filtros-busqueda">
                <label htmlFor="filtro-busqueda">Buscar</label>
                <input
                    id="filtro-busqueda"
                    type="search"
                    placeholder="Código, cliente o equipo"
                    value={valores.busqueda}
                    onChange={(e) => cambiar("busqueda", e.target.value)}
                />
            </div>

            {SELECTORES.map(({ campo, titulo, todos, valores: catalogo, etiquetas }) => (
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
