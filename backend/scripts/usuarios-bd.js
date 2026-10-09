const mysql = require("mysql2/promise");
const { format } = require("mysql2");
const { PRIVILEGIOS_APP, PRIVILEGIOS_ADMIN } = require("./privilegios");

// Crea o actualiza los usuarios de MySQL de ITDesk con privilegios
// minimos (issue HU26.2): itdesk_app para el backend e itdesk_admin para
// cambios de estructura. Se puede correr las veces que haga falta: cada
// vez le quita todo a los dos usuarios y les vuelve a dar exactamente lo
// de la matriz (scripts/privilegios.js).
//
// Uso: npm run db:usuarios           (aplica)
//      npm run db:usuarios -- --ver  (muestra el SQL, con las claves ocultas)
//
// Lee de backend/.env (o del entorno):
//   DB_HOST, DB_PORT, DB_NAME            la base a proteger
//   DB_ROOT_USER, DB_ROOT_PASSWORD       quien crea los usuarios (root o
//                                        equivalente); solo en la maquina
//                                        de quien corre el script
//   DB_APP_USER, DB_APP_PASSWORD         usuario del backend
//   DB_ADMIN_USER, DB_ADMIN_PASSWORD     usuario de administracion
//   DB_USERS_HOST                        desde donde se conectan (% = cualquiera)

const LARGO_MINIMO_CLAVE = 12;

// Sentencias para dejar a un usuario con exactamente estos privilegios.
// privilegios es { tabla: [ops] } (por tabla) o [ops] (toda la base).
const sentenciasUsuario = ({ base, usuario, host, clave, privilegios }) => {
    const sentencias = [
        format("CREATE USER IF NOT EXISTS ?@? IDENTIFIED BY ?", [usuario, host, clave]),
        // si ya existia, la clave queda la de ahora
        format("ALTER USER ?@? IDENTIFIED BY ?", [usuario, host, clave]),
        format("REVOKE ALL PRIVILEGES, GRANT OPTION FROM ?@?", [usuario, host])
    ];

    if (Array.isArray(privilegios)) {
        sentencias.push(format(`GRANT ${privilegios.join(", ")} ON ??.* TO ?@?`, [base, usuario, host]));
    } else {
        for (const [tabla, operaciones] of Object.entries(privilegios)) {
            sentencias.push(format(`GRANT ${operaciones.join(", ")} ON ??.?? TO ?@?`, [base, tabla, usuario, host]));
        }
    }

    return sentencias;
};

// Diferencias entre las tablas de la base y la matriz. Una tabla sin
// privilegios definidos dejaria al backend sin acceso (o se olvidaria
// protegerla); una de la matriz que no existe hace fallar el GRANT.
const diferenciasConLaMatriz = (tablasDeLaBase) => {
    const enMatriz = Object.keys(PRIVILEGIOS_APP);

    return {
        sinPrivilegios: tablasDeLaBase.filter((t) => !enMatriz.includes(t)),
        inexistentes: enMatriz.filter((t) => !tablasDeLaBase.includes(t))
    };
};

const validarClave = (clave, variable) => {
    if (!clave || clave.length < LARGO_MINIMO_CLAVE) {
        throw new Error(`${variable} debe tener al menos ${LARGO_MINIMO_CLAVE} caracteres.`);
    }
};

// Aplica los usuarios con una conexion que ya tiene permisos para crear
// usuarios. admin es opcional (las pruebas solo crean el de la app).
const aplicarUsuarios = async (conexion, { base, host = "%", app, admin }) => {
    const [filas] = await conexion.query(
        "SELECT table_name AS tabla FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE'",
        [base]
    );
    const { sinPrivilegios, inexistentes } = diferenciasConLaMatriz(filas.map((f) => f.tabla));

    if (sinPrivilegios.length > 0 || inexistentes.length > 0) {
        throw new Error(
            "La base y scripts/privilegios.js no coinciden." +
            (sinPrivilegios.length ? ` Tablas sin privilegios definidos: ${sinPrivilegios.join(", ")}.` : "") +
            (inexistentes.length ? ` Tablas de la matriz que no existen en ${base}: ${inexistentes.join(", ")}.` : "")
        );
    }

    const sentencias = [
        ...sentenciasUsuario({ base, host, ...app, privilegios: PRIVILEGIOS_APP }),
        ...(admin ? sentenciasUsuario({ base, host, ...admin, privilegios: PRIVILEGIOS_ADMIN }) : [])
    ];

    for (const sentencia of sentencias) {
        await conexion.query(sentencia);
    }

    return sentencias;
};

const ocultarClaves = (sentencia) => sentencia.replace(/IDENTIFIED BY '(?:[^'\\]|\\.)*'/g, "IDENTIFIED BY '********'");

const principal = async () => {
    require("dotenv").config({ path: require("path").join(__dirname, "..", ".env"), quiet: true });

    const env = process.env;
    const soloVer = process.argv.includes("--ver");
    const base = env.DB_NAME;
    const host = env.DB_USERS_HOST || "%";
    const app = { usuario: env.DB_APP_USER || "itdesk_app", clave: env.DB_APP_PASSWORD };
    const admin = { usuario: env.DB_ADMIN_USER || "itdesk_admin", clave: env.DB_ADMIN_PASSWORD };

    if (!base) throw new Error("Falta DB_NAME.");
    validarClave(app.clave, "DB_APP_PASSWORD");
    validarClave(admin.clave, "DB_ADMIN_PASSWORD");

    if (soloVer) {
        const sentencias = [
            ...sentenciasUsuario({ base, host, ...app, privilegios: PRIVILEGIOS_APP }),
            ...sentenciasUsuario({ base, host, ...admin, privilegios: PRIVILEGIOS_ADMIN })
        ];
        console.log(sentencias.map((s) => `${ocultarClaves(s)};`).join("\n"));
        return;
    }

    const conexion = await mysql.createConnection({
        host: env.DB_HOST,
        port: env.DB_PORT,
        user: env.DB_ROOT_USER || "root",
        password: env.DB_ROOT_PASSWORD || ""
    });

    try {
        await aplicarUsuarios(conexion, { base, host, app, admin });
    } finally {
        await conexion.end();
    }

    console.log(`Listo: ${app.usuario}@${host} (datos, tabla por tabla) y ${admin.usuario}@${host} (estructura) sobre ${base}.`);
    console.log(`Para que el backend use el usuario restringido: DB_USER=${app.usuario} y DB_PASSWORD con su clave.`);
};

if (require.main === module) {
    principal().catch((error) => {
        console.error(error.message);
        process.exit(1);
    });
}

module.exports = {
    sentenciasUsuario,
    diferenciasConLaMatriz,
    aplicarUsuarios,
    ocultarClaves
};
