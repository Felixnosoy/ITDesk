// Pruebas de integracion: la API real contra una base MySQL de prueba
// creada desde cero con schema.sql + datos-prueba.sql. Se corren aparte
// (npm run test:integracion) porque necesitan MySQL; npm test no las toca.
module.exports = {
    testEnvironment: "node",
    testMatch: ["<rootDir>/tests/integracion/**/*.test.js"],
    globalSetup: "<rootDir>/tests/integracion/preparar-base.js",
    setupFiles: ["<rootDir>/tests/integracion/entorno.js"],
    // los archivos comparten la misma base: uno a la vez
    maxWorkers: 1
};
