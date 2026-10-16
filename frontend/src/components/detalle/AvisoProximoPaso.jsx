import ProgresoCiclo from "../ProgresoCiclo";

// Barra del ciclo y lo que hay que hacer ahora, con su boton principal. Si le
// toca a quien mira, el aviso se destaca con el color del rol.
export default function AvisoProximoPaso({ estado, paso, onAccion }) {
    const { texto, acciones, urgente } = paso;

    return (
        <div className={`tarjeta detalle-paso no-imprimir${urgente ? " detalle-paso-urgente" : ""}`}>
            <ProgresoCiclo estado={estado} />
            <div className="detalle-paso-fila" role={urgente ? "status" : undefined}>
                <div>
                    <span className="detalle-paso-titulo">{urgente ? "Te toca" : "Próximo paso"}</span>
                    <p>{texto}</p>
                </div>
                {acciones.length > 0 && (
                    <div className="detalle-paso-acciones">
                        {acciones.map((accion) => (
                            <button
                                key={accion.abrir}
                                type="button"
                                className={`boton${accion.secundaria ? " boton-secundario" : ""}`}
                                onClick={() => onAccion(accion.abrir)}
                            >
                                {accion.etiqueta}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
