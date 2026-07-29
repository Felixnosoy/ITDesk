// Mock manual de Jest para "../config/database" — cualquier test que haga
// jest.mock("../../src/config/database") recibe esto en vez del pool real
// de mysql2. Un solo jest.fn() para .query(): cada test encadena
// mockResolvedValueOnce(...) en el mismo orden en que el service bajo
// prueba dispara sus queries.
module.exports = {
    query: jest.fn()
};
