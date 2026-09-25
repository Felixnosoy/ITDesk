import { useState } from "react";
import { ROLES, TODOS_LOS_ROLES, ETIQUETA_ROL } from "../constants/roles";
import "./FormularioUsuario.css";

// mismo minimo que exige el backend (usuario.service.js)
const LONGITUD_MINIMA_CLAVE = 8;

// los valores se guardan sin tilde: es lo que ya espera la base de datos
const TIPOS_DOCUMENTO = ["Cedula", "Pasaporte"];

const aTexto = (valor) => valor ?? "";
const vacioANulo = (valor) => (valor.trim() === "" ? null : valor.trim());

function valoresIniciales(usuario) {
    return {
        nombre: aTexto(usuario?.nombre),
        apellido: aTexto(usuario?.apellido),
        correo: aTexto(usuario?.correo),
        contraseña: "",
        rol: usuario?.rol ?? ROLES.CLIENTE,
        tipo_documento: usuario?.tipo_documento ?? TIPOS_DOCUMENTO[0],
        num_documento: aTexto(usuario?.num_documento),
        telefono: aTexto(usuario?.telefono),
        direccion: aTexto(usuario?.direccion),
        especialidad: aTexto(usuario?.especialidad),
    };
}

// Formulario de alta y de edicion. En la edicion no hay contrasena ni estado:
// esos cambios tienen su propia accion en el listado.
export default function FormularioUsuario({
    modo,
    usuario,
    esPropiaCuenta,
    guardando,
    error,
    onGuardar,
    onCancelar,
}) {
    const [valores, setValores] = useState(() => valoresIniciales(usuario));
    const [errorLocal, setErrorLocal] = useState("");

    const cambiar = (campo) => (evento) =>
        setValores((previos) => ({ ...previos, [campo]: evento.target.value }));

    const enviar = (evento) => {
        evento.preventDefault();

        if (modo === "crear" && valores.contraseña.length < LONGITUD_MINIMA_CLAVE) {
            setErrorLocal(`La contraseña debe tener al menos ${LONGITUD_MINIMA_CLAVE} caracteres.`);
            return;
        }

        setErrorLocal("");

        const datos = {
            nombre: valores.nombre.trim(),
            apellido: valores.apellido.trim(),
            correo: valores.correo.trim(),
            rol: valores.rol,
            tipo_documento: valores.tipo_documento,
            num_documento: valores.num_documento.trim(),
            telefono: vacioANulo(valores.telefono),
            direccion: vacioANulo(valores.direccion),
            especialidad: valores.rol === ROLES.TECNICO ? vacioANulo(valores.especialidad) : null,
        };

        if (modo === "crear") {
            datos.contraseña = valores.contraseña;
            datos.estado = "Activo";
        }

        onGuardar(datos);
    };

    const mensaje = errorLocal || error;

    return (
        <form onSubmit={enviar}>
            {mensaje && (
                <div className="aviso aviso-error" role="alert">
                    {mensaje}
                </div>
            )}

            <div className="formulario-grilla">
                <div className="campo">
                    <label htmlFor="uf-nombre">Nombre</label>
                    <input id="uf-nombre" value={valores.nombre} onChange={cambiar("nombre")} required maxLength={100} />
                </div>
                <div className="campo">
                    <label htmlFor="uf-apellido">Apellido</label>
                    <input id="uf-apellido" value={valores.apellido} onChange={cambiar("apellido")} required maxLength={100} />
                </div>

                <div className="campo formulario-ancho">
                    <label htmlFor="uf-correo">Correo</label>
                    <input id="uf-correo" type="email" value={valores.correo} onChange={cambiar("correo")} required maxLength={150} />
                </div>

                {modo === "crear" && (
                    <div className="campo formulario-ancho">
                        <label htmlFor="uf-clave">Contraseña inicial</label>
                        <input
                            id="uf-clave"
                            type="password"
                            autoComplete="new-password"
                            value={valores.contraseña}
                            onChange={cambiar("contraseña")}
                            required
                        />
                        <span className="campo-ayuda">
                            Mínimo {LONGITUD_MINIMA_CLAVE} caracteres. La persona puede cambiarla desde su perfil.
                        </span>
                    </div>
                )}

                <div className="campo">
                    <label htmlFor="uf-rol">Rol</label>
                    <select id="uf-rol" value={valores.rol} onChange={cambiar("rol")} disabled={esPropiaCuenta}>
                        {TODOS_LOS_ROLES.map((rol) => (
                            <option key={rol} value={rol}>
                                {ETIQUETA_ROL[rol]}
                            </option>
                        ))}
                    </select>
                    {esPropiaCuenta && (
                        <span className="campo-ayuda">No puedes cambiar tu propio rol.</span>
                    )}
                </div>

                {valores.rol === ROLES.TECNICO && (
                    <div className="campo">
                        <label htmlFor="uf-especialidad">Especialidad</label>
                        <input id="uf-especialidad" value={valores.especialidad} onChange={cambiar("especialidad")} maxLength={100} />
                    </div>
                )}

                <div className="campo">
                    <label htmlFor="uf-tipo-doc">Tipo de documento</label>
                    <select id="uf-tipo-doc" value={valores.tipo_documento} onChange={cambiar("tipo_documento")}>
                        {TIPOS_DOCUMENTO.map((tipo) => (
                            <option key={tipo} value={tipo}>
                                {tipo === "Cedula" ? "Cédula" : tipo}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="campo">
                    <label htmlFor="uf-num-doc">Número de documento</label>
                    <input id="uf-num-doc" value={valores.num_documento} onChange={cambiar("num_documento")} required maxLength={50} />
                </div>

                <div className="campo">
                    <label htmlFor="uf-telefono">Teléfono</label>
                    <input id="uf-telefono" type="tel" value={valores.telefono} onChange={cambiar("telefono")} maxLength={20} />
                </div>
                <div className="campo">
                    <label htmlFor="uf-direccion">Dirección</label>
                    <input id="uf-direccion" value={valores.direccion} onChange={cambiar("direccion")} maxLength={255} />
                </div>
            </div>

            <div className="modal-acciones">
                <button type="button" className="boton boton-secundario" onClick={onCancelar}>
                    Cancelar
                </button>
                <button type="submit" className="boton" disabled={guardando}>
                    {guardando ? "Guardando..." : modo === "crear" ? "Crear usuario" : "Guardar cambios"}
                </button>
            </div>
        </form>
    );
}
