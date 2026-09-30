-- ITDesk - esquema de base de datos
-- Se va ampliando con ALTER TABLE / nuevas tablas a medida que el backend
-- suma modulos (ver el historial de commits).

SET NAMES utf8mb4;

-- se borran primero las tablas que dependen de otras (FK), para que el
-- script se pueda volver a correr sobre una base ya creada
DROP TABLE IF EXISTS `auditoria`;
DROP TABLE IF EXISTS `diagnostico`;
DROP TABLE IF EXISTS `archivo_adjunto`;
DROP TABLE IF EXISTS `nota_privada`;
DROP TABLE IF EXISTS `actualizacion`;
DROP TABLE IF EXISTS `asignacion`;
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

--
-- Tabla `asignacion`
--
-- Historial de tecnicos asignados a cada ticket. Solo una fila por ticket
-- tiene activa = 1 (el tecnico actual); al reasignar, la anterior pasa a 0
-- en vez de borrarse, para no perder quien trabajo antes en el ticket.
-- id_asignado_por guarda quien hizo la asignacion (Recepcion o Admin).
--

CREATE TABLE `asignacion` (
  `id_asignacion` int(11) NOT NULL AUTO_INCREMENT,
  `id_ticket` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `id_asignado_por` int(11) NOT NULL,
  `activa` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_asignacion` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_asignacion`),
  KEY `IX_Asignacion_Ticket_Activa` (`id_ticket`, `activa`),
  KEY `FK_Asignacion_Usuario` (`id_usuario`),
  KEY `FK_Asignacion_AsignadoPor` (`id_asignado_por`),
  CONSTRAINT `FK_Asignacion_Ticket` FOREIGN KEY (`id_ticket`) REFERENCES `ticket` (`id_ticket`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_Asignacion_Usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON UPDATE CASCADE,
  CONSTRAINT `FK_Asignacion_AsignadoPor` FOREIGN KEY (`id_asignado_por`) REFERENCES `usuario` (`id_usuario`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Tabla `actualizacion`
--
-- Novedades publicas del ticket, las que tambien ve el cliente. tipo dice
-- si es un avance escrito por el tecnico ('Avance') o un cambio de estado
-- ('Estado'); estado guarda el estado del ticket en ese momento, asi la
-- linea de tiempo se arma solo con esta tabla.
--

CREATE TABLE `actualizacion` (
  `id_actualizacion` int(11) NOT NULL AUTO_INCREMENT,
  `id_ticket` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `tipo` varchar(20) NOT NULL,
  `estado` varchar(30) NOT NULL,
  `observaciones` text DEFAULT NULL,
  `fecha` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_actualizacion`),
  KEY `IX_Actualizacion_Ticket_Fecha` (`id_ticket`, `fecha`),
  KEY `FK_Actualizacion_Usuario` (`id_usuario`),
  CONSTRAINT `FK_Actualizacion_Ticket` FOREIGN KEY (`id_ticket`) REFERENCES `ticket` (`id_ticket`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_Actualizacion_Usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Tabla `nota_privada`
--
-- Notas internas del taller: el cliente nunca las ve.
--

CREATE TABLE `nota_privada` (
  `id_nota` int(11) NOT NULL AUTO_INCREMENT,
  `id_ticket` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `contenido` text NOT NULL,
  `fecha` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_nota`),
  KEY `IX_NotaPrivada_Ticket_Fecha` (`id_ticket`, `fecha`),
  KEY `FK_NotaPrivada_Usuario` (`id_usuario`),
  CONSTRAINT `FK_NotaPrivada_Ticket` FOREIGN KEY (`id_ticket`) REFERENCES `ticket` (`id_ticket`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_NotaPrivada_Usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Tabla `archivo_adjunto`
--
-- Cada adjunto cuelga de una actualizacion (publico) o de una nota privada
-- (privado), nunca de las dos ni de ninguna: el CHECK lo garantiza. Asi la
-- visibilidad del archivo es siempre la de su padre. nombre_archivo es el
-- nombre generado en disco (backend/uploads), nombre_original el del usuario.
--

CREATE TABLE `archivo_adjunto` (
  `id_archivo` int(11) NOT NULL AUTO_INCREMENT,
  `id_ticket` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `id_actualizacion` int(11) DEFAULT NULL,
  `id_nota` int(11) DEFAULT NULL,
  `nombre_original` varchar(255) NOT NULL,
  `nombre_archivo` varchar(100) NOT NULL,
  `tipo_mime` varchar(50) NOT NULL,
  `tamano_bytes` int(11) NOT NULL,
  `fecha_subida` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_archivo`),
  UNIQUE KEY `UQ_Archivo_Nombre` (`nombre_archivo`),
  KEY `FK_Archivo_Ticket` (`id_ticket`),
  KEY `FK_Archivo_Usuario` (`id_usuario`),
  KEY `FK_Archivo_Actualizacion` (`id_actualizacion`),
  KEY `FK_Archivo_Nota` (`id_nota`),
  CONSTRAINT `CK_Archivo_UnSoloPadre` CHECK ((`id_actualizacion` IS NULL) <> (`id_nota` IS NULL)),
  CONSTRAINT `FK_Archivo_Ticket` FOREIGN KEY (`id_ticket`) REFERENCES `ticket` (`id_ticket`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_Archivo_Usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON UPDATE CASCADE,
  CONSTRAINT `FK_Archivo_Actualizacion` FOREIGN KEY (`id_actualizacion`) REFERENCES `actualizacion` (`id_actualizacion`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_Archivo_Nota` FOREIGN KEY (`id_nota`) REFERENCES `nota_privada` (`id_nota`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Tabla `diagnostico`
--
-- Un solo diagnostico vigente por ticket (UNIQUE en id_ticket): editarlo
-- lo reemplaza en vez de sumar filas. id_usuario es quien lo escribio o
-- edito por ultima vez. Sin diagnostico el ticket no se puede cotizar.
--

CREATE TABLE `diagnostico` (
  `id_diagnostico` int(11) NOT NULL AUTO_INCREMENT,
  `id_ticket` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `diagnostico` text NOT NULL,
  `solucion` text DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `fecha_diagnostico` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_edicion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_diagnostico`),
  UNIQUE KEY `UQ_Diagnostico_Ticket` (`id_ticket`),
  KEY `FK_Diagnostico_Usuario` (`id_usuario`),
  CONSTRAINT `FK_Diagnostico_Ticket` FOREIGN KEY (`id_ticket`) REFERENCES `ticket` (`id_ticket`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_Diagnostico_Usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
