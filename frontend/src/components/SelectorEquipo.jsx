import { useEffect, useState } from "react";
import { listarEquipos, crearEquipo } from "../api/tickets";

// sugerencias para el tipo; se puede escribir cualquier otro
const TIPOS_SUGERIDOS = ["Laptop", "Desktop", "Impresora", "Router", "Monitor", "Tablet", "Teléfono"];

const EQUIPO_VACIO = { tipo: "", marca: "", modelo: "", numero_serie: "", observaciones: "" };

const descripcion = (equipo) => `${equipo.tipo} ${equipo.marca} ${equipo.modelo}`;

// Paso 2 del registro: elegir uno de los equipos del cliente o registrar
// uno nuevo a su nombre. Se monta de nuevo (key) al cambiar de cliente.
export default function SelectorEquipo({ token, cliente, equipo, onSeleccionar }) {
    const [equipos, setEquipos] = useState(null);
    const [errorCarga, setErrorCarga] = useState("");
    const [altaAbierta, setAltaAbierta] = useState(false);
    const [nuevo, setNuevo] = useState(EQUIPO_VACIO);
    const [guardando, setGuardando] = useState(false);
    const [errorAlta, setErrorAlta] = useState("");

    useEffect(() => {
        let vigente = true;

        listarEquipos(token, cliente.id_usuario)
            .then((datos) => {
                if (vigente) setEquipos(datos);
            })
            .catch((err) => {
                if (vigente) setErrorCarga(err.message);
            });

        return () => {
            vigente = false;
        };
    }, [token, cliente.id_usuario]);

    const cambiar = (campo) => (evento) => setNuevo({ ...nuevo, [campo]: evento.target.value });

    const registrar = async (evento) => {
        evento.preventDefault();
        setGuardando(true);
        setErrorAlta("");

        try {
            const creado = await crearEquipo(token, { ...nuevo, id_cliente: cliente.id_usuario });
            setEquipos([creado, ...(equipos ?? [])]);
            setNuevo(EQUIPO_VACIO);
            setAltaAbierta(false);
            onSeleccionar(creado);
        } catch (err) {
            setErrorAlta(err.message);
        } finally {
            setGuardando(false);
        }
    };

    if (equipo) {
        return (
            <div className="registro-elegido">
                <div>
                    <strong>{descripcion(equipo)}</strong>
                    <span>Serie {equipo.numero_serie}</span>
                </div>
                <button type="button" className="boton boton-chico boton-secundario" onClick={() => onSeleccionar(null)}>
                    Cambiar
                </button>
            </div>
        );
    }

    if (errorCarga) {
        return (
            <div className="aviso aviso-error" role="alert">
                {errorCarga}
            </div>
        );
    }

    if (!equipos) {
        return <p className="registro-ayuda">Cargando equipos del cliente...</p>;
    }

    // sin equipos registrados, el formulario de alta se muestra de una vez
    const mostrarAlta = altaAbierta || equipos.length === 0;

    return (
        <>
            {equipos.length > 0 && (
                <ul className="registro-opciones" aria-label="Equipos del cliente">
                    {equipos.map((e) => (
                        <li key={e.id_equipo}>
                            <button type="button" onClick={() => onSeleccionar(e)}>
                                <strong>{descripcion(e)}</strong>
                                <span>Serie {e.numero_serie}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {!mostrarAlta && (
                <button type="button" className="boton boton-secundario registro-otro" onClick={() => setAltaAbierta(true)}>
                    Registrar otro equipo
                </button>
            )}

            {mostrarAlta && (
                <form className="registro-alta" onSubmit={registrar}>
                    <h3>{equipos.length === 0 ? "El cliente no tiene equipos registrados" : "Equipo nuevo"}</h3>
                    {errorAlta && (
                        <div className="aviso aviso-error" role="alert">
                            {errorAlta}
                        </div>
                    )}
                    <div className="registro-campos">
                        <div className="campo">
                            <label htmlFor="eq-tipo">Tipo</label>
                            <input id="eq-tipo" list="eq-tipos" value={nuevo.tipo} onChange={cambiar("tipo")} maxLength={50} required />
                            <datalist id="eq-tipos">
                                {TIPOS_SUGERIDOS.map((tipo) => (
                                    <option key={tipo} value={tipo} />
                                ))}
                            </datalist>
                        </div>
                        <div className="campo">
                            <label htmlFor="eq-marca">Marca</label>
                            <input id="eq-marca" value={nuevo.marca} onChange={cambiar("marca")} maxLength={50} required />
                        </div>
                        <div className="campo">
                            <label htmlFor="eq-modelo">Modelo</label>
                            <input id="eq-modelo" value={nuevo.modelo} onChange={cambiar("modelo")} maxLength={50} required />
                        </div>
                        <div className="campo">
                            <label htmlFor="eq-serie">Número de serie</label>
                            <input id="eq-serie" value={nuevo.numero_serie} onChange={cambiar("numero_serie")} maxLength={100} required />
                        </div>
                    </div>
                    <div className="campo">
                        <label htmlFor="eq-observaciones">Observaciones (opcional)</label>
                        <textarea
                            id="eq-observaciones"
                            rows={2}
                            value={nuevo.observaciones}
                            onChange={cambiar("observaciones")}
                            placeholder="Accesorios que deja, golpes visibles..."
                        />
                    </div>
                    <div className="modal-acciones">
                        {equipos.length > 0 && (
                            <button type="button" className="boton boton-secundario" onClick={() => setAltaAbierta(false)}>
                                Cancelar
                            </button>
                        )}
                        <button type="submit" className="boton" disabled={guardando}>
                            {guardando ? "Guardando..." : "Registrar equipo"}
                        </button>
                    </div>
                </form>
            )}
        </>
    );
}
