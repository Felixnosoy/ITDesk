// Iconos de trazo simple (viewBox 24) para el menu. Se dibujan inline para no
// depender de ninguna libreria de iconos.
const TRAZOS = {
    inicio: ["M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"],
    usuarios: [
        "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
        "M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
        "M22 21v-2a4 4 0 0 0-3-3.87",
        "M16 3.13a4 4 0 0 1 0 7.75",
    ],
    perfil: [
        "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2",
        "M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
    ],
    llave: [
        "M21 2l-2 2",
        "M15.5 7.5 19 4l3 3-3.5 3.5",
        "M11.4 11.6a5.5 5.5 0 1 1-7.8 7.8 5.5 5.5 0 0 1 7.8-7.8z",
        "M11.4 11.6 15.5 7.5",
    ],
    salir: [
        "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",
        "M16 17l5-5-5-5",
        "M21 12H9",
    ],
    menu: ["M3 6h18", "M3 12h18", "M3 18h18"],
    tickets: [
        "M4 4h16a1 1 0 0 1 1 1v4a2 2 0 0 0 0 4v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4a2 2 0 0 0 0-4V5a1 1 0 0 1 1-1z",
        "M9 4v14",
    ],
    nuevo: ["M12 5v14", "M5 12h14"],
    sol: [
        "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
        "M12 2v2",
        "M12 20v2",
        "M4.93 4.93l1.41 1.41",
        "M17.66 17.66l1.41 1.41",
        "M2 12h2",
        "M20 12h2",
        "M6.34 17.66l-1.41 1.41",
        "M19.07 4.93l-1.41 1.41",
    ],
    luna: ["M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z"],
};

export default function Icono({ nombre, tamano = 18 }) {
    return (
        <svg
            width={tamano}
            height={tamano}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
        >
            {TRAZOS[nombre].map((d) => (
                <path key={d} d={d} />
            ))}
        </svg>
    );
}
