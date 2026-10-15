import "./VistasRapidas.css";

// Botones de vista rapida del listado (issue HU30.1). Es controlado: la
// pantalla calcula las cantidades y guarda la vista elegida, asi el numero
// de cada boton coincide siempre con lo que muestra la tabla al elegirla.
export default function VistasRapidas({ vistas, cantidades, activa, onCambiar }) {
    return (
        <div className="vistas-rapidas" role="group" aria-label="Vistas rápidas">
            {vistas.map((vista) => (
                <button
                    key={vista.clave}
                    type="button"
                    className="vista-rapida"
                    aria-pressed={vista.clave === activa}
                    title={vista.descripcion}
                    onClick={() => onCambiar(vista.clave)}
                >
                    {vista.etiqueta}
                    <span className="vista-rapida-cantidad">{cantidades[vista.clave] ?? 0}</span>
                </button>
            ))}
        </div>
    );
}
