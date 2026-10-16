import "./Esqueleto.css";

// Siluetas grises con la forma de lo que va a aparecer, en vez de un texto
// "Cargando...": la pagina no salta cuando llegan los datos y se entiende
// que viene. Para el lector de pantalla se anuncia una sola vez con
// role="status".

export function Linea({ ancho = "100%", alto = "1em" }) {
    return <span className="esqueleto-linea" style={{ width: ancho, height: alto }} aria-hidden="true" />;
}

function Contenedor({ etiqueta, className, children }) {
    return (
        <div className={className} role="status" aria-busy="true">
            <span className="esqueleto-anuncio">{etiqueta}</span>
            {children}
        </div>
    );
}

// tabla: una fila de encabezado y filas con lineas de distinto largo
export function EsqueletoTabla({ filas = 6, columnas = 6, etiqueta = "Cargando el listado" }) {
    const anchos = ["40%", "80%", "65%", "55%", "45%", "70%", "50%"];

    return (
        <Contenedor etiqueta={etiqueta} className="esqueleto-tabla">
            {Array.from({ length: filas }, (_, fila) => (
                <div key={fila} className="esqueleto-fila" style={{ gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))` }}>
                    {Array.from({ length: columnas }, (_, columna) => (
                        <Linea key={columna} ancho={anchos[(fila + columna) % anchos.length]} />
                    ))}
                </div>
            ))}
        </Contenedor>
    );
}

// tarjetas: indicadores del inicio o equipos del cliente
export function EsqueletoTarjetas({ cantidad = 4, alto = "88px", etiqueta = "Cargando" }) {
    return (
        <Contenedor etiqueta={etiqueta} className="esqueleto-tarjetas">
            {Array.from({ length: cantidad }, (_, i) => (
                <div key={i} className="tarjeta esqueleto-tarjeta" style={{ minHeight: alto }}>
                    <Linea ancho="45%" />
                    <Linea ancho="30%" alto="1.8em" />
                </div>
            ))}
        </Contenedor>
    );
}

// detalle de un ticket: cabecera, aviso del paso y dos columnas
export function EsqueletoDetalle() {
    return (
        <Contenedor etiqueta="Cargando el ticket" className="esqueleto-detalle">
            <Linea ancho="90px" />
            <Linea ancho="45%" alto="2em" />
            <div className="tarjeta esqueleto-bloque" style={{ minHeight: "120px" }}>
                <Linea />
                <Linea ancho="60%" />
            </div>
            <div className="esqueleto-columnas">
                <div className="tarjeta esqueleto-bloque" style={{ minHeight: "280px" }}>
                    <Linea ancho="35%" alto="1.4em" />
                    <Linea />
                    <Linea ancho="85%" />
                    <Linea ancho="70%" />
                </div>
                <div className="tarjeta esqueleto-bloque" style={{ minHeight: "200px" }}>
                    <Linea ancho="50%" alto="1.4em" />
                    <Linea ancho="80%" />
                    <Linea ancho="60%" />
                </div>
            </div>
        </Contenedor>
    );
}

// formulario de una tarjeta: titulo y campos
export function EsqueletoFormulario({ campos = 3, etiqueta = "Cargando" }) {
    return (
        <Contenedor etiqueta={etiqueta} className="tarjeta esqueleto-bloque">
            <Linea ancho="40%" alto="1.4em" />
            {Array.from({ length: campos }, (_, i) => (
                <div key={i} className="esqueleto-campo">
                    <Linea ancho="25%" />
                    <Linea alto="40px" />
                </div>
            ))}
        </Contenedor>
    );
}
