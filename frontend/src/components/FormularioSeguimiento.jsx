import { useEffect, useRef, useState } from "react";
import { RESPUESTAS_RAPIDAS } from "../constants/respuestas";
import "./FormularioSeguimiento.css";

// mismos limites que el backend (archivo.service.js); revisarlos aqui
// avisa antes de subir, el servidor igual los vuelve a revisar
const TIPOS_IMAGEN = ["image/png", "image/jpeg", "image/gif", "image/webp"];
const MAXIMO_IMAGENES = 5;
const TAMANO_MAXIMO_MB = 5;

const TIPOS = {
    actualizaciones: {
        etiqueta: "Avance para el cliente",
        ayuda: "El cliente lo verá en la línea de tiempo de su ticket.",
        placeholder: "Qué se hizo y en qué quedó el equipo.",
    },
    notas: {
        etiqueta: "Nota privada",
        ayuda: "Solo la ve el personal del taller.",
        placeholder: "Algo que el resto del taller debe saber.",
    },
};

// Vista previa de una imagen elegida. La url se crea y se libera en el
// mismo efecto: asi un desmontaje (o el doble montaje de React en
// desarrollo) nunca deja la imagen apuntando a una url ya liberada.
function VistaPrevia({ imagen, onQuitar }) {
    const img = useRef(null);

    useEffect(() => {
        const url = URL.createObjectURL(imagen);
        img.current.src = url;
        return () => URL.revokeObjectURL(url);
    }, [imagen]);

    return (
        <li>
            <img ref={img} alt={imagen.name} />
            <button type="button" aria-label={`Quitar ${imagen.name}`} onClick={onQuitar}>
                ×
            </button>
        </li>
    );
}

