import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../constants/roles";
import { PRIORIDADES, CATEGORIAS, ETIQUETA_PRIORIDAD, ETIQUETA_CATEGORIA } from "../constants/tickets";
import { listarUsuarios } from "../api/usuarios";
import { crearTicket } from "../api/tickets";
import { codigoTicket } from "../utils/formato";
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
    const navegar = useNavigate();

    const [cliente, setCliente] = useState(null);
    const [equipo, setEquipo] = useState(null);
    const [datos, setDatos] = useState({ titulo: "", descripcion: "", prioridad: "", categoria: "", id_tecnico: "" });
    const [tecnicos, setTecnicos] = useState(null);
    const [errorTecnicos, setErrorTecnicos] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");

    // tecnicos activos a los que se puede asignar el ticket
    useEffect(() => {
        let vigente = true;

        listarUsuarios(token)
            .then((usuarios) => {
                if (!vigente) return;
                setTecnicos(usuarios.filter((u) => u.rol === ROLES.TECNICO && u.estado === "Activo"));
            })
            .catch((err) => {
                if (vigente) setErrorTecnicos(err.message);
            });

        return () => {
            vigente = false;
        };
    }, [token]);

    const cambiar = (campo) => (evento) => setDatos({ ...datos, [campo]: evento.target.value });

    const registrar = async (evento) => {
        evento.preventDefault();
        setGuardando(true);
        setError("");

        try {
            const ticket = await crearTicket(token, {
                ...datos,
                id_cliente: cliente.id_usuario,
                id_equipo: equipo.id_equipo,
                id_tecnico: Number(datos.id_tecnico),
            });

            navegar(`/tickets/${ticket.id_ticket}`, {
                state: { aviso: `Ticket ${codigoTicket(ticket.id_ticket)} registrado y asignado a ${ticket.tecnico}.` },
            });
        } catch (err) {
            setError(err.message);
            setGuardando(false);
        }
    };

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

            <Paso numero={3} titulo="Problema y técnico" activo={Boolean(cliente && equipo)}>
                <form onSubmit={registrar}>
                    {error && (
                        <div className="aviso aviso-error" role="alert">
                            {error}
                        </div>
                    )}
                    <div className="campo">
                        <label htmlFor="tk-titulo">Título</label>
                        <input
                            id="tk-titulo"
                            value={datos.titulo}
                            onChange={cambiar("titulo")}
                            maxLength={150}
                            placeholder="Resumen corto del problema"
                            required
                        />
                    </div>
                    <div className="campo">
                        <label htmlFor="tk-descripcion">Descripción</label>
                        <textarea
                            id="tk-descripcion"
                            rows={4}
                            value={datos.descripcion}
                            onChange={cambiar("descripcion")}
                            placeholder="Lo que cuenta el cliente: qué pasa, desde cuándo y qué ya intentó."
                            required
                        />
                    </div>
                    <div className="registro-campos">
                        <div className="campo">
                            <label htmlFor="tk-prioridad">Prioridad</label>
                            <select id="tk-prioridad" value={datos.prioridad} onChange={cambiar("prioridad")} required>
                                <option value="">Elegir...</option>
                                {Object.values(PRIORIDADES).map((p) => (
                                    <option key={p} value={p}>
                                        {ETIQUETA_PRIORIDAD[p]}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="campo">
                            <label htmlFor="tk-categoria">Categoría</label>
                            <select id="tk-categoria" value={datos.categoria} onChange={cambiar("categoria")} required>
                                <option value="">Elegir...</option>
                                {Object.values(CATEGORIAS).map((c) => (
                                    <option key={c} value={c}>
                                        {ETIQUETA_CATEGORIA[c]}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="campo">
                        <label htmlFor="tk-tecnico">Técnico asignado</label>
                        {errorTecnicos ? (
                            <div className="aviso aviso-error" role="alert">
                                {errorTecnicos}
                            </div>
                        ) : (
                            <select
                                id="tk-tecnico"
                                value={datos.id_tecnico}
                                onChange={cambiar("id_tecnico")}
                                disabled={!tecnicos}
                                required
                            >
                                <option value="">{tecnicos ? "Elegir técnico..." : "Cargando técnicos..."}</option>
                                {tecnicos?.map((t) => (
                                    <option key={t.id_usuario} value={t.id_usuario}>
                                        {t.nombre} {t.apellido}
                                        {t.especialidad ? ` · ${t.especialidad}` : ""}
                                    </option>
                                ))}
                            </select>
                        )}
                        <span className="campo-ayuda">Un ticket no se registra sin un técnico responsable.</span>
                    </div>
                    <div className="modal-acciones">
                        <button type="submit" className="boton" disabled={guardando}>
                            {guardando ? "Registrando..." : "Registrar ticket"}
                        </button>
                    </div>
                </form>
            </Paso>
        </div>
    );
}
