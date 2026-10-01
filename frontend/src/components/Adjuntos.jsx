import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { descargarImagen } from "../api/archivos";
import "./Adjuntos.css";

// Una miniatura: descarga la imagen con el token, la muestra y la libera al
// desmontarse. La url se crea y se libera en el mismo efecto.
function Miniatura({ adjunto, onAbrir }) {
    const { sesion } = useAuth();
    const img = useRef(null);
    const url = useRef(null);
    const [estado, setEstado] = useState("cargando");

    useEffect(() => {
        let vigente = true;
        let creada = null;

        descargarImagen(sesion.token, adjunto.url)
            .then((archivo) => {
                if (!vigente) return;
                creada = URL.createObjectURL(archivo);
                url.current = creada;
                img.current.src = creada;
                setEstado("lista");
            })
            .catch(() => {
                if (vigente) setEstado("fallo");
            });

        return () => {
            vigente = false;
            if (creada) URL.revokeObjectURL(creada);
        };
    }, [sesion.token, adjunto.url]);

    return (
        <li className={`adjunto adjunto-${estado}`}>
            <button
                type="button"
                disabled={estado !== "lista"}
                aria-label={`Ver ${adjunto.nombre_original} en grande`}
                onClick={() => onAbrir({ url: url.current, nombre: adjunto.nombre_original })}
            >
                <img ref={img} alt={adjunto.nombre_original} />
                {estado === "fallo" && <span>No se pudo cargar</span>}
            </button>
        </li>
    );
}

// Visor de una imagen en grande; se cierra con Escape, con la X o al hacer
// clic fuera de la imagen.
function Visor({ imagen, onCerrar }) {
    useEffect(() => {
        const alPresionar = (evento) => {
            if (evento.key === "Escape") onCerrar();
        };
        document.addEventListener("keydown", alPresionar);
        return () => document.removeEventListener("keydown", alPresionar);
    }, [onCerrar]);

    return (
        <div
            className="visor-fondo"
            role="dialog"
            aria-modal="true"
            aria-label={imagen.nombre}
            onMouseDown={(evento) => {
                if (evento.target === evento.currentTarget) onCerrar();
            }}
        >
            <figure className="visor">
                <img src={imagen.url} alt={imagen.nombre} />
                <figcaption>{imagen.nombre}</figcaption>
            </figure>
            <button type="button" className="visor-cerrar" aria-label="Cerrar" onClick={onCerrar}>
                ×
            </button>
        </div>
    );
}

// Imagenes adjuntas de un avance o de una nota: miniaturas en linea que se
// abren en grande al hacer clic.
export default function Adjuntos({ adjuntos }) {
    const [abierta, setAbierta] = useState(null);

    return (
        <>
            <ul className="adjuntos">
                {adjuntos.map((adjunto) => (
                    <Miniatura key={adjunto.id_archivo} adjunto={adjunto} onAbrir={setAbierta} />
                ))}
            </ul>
            {abierta && <Visor imagen={abierta} onCerrar={() => setAbierta(null)} />}
        </>
    );
}
