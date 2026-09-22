import { Link } from "react-router-dom";

export default function NoAutorizado() {
    return (
        <div style={{ padding: 32 }}>
            <h1>No tenés permiso para ver esta página</h1>
            <p>Tu rol no tiene acceso a esta sección.</p>
            <Link to="/">Volver al inicio</Link>
        </div>
    );
}
