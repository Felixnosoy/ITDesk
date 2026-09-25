import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ETIQUETA_ROL } from "../constants/roles";
import { PANELES, seccionesParaRol } from "../constants/navegacion";
import "./Panel.css";

// Pantalla de inicio de cada rol: saludo, datos de la sesion y accesos
// directos a las secciones que ese rol puede abrir.
export default function Panel() {
    const { sesion } = useAuth();
    const { usuario } = sesion;
    const panel = PANELES[usuario.rol];
    const accesos = seccionesParaRol(usuario.rol);

    return (
        <div className="pagina">
            <div className="pagina-cabecera">
                <h1>Hola, {usuario.nombre}</h1>
                <p>{panel.resumen}</p>
            </div>

            <section className="tarjeta panel-cuenta" aria-label="Datos de la sesión">
                <div>
                    <span className="panel-etiqueta">Panel</span>
                    <strong>{panel.titulo}</strong>
                </div>
                <div>
                    <span className="panel-etiqueta">Rol</span>
                    <strong>{ETIQUETA_ROL[usuario.rol] ?? usuario.rol}</strong>
                </div>
                <div>
                    <span className="panel-etiqueta">Correo</span>
                    <strong>{usuario.correo}</strong>
                </div>
            </section>

            {accesos.length > 0 && (
                <>
                    <h2 className="panel-subtitulo">Accesos rápidos</h2>
                    <div className="panel-accesos">
                        {accesos.map((acceso) => (
                            <Link key={acceso.ruta} to={acceso.ruta} className="tarjeta panel-acceso">
                                <strong>{acceso.etiqueta}</strong>
                                <span>{acceso.descripcion}</span>
                            </Link>
                        ))}
                    </div>
                </>
            )}

            <h2 className="panel-subtitulo">Próximamente</h2>
            <ul className="panel-proximamente">
                {panel.proximamente.map((item) => (
                    <li key={item}>{item}</li>
                ))}
            </ul>
        </div>
    );
}
