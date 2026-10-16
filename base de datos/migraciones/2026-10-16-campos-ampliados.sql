-- Migracion 2026-10-16: campos ampliados de ticket, equipo y cliente.
-- Para una base que ya existe; una base nueva la recibe desde schema.sql.

-- Campos ampliados del registro (pedido del curso: el registro del equipo
-- era muy basico). Todos son opcionales para no romper los registros que
-- ya existen.
--
-- Lo que describe como llego el equipo en ESTA visita va en el ticket, no
-- en el equipo: la misma laptop puede venir hoy con cargador y el mes que
-- viene sin el. La contrasena del equipo nunca se guarda: solo si el
-- cliente la dejo (el dato en si va en una nota interna del ticket).
ALTER TABLE `ticket`
  ADD COLUMN `canal_entrada` varchar(20) NOT NULL DEFAULT 'Presencial' AFTER `categoria`,
  ADD COLUMN `accesorios` varchar(255) DEFAULT NULL AFTER `canal_entrada`,
  ADD COLUMN `condicion_fisica` varchar(500) DEFAULT NULL AFTER `accesorios`,
  ADD COLUMN `enciende_al_recibir` tinyint(1) DEFAULT NULL AFTER `condicion_fisica`,
  ADD COLUMN `dejo_contrasena` tinyint(1) NOT NULL DEFAULT 0 AFTER `enciende_al_recibir`;

-- Lo que es del equipo y no cambia de una visita a otra: especificaciones,
-- garantia y el codigo de inventario del cliente (empresas).
ALTER TABLE `equipo`
  ADD COLUMN `sistema_operativo` varchar(60) DEFAULT NULL AFTER `numero_serie`,
  ADD COLUMN `procesador` varchar(80) DEFAULT NULL AFTER `sistema_operativo`,
  ADD COLUMN `memoria_ram` varchar(30) DEFAULT NULL AFTER `procesador`,
  ADD COLUMN `almacenamiento` varchar(60) DEFAULT NULL AFTER `memoria_ram`,
  ADD COLUMN `color` varchar(30) DEFAULT NULL AFTER `almacenamiento`,
  ADD COLUMN `en_garantia` tinyint(1) NOT NULL DEFAULT 0 AFTER `color`,
  ADD COLUMN `garantia_vence` date DEFAULT NULL AFTER `en_garantia`,
  ADD COLUMN `codigo_activo` varchar(50) DEFAULT NULL AFTER `garantia_vence`;

-- Clientes que son empresas y a quien llamar si el cliente no responde.
ALTER TABLE `usuario`
  ADD COLUMN `tipo_cliente` varchar(20) DEFAULT NULL AFTER `especialidad`,
  ADD COLUMN `empresa` varchar(150) DEFAULT NULL AFTER `tipo_cliente`,
  ADD COLUMN `rnc` varchar(20) DEFAULT NULL AFTER `empresa`,
  ADD COLUMN `contacto_alterno_nombre` varchar(150) DEFAULT NULL AFTER `rnc`,
  ADD COLUMN `contacto_alterno_telefono` varchar(20) DEFAULT NULL AFTER `contacto_alterno_nombre`;
