-- ITDesk - esquema de base de datos
-- Se va ampliando con ALTER TABLE / nuevas tablas a medida que el backend
-- suma modulos (ver el historial de commits).

SET NAMES utf8mb4;

-- se borran primero las tablas que dependen de otras (FK), para que el
-- script se pueda volver a correr sobre una base ya creada
DROP TABLE IF EXISTS `auditoria`;
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
-- id_ticket / id_visita quedan sin FK por ahora: las tablas `ticket` y
-- `visita_tecnica` todavia no existen. Las constraints se agregan con
-- ALTER TABLE cuando esos modulos se construyan.
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
