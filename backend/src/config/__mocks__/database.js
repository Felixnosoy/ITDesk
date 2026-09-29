// Mock manual de Jest para "../config/database" — cualquier test que haga
// jest.mock("../../src/config/database") recibe esto en vez del pool real
// de mysql2. Un solo jest.fn() para .query(): cada test encadena
// mockResolvedValueOnce(...) en el mismo orden en que el service bajo
// prueba dispara sus queries.
//
// getConnection() devuelve una conexion para transacciones que comparte
// ese mismo query, asi el orden de las respuestas sigue siendo uno solo;
// beginTransaction/commit/rollback/release quedan espiados para verificar
// que una transaccion se confirma o se deshace.
const query = jest.fn();

const conexion = {
    query,
    beginTransaction: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
    release: jest.fn()
};

module.exports = {
    query,
    conexion,
    getConnection: jest.fn(async () => conexion)
};
