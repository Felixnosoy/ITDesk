import { useCallback, useEffect, useState } from "react";
import { obtenerDetalle } from "../api/tickets";

// Estado del detalle de un ticket y como cambiarlo: lo carga, sabe que
// formulario o ventana esta abierto (editando) y ejecuta las acciones contra
// el servidor. La pagina solo decide que mostrar.
//
// avisoInicial: el aviso con el que se llega (por ejemplo, desde el registro).
export default function useTicketDetalle(token, id, avisoInicial = "") {
    const [detalle, setDetalle] = useState(null);
    const [error, setError] = useState("");
    const [aviso, setAviso] = useState(avisoInicial);
    // seccion que se esta editando ("diagnostico", "estado"...) y su guardado
    const [editando, setEditando] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [errorAccion, setErrorAccion] = useState("");

    useEffect(() => {
        let vigente = true;

        obtenerDetalle(token, id)
            .then((datos) => {
                if (!vigente) return;
                setDetalle(datos);
                setError("");
            })
            .catch((err) => vigente && setError(err.message));

        return () => {
            vigente = false;
        };
    }, [token, id]);

    // estables (useCallback): los atajos de teclado los usan dentro de un efecto
    const abrirEdicion = useCallback((seccion) => {
        setAviso("");
        setErrorAccion("");
        setEditando(seccion);
    }, []);

    const cerrarEdicion = useCallback(() => setEditando(null), []);

    // Ejecuta una accion contra el servidor y vuelve a pedir el detalle antes
    // de avisar, asi el aviso nunca aparece junto a datos viejos. Si falla deja
    // el formulario abierto con el mensaje del servidor. Devuelve si salio bien.
    const ejecutar = async (accion, mensajeExito) => {
        setGuardando(true);
        setErrorAccion("");

        try {
            await accion();
            setDetalle(await obtenerDetalle(token, id));
            setEditando(null);
            setAviso(mensajeExito);
            return true;
        } catch (err) {
            setErrorAccion(err.message);
            return false;
        } finally {
            setGuardando(false);
        }
    };

    return {
        detalle,
        error,
        aviso,
        cerrarAviso: () => setAviso(""),
        editando,
        abrirEdicion,
        cerrarEdicion,
        guardando,
        errorAccion,
        ejecutar,
    };
}
