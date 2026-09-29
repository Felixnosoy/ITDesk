-- ITDesk - datos de prueba para desarrollo local
-- Correr DESPUES de schema.sql. Crea una cuenta por rol para poder
-- iniciar sesion en una base recien creada (sin esto no hay forma de
-- entrar: crear usuarios requiere un Administrador), un segundo cliente
-- para probar que cada cliente ve solo lo suyo, y equipos y tickets de
-- ejemplo en todos los estados.
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
  ('Cliente', 'Prueba', 'cliente.prueba@itdesk.test', '$2b$10$cQ.Cl4mQdnmTPqDpwESaUeDkLJntWf3RXHgq1yx158CHoOh.pBdVK', 'Cliente', 'Cedula', '000-0000004-4', '809-555-0000', 'Santo Domingo', NULL),
  ('Maria', 'Gomez', 'maria.gomez@correo.test', '$2b$10$cQ.Cl4mQdnmTPqDpwESaUeDkLJntWf3RXHgq1yx158CHoOh.pBdVK', 'Cliente', 'Cedula', '000-0000005-5', '829-555-0101', 'Santiago', NULL);

-- los ids se buscan por correo para no depender del orden de insercion
SET @cliente = (SELECT id_usuario FROM usuario WHERE correo = 'cliente.prueba@itdesk.test');
SET @maria = (SELECT id_usuario FROM usuario WHERE correo = 'maria.gomez@correo.test');

INSERT INTO `equipo` (`id_usuario`, `tipo`, `marca`, `modelo`, `numero_serie`) VALUES
  (@cliente, 'Laptop', 'Dell', 'Latitude 5420', 'DL5420-0001'),
  (@cliente, 'Impresora', 'HP', 'LaserJet M404', 'HPM404-0002'),
  (@cliente, 'Router', 'TP-Link', 'Archer C6', 'TPC6-0003'),
  (@maria, 'Desktop', 'Lenovo', 'ThinkCentre M70', 'LNM70-0004'),
  (@maria, 'Laptop', 'Asus', 'VivoBook 15', 'ASVB15-0005');

SET @laptop = (SELECT id_equipo FROM equipo WHERE numero_serie = 'DL5420-0001');
SET @impresora = (SELECT id_equipo FROM equipo WHERE numero_serie = 'HPM404-0002');
SET @router = (SELECT id_equipo FROM equipo WHERE numero_serie = 'TPC6-0003');
SET @desktop = (SELECT id_equipo FROM equipo WHERE numero_serie = 'LNM70-0004');
SET @vivobook = (SELECT id_equipo FROM equipo WHERE numero_serie = 'ASVB15-0005');

INSERT INTO `ticket` (`id_usuario`, `id_equipo`, `titulo`, `descripcion`, `prioridad`, `categoria`, `estado`, `fecha_apertura`, `fecha_resolucion`, `fecha_cierre`) VALUES
  (@cliente, @laptop, 'No enciende', 'La laptop no da imagen al encenderla.', 'Alta', 'Hardware', 'Abierto', NOW() - INTERVAL 1 DAY, NULL, NULL),
  (@cliente, @laptop, 'Windows muy lento', 'Tarda varios minutos en iniciar sesion.', 'Media', 'Software', 'En diagnostico', NOW() - INTERVAL 3 DAY, NULL, NULL),
  (@cliente, @impresora, 'Atasco de papel', 'Se atasca en cada impresion a doble cara.', 'Baja', 'Hardware', 'Esperando aprobacion', NOW() - INTERVAL 5 DAY, NULL, NULL),
  (@cliente, @router, 'Sin conexion a internet', 'El router se reinicia solo cada pocos minutos.', 'Alta', 'Red', 'En reparacion', NOW() - INTERVAL 6 DAY, NULL, NULL),
  (@cliente, @laptop, 'Teclado con teclas muertas', 'No responden la A y la S.', 'Media', 'Hardware', 'Resuelto', NOW() - INTERVAL 12 DAY, NOW() - INTERVAL 8 DAY, NULL),
  (@cliente, @impresora, 'Instalar controlador', 'La impresora no aparece en la computadora nueva.', 'Baja', 'Software', 'Cerrado', NOW() - INTERVAL 20 DAY, NOW() - INTERVAL 18 DAY, NOW() - INTERVAL 17 DAY),
  (@cliente, @router, 'Configurar red de invitados', 'Separar la red de visitas de la red interna.', 'Baja', 'Red', 'Abierto', NOW() - INTERVAL 2 HOUR, NULL, NULL),
  (@maria, @desktop, 'Pantalla azul al iniciar', 'Error de sistema al arrancar Windows.', 'Alta', 'Software', 'En diagnostico', NOW() - INTERVAL 2 DAY, NULL, NULL),
  (@maria, @desktop, 'Ventilador ruidoso', 'Hace ruido fuerte despues de un rato encendida.', 'Media', 'Hardware', 'En reparacion', NOW() - INTERVAL 4 DAY, NULL, NULL),
  (@maria, @vivobook, 'Bateria no carga', 'Se queda en 0% conectada al cargador.', 'Alta', 'Hardware', 'Esperando aprobacion', NOW() - INTERVAL 7 DAY, NULL, NULL),
  (@maria, @vivobook, 'Recuperar archivos borrados', 'Se borro una carpeta de documentos por error.', 'Media', 'Otro', 'Resuelto', NOW() - INTERVAL 10 DAY, NOW() - INTERVAL 9 DAY, NULL),
  (@maria, @desktop, 'Revision general', 'Mantenimiento preventivo antes de fin de ano.', 'Baja', 'Otro', 'Cerrado', NOW() - INTERVAL 30 DAY, NOW() - INTERVAL 28 DAY, NOW() - INTERVAL 27 DAY);

-- todos los tickets de ejemplo quedan asignados al tecnico de prueba,
-- asignados por la recepcionista de prueba
INSERT INTO `asignacion` (`id_ticket`, `id_usuario`, `id_asignado_por`)
SELECT t.id_ticket, tec.id_usuario, rec.id_usuario
FROM ticket t
CROSS JOIN usuario tec
CROSS JOIN usuario rec
WHERE tec.correo = 'tecnico.prueba@itdesk.test'
AND rec.correo = 'recepcionista.prueba@itdesk.test';
