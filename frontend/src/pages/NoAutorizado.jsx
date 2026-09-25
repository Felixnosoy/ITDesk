import { Link } from "react-router-dom";

export default function NoAutorizado() {
    return (
        <div className="pagina">
            <div className="tarjeta">
                <h1>No tienes permiso para ver esta página</h1>
                <p>Tu rol no tiene acceso a esta sección.</p>
                <Link to="/">Volver al inicio</Link>
            </div>
        </div>
    );
}
