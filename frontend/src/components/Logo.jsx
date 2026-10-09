import "./Logo.css";

// Marca de ITDesk (issue HU27.3): una etiqueta de inventario con su agujero
// y las letras IT, mas el nombre. Toma el color del rol de la sesion; en
// papel (impresion) va en tinta negra para que se lea en blanco y negro.
// tamano: "sm" para el menu, "md" para encabezados, "lg" para el inicio de
// sesion. lema muestra la frase debajo del nombre.
export default function Logo({ tamano = "sm", lema = false, impresion = false }) {
    const clases = ["logo", `logo-${tamano}`];
    if (impresion) clases.push("logo-impresion");

    return (
        <span className={clases.join(" ")}>
            <span className="logo-etiqueta" aria-hidden="true">IT</span>
            <span className="logo-texto">
                <span className="logo-nombre">ITDesk</span>
                {lema && <span className="logo-lema">Tu equipo, en buenas manos</span>}
            </span>
        </span>
    );
}
