import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { TODOS_LOS_ROLES, ETIQUETA_ROL } from "../constants/roles";
import {
    listarUsuarios,
    crearUsuario,
    actualizarUsuario,
    cambiarEstadoUsuario,
    resetearContrasena,
} from "../api/usuarios";
import Modal from "../components/Modal";
import FormularioUsuario from "../components/FormularioUsuario";
import "./Usuarios.css";

// mismo minimo que exige el backend (usuario.service.js)
const LONGITUD_MINIMA_CLAVE = 8;

// busqueda sin distinguir mayusculas ni tildes
const normalizar = (texto) =>
    texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");

// Listado de todos los usuarios con busqueda y filtro por rol, y las
// acciones del administrador: crear, editar, desactivar/activar (los usuarios
// no se borran, para no perder el historial) y restablecer la contrasena.
export default function Usuarios() {
    const { sesion } = useAuth();
    const { token } = sesion;

    const [usuarios, setUsuarios] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [errorCarga, setErrorCarga] = useState("");
    const [busqueda, setBusqueda] = useState("");
    const [filtroRol, setFiltroRol] = useState("");
    const [aviso, setAviso] = useState("");

    // ventana abierta: { tipo: "crear" | "editar" | "estado" | "clave", usuario? }
    const [modal, setModal] = useState(null);
    const [errorModal, setErrorModal] = useState("");
    const [guardando, setGuardando] = useState(false);

    const [claveNueva, setClaveNueva] = useState("");
    const [claveConfirmacion, setClaveConfirmacion] = useState("");

    // se incrementa despues de cada cambio para volver a pedir el listado
    const [version, setVersion] = useState(0);

    useEffect(() => {
        let vigente = true;

        listarUsuarios(token)
            .then((datos) => {
                if (!vigente) return;
                setUsuarios(datos);
                setErrorCarga("");
            })
            .catch((err) => {
                if (vigente) setErrorCarga(err.message);
            })
            .finally(() => {
                if (vigente) setCargando(false);
            });

        return () => {
            vigente = false;
        };
    }, [token, version]);

    const visibles = useMemo(() => {
        const texto = normalizar(busqueda.trim());

        return usuarios.filter((u) => {
            if (filtroRol && u.rol !== filtroRol) return false;
            if (!texto) return true;

            return normalizar(`${u.nombre} ${u.apellido} ${u.correo}`).includes(texto);
        });
    }, [usuarios, busqueda, filtroRol]);

    const abrir = (siguiente) => {
        setAviso("");
        setErrorModal("");
        setClaveNueva("");
        setClaveConfirmacion("");
        setModal(siguiente);
    };

    const cerrar = () => setModal(null);

    // ejecuta una accion contra el servidor, recarga el listado y avisa el
    // resultado; si falla deja la ventana abierta con el mensaje del servidor
    const ejecutar = async (accion, mensajeExito) => {
        setGuardando(true);
        setErrorModal("");

        try {
            await accion();
            setModal(null);
            setAviso(mensajeExito);
            setVersion((v) => v + 1);
        } catch (err) {
            setErrorModal(err.message);
        } finally {
            setGuardando(false);
        }
    };

    const guardarUsuario = (datos) => {
        if (modal.tipo === "crear") {
            return ejecutar(() => crearUsuario(token, datos), "Usuario creado.");
        }

        return ejecutar(
            () => actualizarUsuario(token, modal.usuario.id_usuario, datos),
            "Cambios guardados."
        );
    };

    const confirmarEstado = () => {
        const { usuario } = modal;
        const nuevoEstado = usuario.estado === "Activo" ? "Inactivo" : "Activo";

        return ejecutar(
            () => cambiarEstadoUsuario(token, usuario.id_usuario, nuevoEstado),
            nuevoEstado === "Activo"
                ? `${usuario.nombre} ${usuario.apellido} fue activado.`
                : `${usuario.nombre} ${usuario.apellido} fue desactivado.`
        );
    };

    const confirmarClave = (evento) => {
        evento.preventDefault();

        if (claveNueva.length < LONGITUD_MINIMA_CLAVE) {
            setErrorModal(`La contraseña debe tener al menos ${LONGITUD_MINIMA_CLAVE} caracteres.`);
            return;
        }
        if (claveNueva !== claveConfirmacion) {
            setErrorModal("La confirmación no coincide con la contraseña.");
            return;
        }

        const { usuario } = modal;

        return ejecutar(
            () => resetearContrasena(token, usuario.id_usuario, claveNueva),
            `Se restableció la contraseña de ${usuario.nombre} ${usuario.apellido}.`
        );
    };

    const esPropia = (usuario) => usuario.id_usuario === sesion.usuario.id_usuario;

    return (
        <div className="pagina usuarios-pagina">
            <div className="pagina-cabecera usuarios-cabecera">
                <div>
                    <h1>Usuarios</h1>
                    <p>Quién tiene acceso al sistema y con qué rol.</p>
                </div>
                <button type="button" className="boton" onClick={() => abrir({ tipo: "crear" })}>
                    Nuevo usuario
                </button>
            </div>

            {aviso && (
                <div className="aviso aviso-ok" role="status">
                    {aviso}
                </div>
            )}

            <div className="usuarios-filtros">
                <div className="campo">
                    <label htmlFor="buscar-usuario">Buscar</label>
                    <input
                        id="buscar-usuario"
                        type="search"
                        placeholder="Nombre o correo"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>
                <div className="campo">
                    <label htmlFor="filtro-rol">Rol</label>
                    <select id="filtro-rol" value={filtroRol} onChange={(e) => setFiltroRol(e.target.value)}>
                        <option value="">Todos los roles</option>
                        {TODOS_LOS_ROLES.map((rol) => (
                            <option key={rol} value={rol}>
                                {ETIQUETA_ROL[rol]}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {cargando && <p>Cargando usuarios...</p>}

            {errorCarga && (
                <div className="aviso aviso-error" role="alert">
                    {errorCarga}
                </div>
            )}

            {!cargando && !errorCarga && (
                <div className="tarjeta usuarios-tarjeta">
                    <p className="usuarios-contador" aria-live="polite">
                        {visibles.length} {visibles.length === 1 ? "usuario" : "usuarios"}
                    </p>

                    <div className="usuarios-tabla-envoltorio">
                        <table className="usuarios-tabla">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Correo</th>
                                    <th>Rol</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibles.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="usuarios-vacio">
                                            No hay usuarios que coincidan con la búsqueda.
                                        </td>
                                    </tr>
                                )}
                                {visibles.map((u) => (
                                    <tr key={u.id_usuario}>
                                        <td>
                                            {u.nombre} {u.apellido}
                                        </td>
                                        <td>{u.correo}</td>
                                        <td>{ETIQUETA_ROL[u.rol] ?? u.rol}</td>
                                        <td>
                                            <span className={`insignia insignia-${u.estado === "Activo" ? "activo" : "inactivo"}`}>
                                                {u.estado}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="usuarios-acciones">
                                                <button
                                                    type="button"
                                                    className="boton boton-chico boton-secundario"
                                                    aria-label={`Editar a ${u.nombre} ${u.apellido}`}
                                                    onClick={() => abrir({ tipo: "editar", usuario: u })}
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    type="button"
                                                    className="boton boton-chico boton-secundario"
                                                    aria-label={`${u.estado === "Activo" ? "Desactivar" : "Activar"} a ${u.nombre} ${u.apellido}`}
                                                    disabled={esPropia(u)}
                                                    title={esPropia(u) ? "No puedes desactivar tu propia cuenta" : undefined}
                                                    onClick={() => abrir({ tipo: "estado", usuario: u })}
                                                >
                                                    {u.estado === "Activo" ? "Desactivar" : "Activar"}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="boton boton-chico boton-secundario"
                                                    aria-label={`Restablecer la contraseña de ${u.nombre} ${u.apellido}`}
                                                    onClick={() => abrir({ tipo: "clave", usuario: u })}
                                                >
                                                    Restablecer contraseña
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {modal && (modal.tipo === "crear" || modal.tipo === "editar") && (
                <Modal
                    titulo={modal.tipo === "crear" ? "Nuevo usuario" : "Editar usuario"}
                    onCerrar={cerrar}
                >
                    <FormularioUsuario
                        modo={modal.tipo}
                        usuario={modal.usuario}
                        esPropiaCuenta={modal.usuario ? esPropia(modal.usuario) : false}
                        guardando={guardando}
                        error={errorModal}
                        onGuardar={guardarUsuario}
                        onCancelar={cerrar}
                    />
                </Modal>
            )}

            {modal && modal.tipo === "estado" && (
                <Modal
                    titulo={modal.usuario.estado === "Activo" ? "Desactivar usuario" : "Activar usuario"}
                    onCerrar={cerrar}
                >
                    {errorModal && (
                        <div className="aviso aviso-error" role="alert">
                            {errorModal}
                        </div>
                    )}
                    <p>
                        {modal.usuario.estado === "Activo"
                            ? `${modal.usuario.nombre} ${modal.usuario.apellido} ya no podrá iniciar sesión, pero se conservan sus datos y su historial.`
                            : `${modal.usuario.nombre} ${modal.usuario.apellido} podrá volver a iniciar sesión.`}
                    </p>
                    <div className="modal-acciones">
                        <button type="button" className="boton boton-secundario" onClick={cerrar}>
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className={`boton${modal.usuario.estado === "Activo" ? " boton-peligro" : ""}`}
                            disabled={guardando}
                            onClick={confirmarEstado}
                        >
                            {modal.usuario.estado === "Activo" ? "Desactivar" : "Activar"}
                        </button>
                    </div>
                </Modal>
            )}

            {modal && modal.tipo === "clave" && (
                <Modal titulo="Restablecer contraseña" onCerrar={cerrar}>
                    <form onSubmit={confirmarClave}>
                        <p>
                            Define una contraseña nueva para{" "}
                            <strong>
                                {modal.usuario.nombre} {modal.usuario.apellido}
                            </strong>
                            . No hace falta conocer la anterior.
                        </p>
                        {errorModal && (
                            <div className="aviso aviso-error" role="alert">
                                {errorModal}
                            </div>
                        )}
                        <div className="campo">
                            <label htmlFor="clave-nueva">Nueva contraseña</label>
                            <input
                                id="clave-nueva"
                                type="password"
                                autoComplete="new-password"
                                value={claveNueva}
                                onChange={(e) => setClaveNueva(e.target.value)}
                                required
                            />
                            <span className="campo-ayuda">Mínimo {LONGITUD_MINIMA_CLAVE} caracteres.</span>
                        </div>
                        <div className="campo">
                            <label htmlFor="clave-confirmacion">Confirmar contraseña</label>
                            <input
                                id="clave-confirmacion"
                                type="password"
                                autoComplete="new-password"
                                value={claveConfirmacion}
                                onChange={(e) => setClaveConfirmacion(e.target.value)}
                                required
                            />
                        </div>
                        <div className="modal-acciones">
                            <button type="button" className="boton boton-secundario" onClick={cerrar}>
                                Cancelar
                            </button>
                            <button type="submit" className="boton" disabled={guardando}>
                                {guardando ? "Guardando..." : "Restablecer"}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
