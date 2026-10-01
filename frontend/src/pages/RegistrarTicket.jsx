import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SelectorCliente from "../components/SelectorCliente";
import SelectorEquipo from "../components/SelectorEquipo";
import "./RegistrarTicket.css";

const Paso = ({ numero, titulo, activo, children }) => (
    <section className={`tarjeta registro-paso${activo ? "" : " inactivo"}`} aria-label={titulo}>
        <h2>
            <span className="registro-numero">{numero}</span>
            {titulo}
        </h2>
        {activo ? children : <p className="registro-ayuda">Completa el paso anterior.</p>}
    </section>
);

// Registro de un ticket desde Recepcion, despues de que el cliente reporta
// el problema en persona: cliente, equipo y datos del ticket con su tecnico.
export default function RegistrarTicket() {
    const { sesion } = useAuth();
    const { token } = sesion;

    const [cliente, setCliente] = useState(null);
    const [equipo, setEquipo] = useState(null);

    // otro cliente: el equipo elegido ya no corresponde
    const elegirCliente = (nuevo) => {
        setCliente(nuevo);
        setEquipo(null);
    };

    return (
        <div className="pagina registro-pagina">
            <Link to="/tickets" className="detalle-volver">← Volver a tickets</Link>

            <div className="pagina-cabecera">
                <h1>Registrar ticket</h1>
                <p>Para un cliente que trae su equipo o reporta un problema en el taller.</p>
            </div>

            <Paso numero={1} titulo="Cliente" activo>
                <SelectorCliente token={token} cliente={cliente} onSeleccionar={elegirCliente} />
            </Paso>

            <Paso numero={2} titulo="Equipo" activo={Boolean(cliente)}>
                {cliente && (
                    <SelectorEquipo
                        key={cliente.id_usuario}
                        token={token}
                        cliente={cliente}
                        equipo={equipo}
                        onSeleccionar={setEquipo}
                    />
                )}
            </Paso>
        </div>
    );
}
