import "./TablaOrdenable.css";

const ARIA_SORT = { asc: "ascending", desc: "descending" };

// Tabla cuyas columnas se ordenan al hacer clic en el encabezado. No guarda
// estado propio: recibe el orden actual y avisa con onOrdenar, asi la misma
// tabla sirve si el orden lo resuelve el navegador o el backend.
//
// columnas: [{ clave, titulo, ordenable?, render?(fila), valorOrden?(fila) }]
export default function TablaOrdenable({
    columnas,
    filas,
    claveFila,
    orden,
    onOrdenar,
    textoVacio = "No hay resultados.",
}) {
    return (
        <div className="tabla-envoltorio">
            <table className="tabla">
                <thead>
                    <tr>
                        {columnas.map((columna) => {
                            const ordenable = columna.ordenable !== false;
                            const activa = orden?.columna === columna.clave;

                            if (!ordenable) {
                                return <th key={columna.clave}>{columna.titulo}</th>;
                            }

                            return (
                                <th
                                    key={columna.clave}
                                    aria-sort={activa ? ARIA_SORT[orden.direccion] : "none"}
                                >
                                    <button
                                        type="button"
                                        className={`tabla-orden${activa ? " tabla-orden-activa" : ""}`}
                                        onClick={() => onOrdenar(columna.clave)}
                                    >
                                        {columna.titulo}
                                        <span className="tabla-flecha" aria-hidden="true">
                                            {activa ? (orden.direccion === "asc" ? "▲" : "▼") : "↕"}
                                        </span>
                                    </button>
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {filas.length === 0 && (
                        <tr>
                            <td colSpan={columnas.length} className="tabla-vacia">
                                {textoVacio}
                            </td>
                        </tr>
                    )}
                    {filas.map((fila) => (
                        <tr key={claveFila(fila)}>
                            {columnas.map((columna) => (
                                <td key={columna.clave}>
                                    {columna.render ? columna.render(fila) : fila[columna.clave]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
