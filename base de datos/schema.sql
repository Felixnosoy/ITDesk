-- ITDesk - esquema de base de datos
-- Se va ampliando con ALTER TABLE / nuevas tablas a medida que el backend
-- suma modulos (ver el historial de commits).

SET NAMES utf8mb4;

-- se borran primero las tablas que dependen de otras (FK), para que el
-- script se pueda volver a correr sobre una base ya creada
DROP TABLE IF EXISTS `auditoria`;
DROP TABLE IF EXISTS `ticket`;
DROP TABLE IF EXISTS `equipo`;
DROP TABLE IF EXISTS `usuario`;

--
-- Tabla `usuario`
--

CREATE TABLE `usuario` (
  `id_usuario` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `apellido` varchar(100) NOT NULL,
  `correo` varchar(150) NOT NULL,
  `contraseña` varchar(255) NOT NULL,
  `rol` varchar(50) NOT NULL,
  `tipo_documento` varchar(20) NOT NULL,
  `num_documento` varchar(50) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `especialidad` varchar(100) DEFAULT NULL,
  `estado` varchar(20) DEFAULT 'Activo',
  `fecha_registro` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `UQ_Usuario_Correo` (`correo`),
  UNIQUE KEY `UQ_Usuario_Documento` (`num_documento`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Tabla `auditoria`
--
-- id_ticket / id_visita se crean sin FK: `ticket` y `visita_tecnica` se
-- crean mas abajo o en sprints siguientes, y su constraint se agrega con
-- ALTER TABLE cuando la tabla existe.
--

CREATE TABLE `auditoria` (
  `id_auditoria` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `accion` varchar(50) NOT NULL,
  `descripcion` text NOT NULL,
  `id_ticket` int(11) DEFAULT NULL,
  `id_visita` int(11) DEFAULT NULL,
  `fecha` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id_auditoria`),
  KEY `FK_Auditoria_Usuario` (`id_usuario`),
  CONSTRAINT `FK_Auditoria_Usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Tabla `equipo`
--
-- Cada equipo pertenece a un cliente. Si se borra el cliente se borran sus
-- equipos, pero un equipo con tickets no se puede borrar (FK de ticket).
--

CREATE TABLE `equipo` (
  `id_equipo` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `tipo` varchar(50) NOT NULL,
  `marca` varchar(50) NOT NULL,
  `modelo` varchar(50) NOT NULL,
  `numero_serie` varchar(100) NOT NULL,
  `estado` varchar(50) NOT NULL DEFAULT 'Activo',
  `observaciones` text DEFAULT NULL,
  `fecha_registro` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_equipo`),
  UNIQUE KEY `UQ_Equipo_Serie` (`numero_serie`),
  KEY `FK_Equipo_Usuario` (`id_usuario`),
  CONSTRAINT `FK_Equipo_Usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Tabla `ticket`
--
-- id_usuario es el cliente dueño del ticket. Los valores de estado,
-- prioridad y categoria salen de backend/src/constants y se guardan sin
-- tildes (ver issue HU13.1 para la lista de estados).
--

CREATE TABLE `ticket` (
  `id_ticket` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `id_equipo` int(11) NOT NULL,
  `titulo` varchar(150) NOT NULL,
  `descripcion` text NOT NULL,
  `prioridad` varchar(20) NOT NULL,
  `categoria` varchar(20) NOT NULL,
  `estado` varchar(30) NOT NULL DEFAULT 'Abierto',
  `fecha_apertura` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_resolucion` datetime DEFAULT NULL,
  `fecha_cierre` datetime DEFAULT NULL,
  PRIMARY KEY (`id_ticket`),
  KEY `FK_Ticket_Usuario` (`id_usuario`),
  KEY `FK_Ticket_Equipo` (`id_equipo`),
  KEY `IX_Ticket_Estado` (`estado`),
  CONSTRAINT `FK_Ticket_Usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON UPDATE CASCADE,
  CONSTRAINT `FK_Ticket_Equipo` FOREIGN KEY (`id_equipo`) REFERENCES `equipo` (`id_equipo`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ahora que existe `ticket`, la auditoria puede apuntar a el
ALTER TABLE `auditoria`
  ADD KEY `FK_Auditoria_Ticket` (`id_ticket`),
  ADD CONSTRAINT `FK_Auditoria_Ticket` FOREIGN KEY (`id_ticket`) REFERENCES `ticket` (`id_ticket`) ON DELETE SET NULL ON UPDATE CASCADE;
