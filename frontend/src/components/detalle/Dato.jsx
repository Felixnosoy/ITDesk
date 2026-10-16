// Un par etiqueta / valor dentro de una lista <dl> del detalle
export default function Dato({ etiqueta, children, ancho = false }) {
    return (
        <div className={`detalle-dato${ancho ? " detalle-dato-ancho" : ""}`}>
            <dt>{etiqueta}</dt>
            <dd>{children}</dd>
        </div>
    );
}
