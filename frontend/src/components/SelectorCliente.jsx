import { useEffect, useState } from "react";
import { buscarClientes } from "../api/tickets";
import { crearUsuario } from "../api/usuarios";
import Modal from "./Modal";
import FormularioUsuario from "./FormularioUsuario";
import { etiquetaDocumento } from "../utils/formato";

const LONGITUD_MINIMA = 2;
const ESPERA_MS = 300;

// Paso 1 del registro: buscar al cliente por nombre, documento o correo o,
// si no existe, darlo de alta sin salir del flujo.
export default function SelectorCliente({ token, cliente, onSeleccionar }) {
    const [texto, setTexto] = useState("");
    // resultados junto con el texto que los pidio, para no mostrar los de
    // una busqueda anterior mientras llega la nueva
    const [busqueda, setBusqueda] = useState({ texto: "", clientes: [], error: "" });
    const [altaAbierta, setAltaAbierta] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [errorAlta, setErrorAlta] = useState("");

    const consulta = texto.trim();

    // busca un momento despues de que se deja de escribir
    useEffect(() => {
        if (consulta.length < LONGITUD_MINIMA) return undefined;

        let vigente = true;
        const espera = setTimeout(() => {
            buscarClientes(token, consulta)
                .then((clientes) => {
                    if (vigente) setBusqueda({ texto: consulta, clientes, error: "" });
                })
                .catch((err) => {
                    if (vigente) setBusqueda({ texto: consulta, clientes: [], error: err.message });
                });
        }, ESPERA_MS);

        return () => {
            vigente = false;
            clearTimeout(espera);
        };
    }, [token, consulta]);

    const darDeAlta = async (datos) => {
        setGuardando(true);
        setErrorAlta("");

        try {
            const nuevo = await crearUsuario(token, datos);
            setAltaAbierta(false);
            onSeleccionar(nuevo);
        } catch (err) {
            setErrorAlta(err.message);
        } finally {
            setGuardando(false);
        }
    };

    if (cliente) {
        return (
            <div className="registro-elegido">
                <div>
                    <strong>
                        {cliente.nombre} {cliente.apellido}
                    </strong>
                    <span>
                        {etiquetaDocumento(cliente.tipo_documento)} {cliente.num_documento} · {cliente.correo}
                    </span>
                </div>
                <button type="button" className="boton boton-chico boton-secundario" onClick={() => onSeleccionar(null)}>
                    Cambiar
                </button>
            </div>
        );
    }

    const listos = busqueda.texto === consulta && consulta.length >= LONGITUD_MINIMA;

    return (
        <>
            <div className="registro-busqueda">
                <div className="campo">
                    <label htmlFor="buscar-cliente">Buscar cliente</label>
                    <input
                        id="buscar-cliente"
                        type="search"
                        autoComplete="off"
                        placeholder="Nombre, documento o correo"
                        value={texto}
                        onChange={(e) => setTexto(e.target.value)}
                    />
                </div>
                <button
                    type="button"
                    className="boton boton-secundario"
                    onClick={() => {
                        setErrorAlta("");
                        setAltaAbierta(true);
                    }}
                >
                    Cliente nuevo
                </button>
            </div>

            {consulta.length > 0 && consulta.length < LONGITUD_MINIMA && (
                <p className="registro-ayuda">Escribe al menos {LONGITUD_MINIMA} caracteres.</p>
            )}
            {consulta.length >= LONGITUD_MINIMA && !listos && <p className="registro-ayuda">Buscando...</p>}
            {listos && busqueda.error && (
                <div className="aviso aviso-error" role="alert">
                    {busqueda.error}
                </div>
            )}
            {listos && !busqueda.error && busqueda.clientes.length === 0 && (
                <p className="registro-ayuda">No hay clientes activos con esos datos. Puedes registrarlo como cliente nuevo.</p>
            )}
            {listos && busqueda.clientes.length > 0 && (
                <ul className="registro-opciones" aria-label="Clientes encontrados">
                    {busqueda.clientes.map((c) => (
                        <li key={c.id_usuario}>
                            <button type="button" onClick={() => onSeleccionar(c)}>
                                <strong>
                                    {c.nombre} {c.apellido}
                                </strong>
                                <span>
                                    {etiquetaDocumento(c.tipo_documento)} {c.num_documento} · {c.correo}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {altaAbierta && (
                <Modal titulo="Cliente nuevo" onCerrar={() => setAltaAbierta(false)}>
                    <FormularioUsuario
                        modo="crear"
                        soloCliente
                        guardando={guardando}
                        error={errorAlta}
                        onGuardar={darDeAlta}
                        onCancelar={() => setAltaAbierta(false)}
                    />
                </Modal>
            )}
        </>
    );
}
