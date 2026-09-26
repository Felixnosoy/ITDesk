-- ITDesk - datos de prueba para desarrollo local
-- Correr DESPUES de schema.sql. Crea una cuenta por rol para poder
-- iniciar sesion en una base recien creada (sin esto no hay forma de
-- entrar: crear usuarios requiere un Administrador).
--
-- Contraseña de todas las cuentas: Prueba123!
-- Solo para desarrollo local, nunca usar en un despliegue real.

SET NAMES utf8mb4;

INSERT INTO `usuario`
  (`nombre`, `apellido`, `correo`, `contraseña`, `rol`, `tipo_documento`, `num_documento`, `telefono`, `direccion`, `especialidad`)
VALUES
  ('Administrador', 'Prueba', 'administrador.prueba@itdesk.test', '$2b$10$cQ.Cl4mQdnmTPqDpwESaUeDkLJntWf3RXHgq1yx158CHoOh.pBdVK', 'Administrador', 'Cedula', '000-0000001-1', NULL, NULL, NULL),
  ('Recepcionista', 'Prueba', 'recepcionista.prueba@itdesk.test', '$2b$10$cQ.Cl4mQdnmTPqDpwESaUeDkLJntWf3RXHgq1yx158CHoOh.pBdVK', 'Recepcionista', 'Cedula', '000-0000002-2', NULL, NULL, NULL),
  ('Tecnico', 'Prueba', 'tecnico.prueba@itdesk.test', '$2b$10$cQ.Cl4mQdnmTPqDpwESaUeDkLJntWf3RXHgq1yx158CHoOh.pBdVK', 'Tecnico', 'Cedula', '000-0000003-3', NULL, NULL, 'Hardware'),
  ('Cliente', 'Prueba', 'cliente.prueba@itdesk.test', '$2b$10$cQ.Cl4mQdnmTPqDpwESaUeDkLJntWf3RXHgq1yx158CHoOh.pBdVK', 'Cliente', 'Cedula', '000-0000004-4', '809-555-0000', 'Santo Domingo', NULL);