// Formulario para registrar un avance o una nota privada con imagenes. Las
// imagenes se eligen con el boton o se pegan con Ctrl+V sobre el texto.
//
// Con tipoFijo es la caja de mensaje del panel de actividad: la pestana del
// panel ya dice si es para el cliente o interno, asi que no hay selector, y
// Ctrl+Enter envia como en un chat.
export default function FormularioSeguimiento({ guardando, error, onGuardar, tipoFijo }) {
    const [tipoElegido, setTipo] = useState("actualizaciones");
    const tipo = tipoFijo ?? tipoElegido;
    const [texto, setTexto] = useState("");
    const [imagenes, setImagenes] = useState([]);
    const [avisoImagen, setAvisoImagen] = useState("");
    const selector = useRef(null);
    const caja = useRef(null);

    // la respuesta rapida se suma a lo ya escrito y deja el cursor al final
    const usarRespuesta = (frase) => {
        const nuevo = texto.trim() ? `${texto.trimEnd()} ${frase}` : frase;
        setTexto(nuevo);
        requestAnimationFrame(() => {
            caja.current?.focus();
            caja.current?.setSelectionRange(nuevo.length, nuevo.length);
        });
    };

    const agregar = (archivos) => {
        const nuevas = [];
        let problema = "";

        for (const archivo of archivos) {
            if (!TIPOS_IMAGEN.includes(archivo.type)) {
                problema = `"${archivo.name}" no es una imagen PNG, JPG, GIF o WEBP.`;
            } else if (archivo.size > TAMANO_MAXIMO_MB * 1024 * 1024) {
                problema = `"${archivo.name}" pesa más de ${TAMANO_MAXIMO_MB} MB.`;
            } else {
                nuevas.push(archivo);
            }
        }

        const total = [...imagenes, ...nuevas];
        if (total.length > MAXIMO_IMAGENES) {
            problema = `Se pueden adjuntar como máximo ${MAXIMO_IMAGENES} imágenes.`;
        }

        setImagenes(total.slice(0, MAXIMO_IMAGENES));
        setAvisoImagen(problema);
    };

    // una captura pegada con Ctrl+V llega como archivo del portapapeles
    const alPegar = (evento) => {
        const archivos = [...evento.clipboardData.files];
        if (archivos.length === 0) return;

        evento.preventDefault();
        // las capturas llegan como "image.png": se les da un nombre legible
        agregar(
            archivos.map((archivo, i) =>
                archivo.name === "image.png"
                    ? new File([archivo], `captura-${Date.now()}-${i + 1}.png`, { type: archivo.type })
                    : archivo
            )
        );
    };

    const quitar = (indice) => {
        setImagenes(imagenes.filter((_, i) => i !== indice));
        setAvisoImagen("");
    };

    const enviar = async (evento) => {
        evento.preventDefault();
        if (guardando || !texto.trim()) return;
        const guardado = await onGuardar(tipo, texto, imagenes);

        if (guardado) {
            setTexto("");
            setImagenes([]);
            setAvisoImagen("");
        }
    };

    const actual = TIPOS[tipo];

    return (
        <form onSubmit={enviar} className={`seguimiento${tipoFijo ? " seguimiento-chat" : ""}`}>
            {!tipoFijo && (
            <div className="seguimiento-tipos" role="radiogroup" aria-label="Tipo de registro">
                {Object.entries(TIPOS).map(([clave, { etiqueta }]) => (
                    <label key={clave} className={`seguimiento-tipo${tipo === clave ? " activo" : ""}`}>
                        <input
                            type="radio"
                            name="tipo-seguimiento"
                            value={clave}
                            checked={tipo === clave}
                            onChange={() => setTipo(clave)}
                        />
                        {etiqueta}
                    </label>
                ))}
            </div>
            )}

            {error && (
                <div className="aviso aviso-error" role="alert">
                    {error}
                </div>
            )}

            {tipoFijo && (
                <div className="seguimiento-rapidas" role="group" aria-label="Respuestas rápidas">
                    {RESPUESTAS_RAPIDAS[tipo].map((respuesta) => (
                        <button
                            key={respuesta.etiqueta}
                            type="button"
                            className="seguimiento-rapida"
                            title={respuesta.texto}
                            onClick={() => usarRespuesta(respuesta.texto)}
                        >
                            {respuesta.etiqueta}
                        </button>
                    ))}
                </div>
            )}

            <div className="campo">
                <label htmlFor={`seguimiento-texto-${tipo}`} className={tipoFijo ? "sr-only" : undefined}>
                    {actual.etiqueta}
                </label>
                <textarea
                    ref={caja}
                    id={`seguimiento-texto-${tipo}`}
                    rows={tipoFijo ? 2 : 3}
                    value={texto}
                    placeholder={actual.placeholder}
                    onChange={(e) => setTexto(e.target.value)}
                    onPaste={alPegar}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) enviar(e);
                    }}
                />
                <span className="campo-ayuda">
                    {actual.ayuda} {tipoFijo ? "Ctrl+Enter envía; " : "Puedes "}pegar una captura con Ctrl+V.
                </span>
            </div>

            {imagenes.length > 0 && (
                <ul className="seguimiento-imagenes">
                    {imagenes.map((imagen, i) => (
                        <VistaPrevia
                            key={`${imagen.name}-${imagen.lastModified}-${i}`}
                            imagen={imagen}
                            onQuitar={() => quitar(i)}
                        />
                    ))}
                </ul>
            )}

            {avisoImagen && (
                <div className="aviso aviso-error" role="alert">
                    {avisoImagen}
                </div>
            )}

            <div className="seguimiento-acciones">
                <input
                    ref={selector}
                    type="file"
                    accept={TIPOS_IMAGEN.join(",")}
                    multiple
                    hidden
                    onChange={(e) => {
                        agregar([...e.target.files]);
                        e.target.value = "";
                    }}
                />
                <button
                    type="button"
                    className="boton boton-secundario"
                    disabled={imagenes.length >= MAXIMO_IMAGENES}
                    onClick={() => selector.current.click()}
                >
                    {tipoFijo ? "Adjuntar" : "Adjuntar imágenes"}
                </button>
                <span className="seguimiento-contador">
                    {imagenes.length}/{MAXIMO_IMAGENES}
                </span>
                <button type="submit" className="boton" disabled={guardando || !texto.trim()}>
                    {guardando ? "Guardando..." : tipoFijo ? "Enviar" : "Registrar"}
                </button>
            </div>
        </form>
    );
}
