import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { ETIQUETA_ROL } from "../constants/roles";
import { obtenerUsuario, actualizarPerfil } from "../api/usuarios";
import "./Perfil.css";

function formatearFecha(fecha) {
    if (!fecha) return "";

    return new Date(fecha).toLocaleDateString("es-DO", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

// Datos de la cuenta (solo lectura) y datos de contacto editables. Rol,
// correo y documento no se editan desde aqui: los cambia un administrador.
export default function Perfil() {
    const { sesion } = useAuth();
    const { token, usuario: usuarioSesion } = sesion;

    const [perfil, setPerfil] = useState(null);
    const [telefono, setTelefono] = useState("");
    const [direccion, setDireccion] = useState("");
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");
    const [aviso, setAviso] = useState("");

    useEffect(() => {
        let vigente = true;

        obtenerUsuario(token, usuarioSesion.id_usuario)
            .then((datos) => {
                if (!vigente) return;
                setPerfil(datos);
                setTelefono(datos.telefono ?? "");
                setDireccion(datos.direccion ?? "");
            })
            .catch((err) => {
                if (vigente) setError(err.message);
            })
            .finally(() => {
                if (vigente) setCargando(false);
            });

        return () => {
            vigente = false;
        };
    }, [token, usuarioSesion.id_usuario]);

    const hayCambios =
        perfil !== null &&
        (telefono !== (perfil.telefono ?? "") || direccion !== (perfil.direccion ?? ""));

    const guardar = async (evento) => {
        evento.preventDefault();
        setError("");
        setAviso("");
        setGuardando(true);

        try {
            const actualizado = await actualizarPerfil(token, usuarioSesion.id_usuario, {
                telefono: telefono.trim(),
                direccion: direccion.trim(),
            });
            setPerfil(actualizado);
            setTelefono(actualizado.telefono ?? "");
            setDireccion(actualizado.direccion ?? "");
            setAviso("Los datos de contacto se guardaron.");
        } catch (err) {
            setError(err.message);
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="pagina">
            <div className="pagina-cabecera">
                <h1>Mi perfil</h1>
                <p>Consulta los datos de tu cuenta y mantén al día tu contacto.</p>
            </div>

            {cargando && <p>Cargando perfil...</p>}

            {!cargando && !perfil && error && (
                <div className="aviso aviso-error" role="alert">
                    {error}
                </div>
            )}

            {perfil && (
                <>
                    <section className="tarjeta perfil-bloque">
                        <h2>Datos de la cuenta</h2>
                        <dl className="perfil-datos">
                            <div>
                                <dt>Nombre</dt>
                                <dd>
                                    {perfil.nombre} {perfil.apellido}
                                </dd>
                            </div>
                            <div>
                                <dt>Correo</dt>
                                <dd>{perfil.correo}</dd>
                            </div>
                            <div>
                                <dt>Rol</dt>
                                <dd>{ETIQUETA_ROL[perfil.rol] ?? perfil.rol}</dd>
                            </div>
                            <div>
                                <dt>Documento</dt>
                                <dd>
                                    {perfil.tipo_documento} {perfil.num_documento}
                                </dd>
                            </div>
                            {perfil.especialidad && (
                                <div>
                                    <dt>Especialidad</dt>
                                    <dd>{perfil.especialidad}</dd>
                                </div>
                            )}
                            <div>
                                <dt>Miembro desde</dt>
                                <dd>{formatearFecha(perfil.fecha_registro)}</dd>
                            </div>
                        </dl>
                        <p className="campo-ayuda">
                            El correo, el rol y el documento los modifica un administrador.
                        </p>
                    </section>

                    <form className="tarjeta perfil-bloque" onSubmit={guardar}>
                        <h2>Datos de contacto</h2>

                        {error && (
                            <div className="aviso aviso-error" role="alert">
                                {error}
                            </div>
                        )}
                        {aviso && (
                            <div className="aviso aviso-ok" role="status">
                                {aviso}
                            </div>
                        )}

                        <div className="campo">
                            <label htmlFor="telefono">Teléfono</label>
                            <input
                                id="telefono"
                                type="tel"
                                value={telefono}
                                maxLength={20}
                                onChange={(e) => setTelefono(e.target.value)}
                            />
                        </div>

                        <div className="campo">
                            <label htmlFor="direccion">Dirección</label>
                            <input
                                id="direccion"
                                type="text"
                                value={direccion}
                                maxLength={255}
                                onChange={(e) => setDireccion(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            className="boton"
                            disabled={guardando || !hayCambios}
                        >
                            {guardando ? "Guardando..." : "Guardar cambios"}
                        </button>
                    </form>
                </>
            )}
        </div>
    );
}
