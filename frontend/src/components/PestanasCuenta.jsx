import { NavLink } from "react-router-dom";
import "./PestanasCuenta.css";

// Perfil y contrasena son dos partes de la misma cuenta: van como pestanas
// de "Mi cuenta" en vez de ocupar dos lugares en el menu principal, que
// queda solo para el trabajo del taller. Son enlaces (cada una tiene su
// direccion) y NavLink marca la actual con aria-current.
const PESTANAS = [
    { ruta: "/perfil", etiqueta: "Datos personales" },
    { ruta: "/cambiar-contrasena", etiqueta: "Contraseña" },
];

export default function PestanasCuenta() {
    return (
        <>
            <div className="pagina-cabecera cuenta-cabecera">
                <h1>Mi cuenta</h1>
                <p>Tus datos de contacto y la contraseña con la que entras al sistema.</p>
            </div>
            <nav className="cuenta-pestanas" aria-label="Secciones de la cuenta">
                {PESTANAS.map((pestana) => (
                    <NavLink key={pestana.ruta} to={pestana.ruta} end className="cuenta-pestana">
                        {pestana.etiqueta}
                    </NavLink>
                ))}
            </nav>
        </>
    );
}
